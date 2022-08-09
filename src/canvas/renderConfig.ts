import { BokumoConfig } from "../bokumoConfig";

export interface RenderConfig {
  ctx: CanvasRenderingContext2D;
  audioCtx: AudioContext;
  frequencyArray: Uint8Array;
  bokumoConfig: BokumoConfig;
  currentTimeInMs: number;
  playbackStartTimeInMs: number;
  previousRenderTimeInMs: number;
}
