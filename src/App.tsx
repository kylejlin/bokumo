import React from "react";
import "./App.css";

export class App extends React.Component<AppProps, AppState> {
  render(): React.ReactElement {
    return (
      <div className="App">
        <header className="App-header">
          <p>
            Edit <code>src/App.tsx</code> and save to reload.
          </p>
          <a
            className="App-link"
            href="https://reactjs.org"
            target="_blank"
            rel="noopener noreferrer"
          >
            Learn React
          </a>
        </header>
      </div>
    );
  }
}

export interface AppProps {
  stream: MediaStream;
}

export interface AppState {}
