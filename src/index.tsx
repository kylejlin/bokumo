import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { App } from "./App";
import reportWebVitals from "./reportWebVitals";

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);

navigator.mediaDevices
  .getUserMedia({ video: false, audio: true })
  .then((stream) => {
    root.render(
      <React.StrictMode>
        <App stream={stream} />
      </React.StrictMode>
    );
  })
  .catch((error) => {
    root.render(
      <React.StrictMode>
        <p>
          Could not get audio stream. Please make sure you have a microphone
          enabled.
        </p>
      </React.StrictMode>
    );
    window.alert(
      "Could not get audio stream. Please make sure you have a microphone enabled."
    );
    console.log(
      "Could not get audio stream. Please make sure you have a microphone enabled.",
      { error }
    );
  });

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
