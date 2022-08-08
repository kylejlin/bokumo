import React from "react";
import "./App.css";
import { AppState, AudioMimeType, BokumoConfig } from "./state";
import toWav from "audiobuffer-to-wav";
import { getBase64FromArrayBuffer } from "./lib/base64FromArrayBuffer";

const FFT_SIZE = 2048;

function getFrequencyBinCount(): number {
  return FFT_SIZE / 2;
}

export interface AppProps {
  mimeType: AudioMimeType;
  stream: MediaStream;
  config: BokumoConfig;
}

export class App extends React.Component<AppProps, AppState> {
  private spectrogramRef: React.RefObject<HTMLCanvasElement>;

  private audioCtx: AudioContext;
  private analyser: AnalyserNode;
  private frequencyArray: Uint8Array;
  private startTimeInDateDotNow: number;
  private previousRenderTimeInDateDotNow: number;
  private recorder: MediaRecorder;
  private audioChunks: Blob[];

  constructor(props: AppProps) {
    super(props);

    this.updateSpectrogram = this.updateSpectrogram.bind(this);
    this.recordButtonOnClick = this.recordButtonOnClick.bind(this);
    this.stopRecording = this.stopRecording.bind(this);
    this.recorderOnStop = this.recorderOnStop.bind(this);
    this.startRecording = this.startRecording.bind(this);

    this.state = {
      isRecording: false,
    };

    this.spectrogramRef = React.createRef();

    const audioCtx = new AudioContext();
    this.audioCtx = audioCtx;

    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = FFT_SIZE;
    this.analyser = analyser;
    const sourceNode = audioCtx.createMediaStreamSource(this.props.stream);
    sourceNode.connect(analyser);

    const frequencyArray = new Uint8Array(analyser.frequencyBinCount);
    this.frequencyArray = frequencyArray;

    this.startTimeInDateDotNow = -1;
    this.previousRenderTimeInDateDotNow = -1;

    const recorder = new MediaRecorder(this.props.stream, {
      mimeType: this.props.mimeType,
    });
    this.recorder = recorder;
    recorder.addEventListener("dataavailable", (event) => {
      this.audioChunks.push(event.data);
    });
    recorder.addEventListener("stop", this.recorderOnStop);

    this.audioChunks = [];
  }

  componentDidMount(): void {
    const canvas = this.spectrogramRef.current;
    if (canvas === null) {
      return;
    }
    const ctx = canvas.getContext("2d")!;
    const { width: canvasWidth, height: canvasHeight } = ctx.canvas;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  }

  render(): React.ReactElement {
    return (
      <div className="App">
        <button
          disabled={this.state.isRecording}
          onClick={this.recordButtonOnClick}
        >
          Record
        </button>
        <canvas
          className="Spectrogram"
          ref={this.spectrogramRef}
          width={window.innerWidth}
          height={getFrequencyBinCount()}
        />
      </div>
    );
  }

  updateSpectrogram(): void {
    const canvas = this.spectrogramRef.current;
    if (canvas === null) {
      return;
    }
    const ctx = canvas.getContext("2d")!;

    const {
      analyser: audioAnalyser,
      frequencyArray,
      startTimeInDateDotNow,
    } = this;
    audioAnalyser.getByteFrequencyData(frequencyArray);

    const now = Date.now();
    const renderConfig: RenderConfig = {
      ctx,
      frequencyArray,
      bokumoConfig: this.props.config,
      dateDotNow: now,
      startTimeInDateDotNow,
      previousRenderTimeInDateDotNow: this.previousRenderTimeInDateDotNow,
    };
    renderSpectrogram(renderConfig);

    this.previousRenderTimeInDateDotNow = now;

    const elapsedTime = now - startTimeInDateDotNow;
    const playbackDurationInMs =
      this.props.config.playbackStopInMs - this.props.config.playbackStartInMs;
    if (elapsedTime <= playbackDurationInMs) {
      requestAnimationFrame(this.updateSpectrogram);
    }
  }

  recordButtonOnClick(): void {
    this.setState({ isRecording: true }, this.startRecording);
  }

  startRecording(): void {
    this.startTimeInDateDotNow = Date.now();
    this.previousRenderTimeInDateDotNow = this.startTimeInDateDotNow;
    this.audioChunks = [];

    this.recorder.start();

    const { bgmElement } = this.props.config;
    bgmElement.currentTime = this.props.config.playbackStartInMs * 1e-3;
    bgmElement.play();

    setTimeout(this.stopRecording, this.props.config.playbackStopInMs);
    requestAnimationFrame(this.updateSpectrogram);
  }

  stopRecording(): void {
    this.recorder.stop();
  }

  recorderOnStop(): void {
    const audioBlob = new Blob(this.audioChunks, {
      type: this.props.mimeType,
    });

    this.downloadAudioBlob(audioBlob);

    this.setState({ isRecording: false });
  }

  downloadAudioBlob(audioBlob: Blob) {
    switch (this.props.config.outputExtension) {
      case "wav":
        downloadAudioBlobAsWav(this.audioCtx, audioBlob);
        break;
      case "browser_default":
        this.downloadAudioBlobUsingPropMimeType(audioBlob);
        break;
      default: {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const _compilerEnforcedSanityCheck: never =
          this.props.config.outputExtension;
      }
    }
  }

  downloadAudioBlobUsingPropMimeType(audioBlob: Blob) {
    const fr = new FileReader();
    fr.addEventListener("load", () => {
      const audioDataUrl = fr.result as string;
      const a = document.createElement("a");
      a.href = audioDataUrl;
      a.download = "audio." + this.audioMimeTypeToFileExtension();
      a.click();
    });
    fr.readAsDataURL(audioBlob);
  }

  audioMimeTypeToFileExtension(): string {
    switch (this.props.mimeType) {
      case "audio/webm":
        return "webm";
      case "audio/ogg":
        return "ogg";
      case "audio/x-matroska":
        return "mkv";
      case "audio/mp3":
        return "mp3";
    }
  }
}

interface RenderConfig {
  ctx: CanvasRenderingContext2D;
  frequencyArray: Uint8Array;
  bokumoConfig: BokumoConfig;
  dateDotNow: number;
  startTimeInDateDotNow: number;
  previousRenderTimeInDateDotNow: number;
}

function renderSpectrogram(renderConfig: RenderConfig): void {
  const { ctx, frequencyArray, bokumoConfig } = renderConfig;

  const spectrumHeight = getFrequencyBinCount();
  const imgDataData = new Uint8ClampedArray(spectrumHeight * 4);
  for (let srcIndex = 0; srcIndex < spectrumHeight; ++srcIndex) {
    const amplitude = frequencyArray[srcIndex];
    const destRedIndex = (spectrumHeight - srcIndex - 1) * 4;
    imgDataData[destRedIndex] = amplitude;
    imgDataData[destRedIndex + 1] = amplitude;
    imgDataData[destRedIndex + 2] = amplitude;
    imgDataData[destRedIndex + 3] = 255;
  }
  const imgData = new ImageData(imgDataData, 1, spectrumHeight);

  const elapsedMsBetweenPreviousRenderAndRecordingStart =
    renderConfig.previousRenderTimeInDateDotNow -
    renderConfig.startTimeInDateDotNow;
  const playbackDurationMs =
    bokumoConfig.playbackStopInMs - bokumoConfig.playbackStartInMs;
  const spectrumLeft = Math.floor(
    clampedLerp({
      start: 0,
      end: ctx.canvas.width,
      factor:
        elapsedMsBetweenPreviousRenderAndRecordingStart / playbackDurationMs,
    })
  );

  const elapsedMsBetweenNowAndRecordingStart =
    renderConfig.dateDotNow - renderConfig.startTimeInDateDotNow;
  const spectrumRight = Math.floor(
    clampedLerp({
      start: 0,
      end: ctx.canvas.width,
      factor: elapsedMsBetweenNowAndRecordingStart / playbackDurationMs,
    })
  );

  for (let x = spectrumLeft; x < spectrumRight; ++x) {
    ctx.putImageData(imgData, x, 0);
  }
}

function downloadAudioBlobAsWav(audioCtx: AudioContext, audioBlob: Blob): void {
  const fr = new FileReader();
  fr.addEventListener("load", () => {
    const rawBuffer = fr.result as ArrayBuffer;
    audioCtx.decodeAudioData(rawBuffer, (audioBuffer) => {
      const wavBuffer = toWav(audioBuffer);
      const outputFileName = "audio.wav";
      downloadArrayBuffer(wavBuffer, outputFileName);
    });
  });
  fr.readAsArrayBuffer(audioBlob);
}

function downloadArrayBuffer(
  wavBuffer: ArrayBuffer,
  outputFileName: string
): void {
  const a = document.createElement("a");
  a.href = "data:audio/wav;base64," + getBase64FromArrayBuffer(wavBuffer);
  a.download = outputFileName;
  a.click();
}

function clampedLerp({
  start,
  end,
  factor,
}: {
  start: number;
  end: number;
  factor: number;
}): number {
  const clampedFactor = Math.max(0, Math.min(factor, 1));
  return start + (end - start) * clampedFactor;
}
