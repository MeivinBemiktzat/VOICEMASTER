import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AppStoreProvider } from "./lib/AppStore";
import { ToastProvider } from "./lib/ToastContext";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <AppStoreProvider>
          <App />
        </AppStoreProvider>
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>
);
