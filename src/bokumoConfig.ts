import { BokumoConfig, BokumoConfigBuilder } from "./state";

const BOKUMO_CONFIG = {
  jsonKeys: {
    bgmFileName: "bgm_file_name",
    playbackStartInMs: "playback_start_in_ms",
    recordingStartInMs: "recording_start_in_ms",
    recordingStopInMs: "recording_stop_in_ms",
    playbackStopInMs: "playback_stop_in_ms",
    recordingNames: "recording_names",
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
  const recordingStopInMs = parsed[BOKUMO_CONFIG.jsonKeys.recordingStopInMs];
  const playbackStopInMs = parsed[BOKUMO_CONFIG.jsonKeys.playbackStopInMs];
  const recordingNames = parsed[BOKUMO_CONFIG.jsonKeys.recordingNames];

  try {
    if (
      !(
        typeof bgmFileName === "string" &&
        Number.isInteger(recordingStartInMs) &&
        recordingStartInMs >= 0 &&
        Array.isArray(recordingNames) &&
        recordingNames.every((name) => typeof name === "string")
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
      recordingNames,
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
        recordingNames: builder.recordingNames,
      });
    });
    bgmElement.src = builder.bgmElementUrl;
  });
}
