export interface BokumoConfig {
  readonly bgmElement: HTMLAudioElement;
  readonly playbackStartInMs: number;
  readonly recordingStartInMs: number;
  readonly mainSegmentStartInMs: number;
  readonly recordingStopInMs: number;
  readonly playbackStopInMs: number;
  readonly recordingNames: readonly string[];
  readonly outputExtension: "wav" | "browser_default";
  readonly spectrogramMaxFrequency: number;
}

export interface BokumoConfigBuilder {
  readonly bgmElementUrl: string;
  readonly playbackStartInMs: number;
  readonly recordingStartInMs: number;
  readonly mainSegmentStartInMs: number;
  readonly recordingStopInMs: number;
  readonly playbackStopInMs: number;
  readonly recordingNames: readonly string[];
  readonly outputExtension: "wav" | "browser_default";
  readonly spectrogramMaxFrequency: undefined | number;
}

const BOKUMO_CONFIG = {
  jsonKeys: {
    bgmFileName: "bgm_file_name",
    playbackStartInMs: "playback_start_in_ms",
    recordingStartInMs: "recording_start_in_ms",
    mainSegmentStartInMs: "main_segment_start_in_ms",
    recordingStopInMs: "recording_stop_in_ms",
    playbackStopInMs: "playback_stop_in_ms",
    recordingNames: "recording_names",
    outputExtension: "output_extension",
    spectrogramMaxFrequency: "spectrogram_max_frequency_in_hz",
  },
} as const;

export function isFileBokumoConfig(fileName: string): boolean {
  return fileName.toLowerCase() === "bokumo.json";
}

export function parseBokumoConfig(
  configSource: string,
  nonBokumoDotJsonFiles: File[]
):
  | { error: undefined; configBuilder: BokumoConfigBuilder }
  | { error: "invalid_json_syntax" }
  | { error: "invalid_json_shape" }
  | { error: "bgm_not_found" }
  | { error: "more_than_one_bgm_found" } {
  let parsed;
  try {
    parsed = JSON.parse(configSource);
    if (!(typeof parsed === "object" && parsed !== null)) {
      return { error: "invalid_json_shape" };
    }
  } catch {
    return { error: "invalid_json_syntax" };
  }

  const bgmFileName = parsed[BOKUMO_CONFIG.jsonKeys.bgmFileName];
  const playbackStartInMs = parsed[BOKUMO_CONFIG.jsonKeys.playbackStartInMs];
  const recordingStartInMs = parsed[BOKUMO_CONFIG.jsonKeys.recordingStartInMs];
  const mainSegmentStartInMs =
    parsed[BOKUMO_CONFIG.jsonKeys.mainSegmentStartInMs];
  const recordingStopInMs = parsed[BOKUMO_CONFIG.jsonKeys.recordingStopInMs];
  const playbackStopInMs = parsed[BOKUMO_CONFIG.jsonKeys.playbackStopInMs];
  const recordingNames = parsed[BOKUMO_CONFIG.jsonKeys.recordingNames];
  const outputExtension: string =
    parsed[BOKUMO_CONFIG.jsonKeys.outputExtension];
  const spectrogramMaxFrequency =
    parsed[BOKUMO_CONFIG.jsonKeys.spectrogramMaxFrequency];

  try {
    if (
      !(
        typeof bgmFileName === "string" &&
        Number.isInteger(recordingStartInMs) &&
        recordingStartInMs >= 0 &&
        Array.isArray(recordingNames) &&
        recordingNames.every((name) => typeof name === "string") &&
        (outputExtension === "wav" || outputExtension === "browser_default") &&
        (spectrogramMaxFrequency === undefined ||
          (Number.isInteger(spectrogramMaxFrequency) &&
            spectrogramMaxFrequency > 0))
      )
    ) {
      return { error: "invalid_json_shape" };
    }
  } catch {
    return { error: "invalid_json_shape" };
  }

  const bgmFileCandidates = nonBokumoDotJsonFiles.filter(
    (f) => f.name === bgmFileName
  );
  if (bgmFileCandidates.length === 0) {
    return { error: "bgm_not_found" };
  }
  if (bgmFileCandidates.length > 1) {
    return { error: "more_than_one_bgm_found" };
  }
  return {
    error: undefined,
    configBuilder: {
      bgmElementUrl: URL.createObjectURL(bgmFileCandidates[0]),
      playbackStartInMs,
      recordingStartInMs,
      mainSegmentStartInMs,
      recordingStopInMs,
      playbackStopInMs,
      recordingNames,
      outputExtension,
      spectrogramMaxFrequency,
    },
  };
}

export function buildConfig(
  builder: BokumoConfigBuilder
): Promise<BokumoConfig> {
  return new Promise((resolve) => {
    const bgmElement = document.createElement("audio");
    bgmElement.addEventListener("loadeddata", () => {
      resolve({
        bgmElement,
        playbackStartInMs: builder.playbackStartInMs,
        recordingStartInMs: builder.recordingStartInMs,
        mainSegmentStartInMs: builder.mainSegmentStartInMs,
        recordingStopInMs: builder.recordingStopInMs,
        playbackStopInMs: builder.playbackStopInMs,
        recordingNames: builder.recordingNames,
        outputExtension: builder.outputExtension,
        spectrogramMaxFrequency: builder.spectrogramMaxFrequency ?? Infinity,
      });
    });
    bgmElement.src = builder.bgmElementUrl;
  });
}
