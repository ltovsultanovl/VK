import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import { ProfileProvider } from "./context/ProfileContext";
import { MediaProvider } from "./context/MediaContext";
import { SnackbarProvider } from "./components/Snackbar";
import "./styles.css";

// Snackbar — снаружи, чтобы провайдеры данных могли сообщать об ошибках сохранения
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
      <SnackbarProvider>
        <ProfileProvider>
          <MediaProvider>
            <App />
          </MediaProvider>
        </ProfileProvider>
      </SnackbarProvider>
    </ErrorBoundary>
  </StrictMode>,
);
