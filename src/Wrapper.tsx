import React from "react";
import { App } from "./App";
import "./App.css";
import {
  buildConfig,
  isFileBokumoConfig,
  parseBokumoConfig,
} from "./bokumoConfig";
import {
  WrapperState,
  WrapperStateKind,
  PrelaunchState,
  LaunchPendingState,
  LaunchSucceededState,
  LaunchFailedState,
  AllAudioMimeTypes,
  AudioMimeType,
} from "./state";

export class Wrapper extends React.Component<WrapperProps, WrapperState> {
  constructor(props: WrapperProps) {
    super(props);

    this.state = {
      kind: WrapperStateKind.Prelaunch,
      config: undefined,
    };

    this.fileInputOnChange = this.fileInputOnChange.bind(this);
    this.launchButtonOnClick = this.launchButtonOnClick.bind(this);
  }
  render(): React.ReactElement {
    const allMimeTypes: AllAudioMimeTypes = [
      "audio/webm",
      "audio/ogg",
      "audio/mp3",
      "audio/x-matroska",
    ];
    const legalMimeType: undefined | AudioMimeType = allMimeTypes.find(
      (mimeType) => MediaRecorder.isTypeSupported(mimeType)
    );
    if (legalMimeType === undefined) {
      return this.renderUnsupportedBrowserMenu();
    }

    const { state } = this;
    switch (state.kind) {
      case WrapperStateKind.Prelaunch:
        return this.renderPrelaunchMenu(state);
      case WrapperStateKind.LaunchPending:
        return this.renderLaunchPendingMenu(state);
      case WrapperStateKind.LaunchSucceeded:
        return this.renderLaunchSucceededMenu(state, legalMimeType);
      case WrapperStateKind.LaunchFailed:
        return this.renderLaunchFailedMenu(state);
    }
  }

  renderUnsupportedBrowserMenu(): React.ReactElement {
    return (
      <div className="Wrapper--unsupportedBrowser">
        <p>
          Sorry, this browser is not supported. Please use a newer one, such as
          Google Chrome 103.
        </p>
      </div>
    );
  }

  renderPrelaunchMenu(state: PrelaunchState): React.ReactElement {
    return (
      <div className="Wrapper--prelaunch">
        <p>Help: TODO Write user guide.</p>
        <div>
          <label>Upload files:</label>{" "}
          <input
            type="file"
            multiple={true}
            onChange={this.fileInputOnChange}
          />
        </div>
        <button
          disabled={state.config === undefined}
          onClick={this.launchButtonOnClick}
        >
          Launch
        </button>
      </div>
    );
  }

  renderLaunchPendingMenu(_state: LaunchPendingState): React.ReactElement {
    return (
      <div className="Wrapper--launchPending">
        <p>Almost ready to complete launch!</p>
        <p>
          Please grant microphone permission. The app will not start until
          microphone permission has been granted.
        </p>
      </div>
    );
  }

  renderLaunchSucceededMenu(
    state: LaunchSucceededState,
    mimeType: AudioMimeType
  ): React.ReactElement {
    return (
      <div className="Wrapper--launchSucceeded">
        <App {...{ ...state.appProps, mimeType }} />
      </div>
    );
  }

  renderLaunchFailedMenu(state: LaunchFailedState): React.ReactElement {
    return (
      <div className="Wrapper--launchFailed">
        <p>
          Failed to launch app. Please grant microphone permission and try
          again. You will need to reload the page after granting microphone
          permission.
        </p>
        <p>
          If you are a web developer, you can see the console for more details.
        </p>
      </div>
    );
  }

  fileInputOnChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const { files: fileList } = event.target;
    if (fileList === null) {
      return;
    }
    const files = Array.from(fileList);

    const bokumoDotJsonCandidates = files.filter((f) =>
      isFileBokumoConfig(f.name)
    );
    if (bokumoDotJsonCandidates.length === 0) {
      window.alert("No bokumo.json file found.");
      return;
    }
    if (bokumoDotJsonCandidates.length > 1) {
      window.alert("Multiple bokumo.json files found. Only one is allowed.");
      return;
    }

    const bokumoDotJson = bokumoDotJsonCandidates[0];
    const nonBokumoDotJsonFiles = files.filter(
      (f) => !isFileBokumoConfig(f.name)
    );
    this.loadFiles(bokumoDotJson, nonBokumoDotJsonFiles);
  }

  loadFiles(bokumoDotJson: File, nonBokumoDotJsonFiles: File[]): void {
    const fr = new FileReader();
    fr.addEventListener("load", () => {
      const parseResult = parseBokumoConfig(
        fr.result as string,
        nonBokumoDotJsonFiles
      );
      if (parseResult.error !== undefined) {
        window.alert(`Error: ${parseResult.error}`);
        return;
      }

      const { configBuilder } = parseResult;
      buildConfig(configBuilder).then((config) => {
        this.setState({
          kind: WrapperStateKind.Prelaunch,
          config,
        });
      });
    });

    fr.readAsText(bokumoDotJson);
  }

  launchButtonOnClick(): void {
    const { state } = this;
    if (state.kind !== WrapperStateKind.Prelaunch) {
      throw new Error(
        "Launch button was clicked when prelaunch menu was not open."
      );
    }

    const { config } = state;
    if (config === undefined) {
      throw new Error(
        "Launch button was clicked when config was not yet uploaded."
      );
    }

    navigator.mediaDevices
      .getUserMedia({ video: false, audio: true })
      .then((stream) => {
        this.setState({
          kind: WrapperStateKind.LaunchSucceeded,
          appProps: { stream, config },
        });
      })
      .catch((error) => {
        console.log("Failed to get audio stream.", { error });
        this.setState({
          kind: WrapperStateKind.LaunchFailed,
        });
      });
  }
}

interface WrapperProps {}
