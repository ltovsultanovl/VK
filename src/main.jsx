import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ProfileProvider } from "./context/ProfileContext";
import { SnackbarProvider } from "./components/Snackbar";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ProfileProvider>
      <SnackbarProvider>
        <App />
      </SnackbarProvider>
    </ProfileProvider>
  </StrictMode>,
);
