import React from "react";
import { AppState, AudioMimeType } from "./state";
import toWav from "audiobuffer-to-wav";
import { getBase64FromArrayBuffer } from "./lib/base64FromArrayBuffer";
import {
  getSpectrogramCanvasHeight,
  renderSpectrogram,
} from "./canvas/spectrogram";
import { BokumoConfig } from "./bokumoConfig";
import { renderReferenceLines } from "./canvas/referenceLines";
import { RenderConfig } from "./canvas/renderConfig";
import { Header } from "./Header";

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
  private recordingStartTimeInMs: number;
  private playbackStartTimeInMs: number;
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
    this.volumeSliderOnChange = this.volumeSliderOnChange.bind(this);
    this.startRecording = this.startRecording.bind(this);
    this.recorderOnStart = this.recorderOnStart.bind(this);
    this.stopRecording = this.stopRecording.bind(this);
    this.recorderOnStop = this.recorderOnStop.bind(this);

    this.state = {
      volume: this.props.config.bgmElement.volume,
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

    this.recordingStartTimeInMs = -1;
    this.playbackStartTimeInMs = -1;
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

  override componentDidMount(): void {
    this.resizeCanvas();
    this.renderSpectrogramBackground();
  }

  override componentDidUpdate(): void {
    this.resizeCanvas();
  }

  override render(): React.ReactElement {
    const { recordingNames } = this.props.config;
    const { recordingIndex } = this.state;
    const isPaused = !this.state.isRecording;
    return (
      <div className="App">
        <Header />

        <p>
          Current recording:{" "}
          <span className="FileName">{recordingNames[recordingIndex]}.wav</span>{" "}
          ({recordingIndex + 1}/{recordingNames.length})
        </p>

        <div className="BgmVolumeInputContainer">
          <label>Background music volume: </label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={this.state.volume}
            onChange={this.volumeSliderOnChange}
          />
        </div>

        <button
          className="App__Button--previous Button--secondary"
          disabled={!(0 < recordingIndex && isPaused)}
          onClick={this.previousRecordingButtonOnClick}
        >
          Previous
        </button>
        <button
          className="App__Button--record Button--primary"
          disabled={!isPaused}
          onClick={this.recordButtonOnClick}
        >
          Record
        </button>
        <button
          className="App__Button--next Button--secondary"
          disabled={!(recordingIndex < recordingNames.length - 1 && isPaused)}
          onClick={this.nextRecordingButtonOnClick}
        >
          Next
        </button>

        <p className="SpectrogramLabel">Spectrogram</p>
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

  resizeCanvas(): void {
    const canvas = this.spectrogramRef.current;
    if (canvas === null) {
      return;
    }

    canvas.style.position = "static";

    const rect = canvas.getBoundingClientRect();
    const availableHeight = window.innerHeight - rect.top;
    canvas.style.height = availableHeight + "px";

    canvas.style.position = "absolute";
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

    const {
      analyser: audioAnalyser,
      frequencyArray,
      playbackStartTimeInMs,
    } = this;
    audioAnalyser.getByteFrequencyData(frequencyArray);

    const currentTimeInMs = this.audioCtx.currentTime * 1e3;
    const renderConfig: RenderConfig = {
      ctx,
      audioCtx: this.audioCtx,
      frequencyArray,
      bokumoConfig: this.props.config,
      currentTimeInMs,
      playbackStartTimeInMs,
      previousRenderTimeInMs: this.previousRenderTimeInMs,
    };
    renderSpectrogram(renderConfig);
    renderReferenceLines(renderConfig);

    this.previousRenderTimeInMs = currentTimeInMs;

    const elapsedTime = currentTimeInMs - playbackStartTimeInMs;
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

  volumeSliderOnChange(change: React.ChangeEvent<HTMLInputElement>): void {
    const unclamped = Number(change.target.value);
    if (!Number.isFinite(unclamped)) {
      return;
    }

    const clampedVolume = Math.max(0, Math.min(unclamped, 1));
    this.props.config.bgmElement.volume = clampedVolume;
    this.setState({ volume: clampedVolume });
  }

  startRecording(): void {
    this.audioChunks = [];
    this.recorder.start();
  }

  recorderOnStart(): void {
    this.recordingStartTimeInMs = this.audioCtx.currentTime * 1e3;

    const { bgmElement } = this.props.config;
    bgmElement.currentTime = this.props.config.playbackStartInMs * 1e-3;
    bgmElement.volume = this.state.volume;
    const playPromise = bgmElement.play() ?? Promise.resolve();

    playPromise.then(() => {
      const playbackStartTimeInMs = this.audioCtx.currentTime * 1e3;
      this.playbackStartTimeInMs = playbackStartTimeInMs;
      this.previousRenderTimeInMs = playbackStartTimeInMs;

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
      this.props.config.recordingNames[this.state.recordingIndex] + ".wav",
      this.playbackStartTimeInMs - this.recordingStartTimeInMs
    );

    this.setState({ isRecording: false });
  }
}

function downloadAudioBlobAsWav(
  bokumoConfig: BokumoConfig,
  audioCtx: AudioContext,
  audioBlob: Blob,
  outputFileName: string,
  recordingDelayInMs: number
): void {
  const fr = new FileReader();
  fr.addEventListener("load", () => {
    const rawBuffer = fr.result as ArrayBuffer;
    audioCtx.decodeAudioData(rawBuffer, (entireAudioBuffer) => {
      const slicedAudioBuffer = sliceAudioBuffer(audioCtx, entireAudioBuffer, {
        startInMs:
          bokumoConfig.recordingStartInMs -
          bokumoConfig.playbackStartInMs +
          recordingDelayInMs,
        endInMs:
          bokumoConfig.recordingStopInMs -
          bokumoConfig.playbackStartInMs +
          recordingDelayInMs,
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
