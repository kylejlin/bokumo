import { AppProps } from "./App";

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
}

export interface BokumoConfig {
  readonly bgmElement: HTMLAudioElement;
  readonly playbackStartInMs: number;
  readonly recordingStartInMs: number;
  readonly mainSegmentStartInMs: number;
  readonly recordingStopInMs: number;
  readonly playbackStopInMs: number;
  readonly recordingNames: readonly string[];
  readonly outputExtension: "wav" | "browser_default";
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
}
