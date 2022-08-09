import { AppProps } from "./App";
import { BokumoConfig, BokumoConfigBuilder } from "./bokumoConfig";

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
  readonly config: undefined | BokumoConfig;
  readonly nonBokumoDotJsonFiles: File[];
  readonly bokumoDotJsonBuilderWithMissingBgmFile:
    | undefined
    | BokumoConfigBuilder;
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
  readonly isRecording: boolean;
  readonly recordingIndex: number;
}
