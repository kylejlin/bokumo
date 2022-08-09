import { clampedLerp } from "../misc";
import { RenderConfig } from "./renderConfig";

export function renderReferenceLines(renderConfig: RenderConfig): void {
  renderReferenceTimeLines(renderConfig);
  renderReferencePitchLines(renderConfig);
}

function renderReferenceTimeLines(renderConfig: RenderConfig): void {
  const { ctx, bokumoConfig } = renderConfig;
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

function renderReferencePitchLines(renderConfig: RenderConfig): void {
  const { ctx, bokumoConfig } = renderConfig;
  const { width: canvasWidth, height: canvasHeight } = ctx.canvas;

  const maxFrequency = Math.min(
    bokumoConfig.spectrogramMaxFrequency,
    renderConfig.audioCtx.sampleRate
  );

  const lineFactors = bokumoConfig.referenceLinesInHz.map(
    (lineInHz) => lineInHz / maxFrequency
  );
  const lineYs = lineFactors.map((lineFactor) =>
    Math.floor(
      clampedLerp({
        start: canvasHeight,
        end: 0,
        factor: lineFactor,
      })
    )
  );

  ctx.fillStyle = "red";
  for (let i = 0; i < lineYs.length; ++i) {
    const lineY = lineYs[i];
    ctx.fillRect(0, lineY, canvasWidth, 1);
  }
}
