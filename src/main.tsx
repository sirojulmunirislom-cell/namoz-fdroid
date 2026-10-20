import React from "react";
import { Capacitor } from "@capacitor/core";
import { createRoot } from "react-dom/client";
import { AppProvider } from "./store";
import { App } from "./App";
import "./styles.css";
import { consumeNativeLaunch } from "./native";
void consumeNativeLaunch().catch(() => {});
window.addEventListener(
  "namoz-launch",
  () => void consumeNativeLaunch().catch(() => {}),
);
import { initializeNotificationLinks } from "./notifications";
void initializeNotificationLinks().catch(() => {});
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </React.StrictMode>,
);
