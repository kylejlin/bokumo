import React from "react";
import "./App.css";

const FFT_SIZE = 2048;

export class App extends React.Component<AppProps, AppState> {
  private spectrogramRef: React.RefObject<HTMLCanvasElement>;

  private audioCtx: AudioContext;
  private audioAnalyser: AnalyserNode;
  private frequencyArray: Uint8Array;
  private spectrumsRendered: number;

  constructor(props: AppProps) {
    super(props);

    this.spectrogramRef = React.createRef();

    const audioCtx = new AudioContext();
    this.audioCtx = audioCtx;

    const audioAnalyser = audioCtx.createAnalyser();
    audioAnalyser.fftSize = FFT_SIZE;
    this.audioAnalyser = audioAnalyser;
    const sourceNode = audioCtx.createMediaStreamSource(this.props.stream);
    sourceNode.connect(audioAnalyser);
    audioAnalyser.connect(audioCtx.destination);

    const frequencyArray = new Uint8Array(audioAnalyser.frequencyBinCount);
    this.frequencyArray = frequencyArray;

    this.spectrumsRendered = 0;

    this.updateSpectrogram = this.updateSpectrogram.bind(this);
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

    requestAnimationFrame(this.updateSpectrogram);
  }

  render(): React.ReactElement {
    return (
      <div className="App">
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

    const { audioAnalyser, frequencyArray } = this;
    audioAnalyser.getByteFrequencyData(frequencyArray);

    renderSpectrogram(ctx, frequencyArray, this.spectrumsRendered);
    ++this.spectrumsRendered;

    requestAnimationFrame(this.updateSpectrogram);
  }
}

export interface AppProps {
  stream: MediaStream;
}

export interface AppState {}

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
