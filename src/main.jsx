import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import { ProfileProvider } from "./context/ProfileContext";
import { MediaProvider } from "./context/MediaContext";
import { ChatProvider } from "./context/ChatContext";
import { SnackbarProvider } from "./components/Snackbar";
import "./styles.css";

// Snackbar — снаружи, чтобы провайдеры данных могли сообщать об ошибках сохранения
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
      <SnackbarProvider>
        <ProfileProvider>
          <ChatProvider>
            <MediaProvider>
              <App />
            </MediaProvider>
          </ChatProvider>
        </ProfileProvider>
      </SnackbarProvider>
    </ErrorBoundary>
  </StrictMode>,
);
