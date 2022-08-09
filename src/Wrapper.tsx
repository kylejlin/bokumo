import React from "react";
import { App } from "./App";
import {
  buildConfig,
  isFileBokumoConfig,
  parseBokumoConfig,
} from "./bokumoConfig";
import { Header } from "./Header";
import { getGithubUsernameOfHost } from "./misc";
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

const ARBITRARY_PREFIX_THAT_WILL_DEFINITELY_NOT_BE_CONTAINED_IN_A_PATH =
  "/\\#@:&{}*<>";

export class Wrapper extends React.Component<WrapperProps, WrapperState> {
  constructor(props: WrapperProps) {
    super(props);

    this.state = {
      kind: WrapperStateKind.Prelaunch,
      config: undefined,
      nonBokumoDotJsonFiles: [],
    };

    this.uploadFilesButtonOnClick = this.uploadFilesButtonOnClick.bind(this);
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
      <div className="Wrapper Wrapper--unsupportedBrowser">
        <p>
          Sorry, this browser is not supported. Please use a newer one, such as
          Google Chrome 103.
        </p>
      </div>
    );
  }

  renderPrelaunchMenu(state: PrelaunchState): React.ReactElement {
    const githubUsername = getGithubUsernameOfHost();
    const helpHref: undefined | string =
      githubUsername &&
      `https://github.com/${githubUsername}/bokumo/tree/main/docs/user_guide.md`;
    return (
      <div className="Wrapper Wrapper--prelaunch">
        <Header />

        {state.config === undefined ? (
          <>
            <p>Welcome to Bokumo!</p>

            {helpHref && (
              <p>
                If you are a new user, click <a href={helpHref}>here</a> for
                help.
              </p>
            )}

            <p>
              Please upload files. You can only launch the app after you upload
              a <span className="FileName">bokumo.json</span> file and a
              background music file.
            </p>
            <p>
              The name of the background music file must match the name
              specified in <span className="FileName">bokumo.json</span>.
            </p>

            {state.nonBokumoDotJsonFiles.length > 0 && (
              <div className="FileListContainer">
                <p>Files:</p>
                <ol>
                  {state.nonBokumoDotJsonFiles.map((file, i) => (
                    <li
                      key={
                        i +
                        ARBITRARY_PREFIX_THAT_WILL_DEFINITELY_NOT_BE_CONTAINED_IN_A_PATH +
                        file.name
                      }
                    >
                      <span className="FileName">{file.name}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            <div className="FileListContainer">
              <p>Missing:</p>
              <ol>
                <li>
                  <span className="FileName">bokumo.json</span>
                </li>
              </ol>
            </div>
          </>
        ) : (
          <>
            <p>
              Ready to launch. Please click the "Launch" button to continue.
            </p>
          </>
        )}

        <button
          className="Wrapper--prelaunch__Button--uploadFiles Button--secondary"
          onClick={this.uploadFilesButtonOnClick}
        >
          Upload Files
        </button>
        <button
          className="Wrapper--prelaunch__Button--launch Button--primary"
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
      <div className="Wrapper Wrapper--launchPending">
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
      <div className="Wrapper Wrapper--launchSucceeded">
        <App {...{ ...state.appProps, mimeType }} />
      </div>
    );
  }

  renderLaunchFailedMenu(state: LaunchFailedState): React.ReactElement {
    return (
      <div className="Wrapper Wrapper--launchFailed">
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

  uploadFilesButtonOnClick(): void {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.multiple = true;
    fileInput.addEventListener("change", () => {
      const { files: fileList } = fileInput;
      if (fileList === null) {
        return;
      }
      const files = Array.from(fileList);

      if (files.length === 0) {
        return;
      }

      this.handleMultiFileUpload(files);
    });

    fileInput.click();
  }

  handleMultiFileUpload(files: readonly File[]): void {
    const bokumoDotJsonFiles = files.filter((f) => isFileBokumoConfig(f.name));
    const nonBokumoDotJsonFiles = files.filter(
      (f) => !isFileBokumoConfig(f.name)
    );

    this.setState(
      (prevState) => {
        if (prevState.kind !== WrapperStateKind.Prelaunch) {
          return prevState;
        }

        return {
          ...prevState,
          nonBokumoDotJsonFiles: prevState.nonBokumoDotJsonFiles.concat(
            nonBokumoDotJsonFiles
          ),
        };
      },
      () => {
        if (this.state.kind !== WrapperStateKind.Prelaunch) {
          return;
        }

        if (bokumoDotJsonFiles.length > 1) {
          window.alert(
            "Multiple bokumo.json files found. Only one is allowed."
          );
          return;
        }

        if (bokumoDotJsonFiles.length === 1) {
          const bokumoDotJson = bokumoDotJsonFiles[0];
          this.loadFiles(bokumoDotJson, this.state.nonBokumoDotJsonFiles);
        }
      }
    );
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
