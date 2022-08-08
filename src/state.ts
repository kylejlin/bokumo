import { AppProps } from "./App";

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
  readonly recordingStopInMs: number;
  readonly playbackStopInMs: number;
  readonly recordingNames: readonly string[];
}

export interface BokumoConfigBuilder {
  readonly bgmElementUrl: string;
  readonly playbackStartInMs: number;
  readonly recordingStartInMs: number;
  readonly recordingStopInMs: number;
  readonly playbackStopInMs: number;
  readonly recordingNames: readonly string[];
}

export interface LaunchPendingState {
  readonly kind: WrapperStateKind.LaunchPending;
}

export interface LaunchSucceededState {
  readonly kind: WrapperStateKind.LaunchSucceeded;
  readonly appProps: AppProps;
}

export interface LaunchFailedState {
  readonly kind: WrapperStateKind.LaunchFailed;
}

export interface AppState {}
