const BOKUMO_CONFIG = {
  jsonKeys: {
    bgmFileName: "bgm_file_name",
    playbackStartInMs: "playback_start_in_ms",
    recordingStartInMs: "recording_start_in_ms",
    recordingStopInMs: "recording_stop_in_ms",
    playbackStopInMs: "playback_stop_in_ms",
    referenceLinesInMs: "reference_lines_in_ms",
    recordingNames: "recording_names",
    spectrogramMaxFrequency: "spectrogram_max_frequency_in_hz",
  },
  sentinels: {
    recordingStartInMs: "recording_start_in_ms",
    recordingStopInMs: "recording_stop_in_ms",
  },
} as const;

type TimeSentinel =
  typeof BOKUMO_CONFIG["sentinels"][keyof typeof BOKUMO_CONFIG["sentinels"]];

export interface BokumoConfig {
  readonly bgmElement: HTMLAudioElement;
  readonly playbackStartInMs: number;
  readonly recordingStartInMs: number;
  readonly recordingStopInMs: number;
  readonly playbackStopInMs: number;
  readonly referenceLinesInMs: number[];
  readonly recordingNames: readonly string[];
  readonly spectrogramMaxFrequency: number;
}

export interface BokumoConfigBuilder {
  readonly bgmElementUrl: string;
  readonly playbackStartInMs: number;
  readonly recordingStartInMs: number;
  readonly recordingStopInMs: number;
  readonly playbackStopInMs: number;
  readonly referenceLinesInMs: number[];
  readonly recordingNames: readonly string[];
  readonly spectrogramMaxFrequency: undefined | number;
}

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
  const recordingStopInMs = parsed[BOKUMO_CONFIG.jsonKeys.recordingStopInMs];
  const playbackStopInMs = parsed[BOKUMO_CONFIG.jsonKeys.playbackStopInMs];
  const referenceLinesInMs: (TimeSentinel | number)[] =
    parsed[BOKUMO_CONFIG.jsonKeys.referenceLinesInMs];
  const recordingNames = parsed[BOKUMO_CONFIG.jsonKeys.recordingNames];
  const spectrogramMaxFrequency =
    parsed[BOKUMO_CONFIG.jsonKeys.spectrogramMaxFrequency];

  try {
    if (
      !(
        typeof bgmFileName === "string" &&
        Number.isInteger(playbackStartInMs) &&
        playbackStartInMs >= 0 &&
        Number.isInteger(recordingStartInMs) &&
        recordingStartInMs >= playbackStartInMs &&
        Number.isInteger(recordingStopInMs) &&
        recordingStopInMs >= recordingStartInMs &&
        Number.isInteger(playbackStopInMs) &&
        playbackStopInMs >= playbackStartInMs &&
        Array.isArray(referenceLinesInMs) &&
        referenceLinesInMs.every((n) => {
          const isValidNumber =
            Number.isInteger(n) &&
            playbackStartInMs <= n &&
            n <= playbackStopInMs;
          const isValidSentinel =
            n === BOKUMO_CONFIG.sentinels.recordingStartInMs ||
            n === BOKUMO_CONFIG.sentinels.recordingStopInMs;
          return isValidNumber || isValidSentinel;
        }) &&
        Array.isArray(recordingNames) &&
        recordingNames.every((name) => typeof name === "string") &&
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
      recordingStopInMs,
      playbackStopInMs,
      referenceLinesInMs: referenceLinesInMs.map((n) => {
        switch (n) {
          case BOKUMO_CONFIG.sentinels.recordingStartInMs:
            return recordingStartInMs;
          case BOKUMO_CONFIG.sentinels.recordingStopInMs:
            return recordingStopInMs;
          default:
            return n;
        }
      }),
      recordingNames,
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
        recordingStopInMs: builder.recordingStopInMs,
        playbackStopInMs: builder.playbackStopInMs,
        referenceLinesInMs: builder.referenceLinesInMs,
        recordingNames: builder.recordingNames,
        spectrogramMaxFrequency: builder.spectrogramMaxFrequency ?? Infinity,
      });
    });
    bgmElement.src = builder.bgmElementUrl;
  });
}
