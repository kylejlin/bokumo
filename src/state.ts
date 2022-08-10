import { AppProps } from "./App";
import { BokumoConfigBuilder } from "./bokumoConfig";

export type AllAudioMimeTypes = [
  "audio/webm",
  "audio/ogg",
  "audio/mp3",
  "audio/x-matroska"
];
export type AudioMimeType = AllAudioMimeTypes[number];

export type WrapperState =
  | PrelaunchState
  | LaunchPendingState
  | LaunchSucceededState
  | LaunchFailedState;

export enum WrapperStateKind {
  Prelaunch,
  LaunchPending,
  LaunchSucceeded,
  LaunchFailed,
}
export interface PrelaunchState {
  readonly kind: WrapperStateKind.Prelaunch;
  readonly fileInfo: readonly FileInfo[];
}

export interface FileInfo {
  readonly id: number;
  readonly file: File;
  readonly configBuilder: undefined | BokumoConfigBuilder;
}

export interface LaunchPendingState {
  readonly kind: WrapperStateKind.LaunchPending;
}

export interface LaunchSucceededState {
  readonly kind: WrapperStateKind.LaunchSucceeded;
  readonly appProps: Omit<AppProps, "mimeType">;
}

export interface LaunchFailedState {
  readonly kind: WrapperStateKind.LaunchFailed;
}

export interface AppState {
  /**
   * Between zero and one, inclusive.
   *
   * We shouldn't theoretically need to store this in React state,
   * since we could just update the audio element's volume
   * directly.
   *
   * However, if we did that, then the volume input's value would
   * have to be computed using the audio element's volume
   * (rather than from React state), which could potentially lead to
   * React bugs.
   * */
  readonly volume: number;
  readonly isRecording: boolean;
  readonly recordingIndex: number;
}
