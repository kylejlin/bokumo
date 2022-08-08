import React from "react";
import "./App.css";
import { AppState, AudioMimeType } from "./state";
import toWav from "audiobuffer-to-wav";
import { getBase64FromArrayBuffer } from "./lib/base64FromArrayBuffer";
import {
  getSpectrogramCanvasHeight,
  RenderConfig,
  renderSpectrogram,
} from "./spectrogram";
import { BokumoConfig } from "./bokumoConfig";
import { clampedLerp } from "./misc";

const FFT_SIZE = 2048;

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
  private startTimeInMs: number;
  private previousRenderTimeInMs: number;
  private recorder: MediaRecorder;
  private audioChunks: Blob[];

  constructor(props: AppProps) {
    super(props);

    this.updateSpectrogram = this.updateSpectrogram.bind(this);
    this.recordButtonOnClick = this.recordButtonOnClick.bind(this);
    this.previousRecordingButtonOnClick =
      this.previousRecordingButtonOnClick.bind(this);
    this.nextRecordingButtonOnClick =
      this.nextRecordingButtonOnClick.bind(this);
    this.startRecording = this.startRecording.bind(this);
    this.recorderOnStart = this.recorderOnStart.bind(this);
    this.stopRecording = this.stopRecording.bind(this);
    this.recorderOnStop = this.recorderOnStop.bind(this);

    this.state = {
      isRecording: false,
      recordingIndex: 0,
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

    this.startTimeInMs = -1;
    this.previousRenderTimeInMs = -1;

    const recorder = new MediaRecorder(this.props.stream, {
      mimeType: this.props.mimeType,
    });
    this.recorder = recorder;
    recorder.addEventListener("dataavailable", (event) => {
      this.audioChunks.push(event.data);
    });
    recorder.addEventListener("start", this.recorderOnStart);
    recorder.addEventListener("stop", this.recorderOnStop);

    this.audioChunks = [];
  }

  componentDidMount(): void {
    this.renderSpectrogramBackground();
  }

  render(): React.ReactElement {
    const { recordingNames } = this.props.config;
    const { recordingIndex } = this.state;
    const isPaused = !this.state.isRecording;
    return (
      <div className="App">
        <div>Recording: {recordingNames[recordingIndex]}.wav</div>
        <button
          disabled={!(0 < recordingIndex && isPaused)}
          onClick={this.previousRecordingButtonOnClick}
        >
          Previous
        </button>
        <button disabled={!isPaused} onClick={this.recordButtonOnClick}>
          Record
        </button>
        <button
          disabled={!(recordingIndex < recordingNames.length - 1 && isPaused)}
          onClick={this.nextRecordingButtonOnClick}
        >
          Next
        </button>
        <canvas
          className="Spectrogram"
          ref={this.spectrogramRef}
          width={window.innerWidth}
          height={getSpectrogramCanvasHeight(
            this.audioCtx,
            this.frequencyArray,
            this.props.config
          )}
        />
      </div>
    );
  }

  renderSpectrogramBackground(): void {
    const canvas = this.spectrogramRef.current;
    if (canvas === null) {
      return;
    }
    const ctx = canvas.getContext("2d")!;
    const { width: canvasWidth, height: canvasHeight } = ctx.canvas;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  }

  updateSpectrogram(): void {
    const canvas = this.spectrogramRef.current;
    if (canvas === null) {
      return;
    }
    const ctx = canvas.getContext("2d")!;

    const { analyser: audioAnalyser, frequencyArray, startTimeInMs } = this;
    audioAnalyser.getByteFrequencyData(frequencyArray);

    const now = this.audioCtx.currentTime * 1e3;
    const renderConfig: RenderConfig = {
      ctx,
      audioCtx: this.audioCtx,
      frequencyArray,
      bokumoConfig: this.props.config,
      currentTimeInMs: now,
      startTimeInMs,
      previousRenderTimeInMs: this.previousRenderTimeInMs,
    };
    renderSpectrogram(renderConfig);
    renderReferenceLines(ctx, this.props.config);

    this.previousRenderTimeInMs = now;

    const elapsedTime = now - startTimeInMs;
    const playbackDurationInMs =
      this.props.config.playbackStopInMs - this.props.config.playbackStartInMs;
    if (elapsedTime <= playbackDurationInMs) {
      requestAnimationFrame(this.updateSpectrogram);
    }
  }

  recordButtonOnClick(): void {
    this.setState({ isRecording: true }, this.startRecording);
  }

  previousRecordingButtonOnClick(): void {
    this.setState({
      recordingIndex: Math.max(0, this.state.recordingIndex - 1),
    });
  }

  nextRecordingButtonOnClick(): void {
    this.setState({
      recordingIndex: Math.min(
        this.props.config.recordingNames.length - 1,
        this.state.recordingIndex + 1
      ),
    });
  }

  startRecording(): void {
    this.audioChunks = [];
    this.recorder.start();
  }

  recorderOnStart(): void {
    const { bgmElement } = this.props.config;
    bgmElement.currentTime = this.props.config.playbackStartInMs * 1e-3;
    const playPromise = bgmElement.play() ?? Promise.resolve();
    playPromise.then(() => {
      this.startTimeInMs = this.audioCtx.currentTime * 1e3;
      this.previousRenderTimeInMs = this.startTimeInMs;

      setTimeout(
        this.stopRecording,
        this.props.config.playbackStopInMs - this.props.config.playbackStartInMs
      );

      this.renderSpectrogramBackground();
      requestAnimationFrame(this.updateSpectrogram);
    });
  }

  stopRecording(): void {
    this.recorder.stop();
  }

  recorderOnStop(): void {
    const audioBlob = new Blob(this.audioChunks, {
      type: this.props.mimeType,
    });

    downloadAudioBlobAsWav(
      this.props.config,
      this.audioCtx,
      audioBlob,
      this.props.config.recordingNames[this.state.recordingIndex] + ".wav"
    );

    this.setState({ isRecording: false });
  }
}

function downloadAudioBlobAsWav(
  bokumoConfig: BokumoConfig,
  audioCtx: AudioContext,
  audioBlob: Blob,
  outputFileName: string
): void {
  const fr = new FileReader();
  fr.addEventListener("load", () => {
    const rawBuffer = fr.result as ArrayBuffer;
    audioCtx.decodeAudioData(rawBuffer, (entireAudioBuffer) => {
      const slicedAudioBuffer = sliceAudioBuffer(audioCtx, entireAudioBuffer, {
        startInMs:
          bokumoConfig.recordingStartInMs - bokumoConfig.playbackStartInMs,
        endInMs:
          bokumoConfig.recordingStopInMs - bokumoConfig.playbackStartInMs,
      });
      const wavBuffer = toWav(slicedAudioBuffer);
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

function renderReferenceLines(
  ctx: CanvasRenderingContext2D,
  bokumoConfig: BokumoConfig
): void {
  const { width: canvasWidth, height: canvasHeight } = ctx.canvas;

  const playbackDurationInMs =
    bokumoConfig.playbackStopInMs - bokumoConfig.playbackStartInMs;

  const lineFactors = bokumoConfig.referenceLinesInMs.map(
    (lineInMs) =>
      (lineInMs - bokumoConfig.playbackStartInMs) / playbackDurationInMs
  );
  const lineXs = lineFactors.map((lineFactor) =>
    Math.floor(
      clampedLerp({
        start: 0,
        end: canvasWidth,
        factor: lineFactor,
      })
    )
  );

  ctx.fillStyle = "red";
  for (let i = 0; i < lineXs.length; ++i) {
    const lineX = lineXs[i];
    ctx.fillRect(lineX, 0, 1, canvasHeight);
  }
}

function sliceAudioBuffer(
  audioCtx: AudioContext,
  entireBuffer: AudioBuffer,
  { startInMs, endInMs }: { startInMs: number; endInMs: number }
): AudioBuffer {
  const startFrame = Math.floor(startInMs * audioCtx.sampleRate * 1e-3);
  const endFrame = Math.min(
    Math.floor(endInMs * audioCtx.sampleRate * 1e-3),
    entireBuffer.length
  );
  const sliceLength = endFrame - startFrame;
  const slice = audioCtx.createBuffer(
    entireBuffer.numberOfChannels,
    sliceLength,
    entireBuffer.sampleRate
  );

  for (let frameIndex = startFrame; frameIndex < endFrame; ++frameIndex) {
    for (
      let channelIndex = 0;
      channelIndex < entireBuffer.numberOfChannels;
      ++channelIndex
    ) {
      const srcChannel = entireBuffer.getChannelData(channelIndex);
      const destChannel = slice.getChannelData(channelIndex);
      destChannel[frameIndex - startFrame] = srcChannel[frameIndex];
    }
  }

  return slice;
}
