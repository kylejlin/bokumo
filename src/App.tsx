import React from "react";
import "./App.css";
import { AppState, AudioMimeType, BokumoConfig } from "./state";

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
  private spectrumsRendered: number;
  private recorder: MediaRecorder;
  private audioChunks: Blob[];

  constructor(props: AppProps) {
    super(props);

    this.updateSpectrogram = this.updateSpectrogram.bind(this);
    this.recordButtonOnClick = this.recordButtonOnClick.bind(this);
    this.stopRecording = this.stopRecording.bind(this);
    this.recorderOnStop = this.recorderOnStop.bind(this);

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

    this.spectrumsRendered = 0;

    const recorder = new MediaRecorder(this.props.stream, {
      mimeType: this.props.mimeType,
    });
    this.recorder = recorder;
    recorder.addEventListener("dataavailable", (event) => {
      console.log("dataavailable", event);
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
          height={512}
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

    const { analyser: audioAnalyser, frequencyArray } = this;
    audioAnalyser.getByteFrequencyData(frequencyArray);

    renderSpectrogram(ctx, frequencyArray, this.spectrumsRendered);
    ++this.spectrumsRendered;

    requestAnimationFrame(this.updateSpectrogram);
  }

  recordButtonOnClick(): void {
    this.spectrumsRendered = 0;
    this.audioChunks = [];
    this.setState({ isRecording: true }, () => {
      this.recorder.start();
      setTimeout(this.stopRecording, this.props.config.playbackStopInMs);
      requestAnimationFrame(this.updateSpectrogram);
    });
  }

  stopRecording(): void {
    this.recorder.stop();
  }

  recorderOnStop(): void {
    console.log({ chunks: this.audioChunks });
    const audioBlob = new Blob(this.audioChunks, {
      type: this.props.mimeType,
    });

    const fr = new FileReader();
    fr.addEventListener("load", () => {
      const audioDataUrl = fr.result as string;
      console.log({ audioDataUrl });
      const a = document.createElement("a");
      a.href = audioDataUrl;
      a.download = "audio." + audioMimeTypeToFileExtension(this.props.mimeType);
      a.click();
    });
    fr.readAsDataURL(audioBlob);
    this.setState({ isRecording: false });
  }
}

function renderSpectrogram(
  ctx: CanvasRenderingContext2D,
  frequencyArray: Uint8Array,
  x: number
): void {
  const spectrumHeight = Math.floor(frequencyArray.length / 4);
  const imgDataData = new Uint8ClampedArray(
    frequencyArray.subarray(0, 4 * Math.floor(frequencyArray.length / 4)).buffer
  );
  const imgData = new ImageData(imgDataData, 1, spectrumHeight);
  ctx.putImageData(imgData, x, 0);
}

function audioMimeTypeToFileExtension(mimeType: AudioMimeType): string {
  switch (mimeType) {
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
