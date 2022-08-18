import React from "react";
import { App } from "./App";
import {
  BokumoConfigBuilder,
  buildConfig,
  isFileNameBokumoConfig,
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
  FileInfo,
} from "./state";

const ARBITRARY_PREFIX_THAT_WILL_DEFINITELY_NOT_BE_CONTAINED_IN_A_PATH =
  "/\\#@:&{}*<>";

export class Wrapper extends React.Component<WrapperProps, WrapperState> {
  constructor(props: WrapperProps) {
    super(props);

    this.state = {
      kind: WrapperStateKind.Prelaunch,
      fileInfo: [],
    };

    this.uploadFilesButtonOnClick = this.uploadFilesButtonOnClick.bind(this);
    this.deleteFileInfo = this.deleteFileInfo.bind(this);
    this.launchButtonOnClick = this.launchButtonOnClick.bind(this);
  }

  override render(): React.ReactElement {
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
      githubUsername === undefined
        ? undefined
        : `https://github.com/${githubUsername}/bokumo/tree/main/docs/user_guide.md`;

    const bokumoDotJsonFileInfo = state.fileInfo.filter((info) =>
      isFileNameBokumoConfig(info.file.name)
    );
    const requiredBgmFileName: undefined | string =
      bokumoDotJsonFileInfo.length === 1
        ? bokumoDotJsonFileInfo[0].configBuilder?.bgmFileName
        : undefined;

    return (
      <div className="Wrapper Wrapper--prelaunch">
        <Header />

        <p>Welcome to Bokumo!</p>

        {helpHref !== undefined && (
          <p>
            If you are a new user, click <a href={helpHref}>here</a> for help.
          </p>
        )}

        <p>
          Please upload files. You can only launch the app after you upload a{" "}
          <span className="FileName">bokumo.json</span> file and a background
          music file.
        </p>
        <p>
          The name of the background music file must match the name specified in{" "}
          <span className="FileName">bokumo.json</span>.
        </p>

        {state.fileInfo.length > 0 && (
          <div className="StatusSection">
            <p>Files:</p>
            <ol>
              {state.fileInfo.map((info, i) => (
                <li
                  key={
                    i +
                    ARBITRARY_PREFIX_THAT_WILL_DEFINITELY_NOT_BE_CONTAINED_IN_A_PATH +
                    info.file.name
                  }
                >
                  <span className="FileName">{info.file.name}</span>{" "}
                  <button
                    className="DeleteButton"
                    onClick={() => this.deleteFileInfo(info)}
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ol>
          </div>
        )}

        {canLaunch(state.fileInfo) ? (
          <div className="StatusSection">
            <p className="ReadyToLaunchNotification">
              Ready to launch. Please click the "Launch" button to continue.
            </p>
          </div>
        ) : (
          <div className="StatusSection">
            <p>Issues preventing launch:</p>
            <ol>
              {bokumoDotJsonFileInfo.length > 1 && (
                <li>
                  Multiple <span className="FileName">bokumo.json</span> files.
                  Please delete all but one.
                </li>
              )}

              {bokumoDotJsonFileInfo.length === 0 && (
                <li>
                  Missing <span className="FileName">bokumo.json</span> file.
                </li>
              )}

              {state.fileInfo.length === 0 && (
                <li>Missing background music file.</li>
              )}

              {bokumoDotJsonFileInfo.length === 1 &&
                bokumoDotJsonFileInfo[0].configBuilder === undefined && (
                  <li>
                    Invalid <span className="FileName">bokumo.json</span> file.
                  </li>
                )}

              {bokumoDotJsonFileInfo.length === 1 &&
                requiredBgmFileName !== undefined &&
                !state.fileInfo.some(
                  (info) => info.file.name === requiredBgmFileName
                ) && (
                  <li>
                    Missing{" "}
                    <span className="FileName">{requiredBgmFileName}</span>{" "}
                    (required by <span className="FileName">bokumo.json</span>
                    ).
                  </li>
                )}

              {bokumoDotJsonFileInfo.length === 1 &&
                requiredBgmFileName !== undefined &&
                state.fileInfo.filter(
                  (info) => info.file.name === requiredBgmFileName
                ).length > 1 && (
                  <li>
                    Multiple{" "}
                    <span className="FileName">{requiredBgmFileName}</span>{" "}
                    files. Please delete all but one.
                  </li>
                )}
            </ol>
          </div>
        )}

        <button
          className="Wrapper--prelaunch__Button--uploadFiles Button--secondary"
          onClick={this.uploadFilesButtonOnClick}
        >
          Upload Files
        </button>
        <button
          className="Wrapper--prelaunch__Button--launch Button--primary"
          disabled={!canLaunch(state.fileInfo)}
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
    type PartialInfo = Omit<FileInfo, "id">;
    const newPartialInfoProm: Promise<PartialInfo[]> = Promise.all(
      files.map((file): Promise<PartialInfo> => {
        if (isFileNameBokumoConfig(file.name)) {
          return new Promise((resolve) => {
            const fr = new FileReader();
            fr.addEventListener("load", () => {
              const parseResult = parseBokumoConfig(fr.result as string);
              if (parseResult.error !== undefined) {
                resolve({ file, configBuilder: undefined });
              } else {
                resolve({ file, configBuilder: parseResult.configBuilder });
              }
            });
            fr.readAsText(file);
          });
        } else {
          return Promise.resolve({ file, configBuilder: undefined });
        }
      })
    );

    newPartialInfoProm.then((newPartialInfo) => {
      this.setState((prevState) => {
        if (prevState.kind !== WrapperStateKind.Prelaunch) {
          return prevState;
        }

        const idGreaterThanAllExistingIds =
          Math.max(1, ...prevState.fileInfo.map((info) => info.id)) + 1;

        const newFileInfo = newPartialInfo.map((partial, i) => {
          return {
            id: idGreaterThanAllExistingIds + i,
            file: partial.file,
            configBuilder: partial.configBuilder,
          };
        });

        return {
          ...prevState,
          fileInfo: prevState.fileInfo.concat(newFileInfo),
        };
      });
    });
  }

  launchButtonOnClick(): void {
    const { state } = this;
    if (state.kind !== WrapperStateKind.Prelaunch) {
      throw new Error(
        "Launch button was clicked when prelaunch menu was not open."
      );
    }

    const launchResources = getConfigBuilderAndBgmFileFromFileInfoArray(
      state.fileInfo
    );

    if (launchResources === undefined) {
      throw new Error("Launch button was clicked when app was unlaunchable.");
    }

    const [configBuilder, bgmFile] = launchResources;
    buildConfig(configBuilder, bgmFile).then((config) => {
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

      setTimeout(() => {
        // We can't simply write
        // `this.setState({ kind: WrapperStateKind.LaunchPending });`
        // because we don't want to set the state to LaunchPending
        // if it's already launched (which may be the case if microphone
        // permissions were already granted).
        this.setState((prevState) => {
          if (prevState.kind !== WrapperStateKind.Prelaunch) {
            return prevState;
          }
          return { kind: WrapperStateKind.LaunchPending };
        });
      }, 1000);
    });
  }

  deleteFileInfo(infoToDelete: FileInfo): void {
    this.setState((prevState) => {
      if (prevState.kind !== WrapperStateKind.Prelaunch) {
        return prevState;
      }

      return {
        ...prevState,
        fileInfo: prevState.fileInfo.filter((i) => i.id !== infoToDelete.id),
      };
    });
  }
}

type WrapperProps = Record<string, unknown>;

function canLaunch(fileInfo: readonly FileInfo[]): boolean {
  return getConfigBuilderAndBgmFileFromFileInfoArray(fileInfo) !== undefined;
}

function getConfigBuilderAndBgmFileFromFileInfoArray(
  fileInfo: readonly FileInfo[]
): undefined | [BokumoConfigBuilder, File] {
  const bokumoDotJsonFileInfo = fileInfo.filter((info) =>
    isFileNameBokumoConfig(info.file.name)
  );

  if (bokumoDotJsonFileInfo.length !== 1) {
    return;
  }
  const { configBuilder } = bokumoDotJsonFileInfo[0];

  if (configBuilder === undefined) {
    return;
  }

  const bgmFileInfo = fileInfo.filter(
    (info) => info.file.name === configBuilder.bgmFileName
  );
  if (bgmFileInfo.length !== 1) {
    return;
  }

  return [configBuilder, bgmFileInfo[0].file];
}
