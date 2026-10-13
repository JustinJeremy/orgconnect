import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { OrgProvider } from "./context/OrgContext.jsx";
import "./App.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <OrgProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </OrgProvider>
  </StrictMode>
);
