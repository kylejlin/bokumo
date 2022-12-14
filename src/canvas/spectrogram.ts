import { BokumoConfig } from "../bokumoConfig";
import { clampedLerp } from "../misc";
import { RenderConfig } from "./renderConfig";

export function getSpectrogramCanvasHeight(
  audioCtx: AudioContext,
  frequencyArray: Uint8Array,
  bokumoConfig: BokumoConfig
): number {
  const numberOfSamples = frequencyArray.length;
  const hertzPerBin = audioCtx.sampleRate / numberOfSamples;
  const maxFrequency = Math.min(
    bokumoConfig.spectrogramMaxFrequency,
    audioCtx.sampleRate
  );
  const requiredBins = Math.ceil(maxFrequency / hertzPerBin);
  return Math.min(requiredBins, numberOfSamples);
}

export function renderSpectrogram(renderConfig: RenderConfig): void {
  const { ctx, frequencyArray, bokumoConfig } = renderConfig;

  const spectrumHeight = getSpectrogramCanvasHeight(
    renderConfig.audioCtx,
    renderConfig.frequencyArray,
    renderConfig.bokumoConfig
  );
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
    renderConfig.previousRenderTimeInMs - renderConfig.playbackStartTimeInMs;
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
    renderConfig.currentTimeInMs - renderConfig.playbackStartTimeInMs;
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
