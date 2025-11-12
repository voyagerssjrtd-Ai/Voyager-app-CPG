// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./styles/globals.css";
import { AuthProvider } from "./contexts/AuthContext";
import LoginPage from "./components/LoginPage";
import ChatUI from "./components/Chat-UI/ChatUI";
import { OpenAIAdapter } from "./adapters/OpenAIAdapter";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId="139595164187-qj4m3um9j1vf45vm9fktjd1m64l6ljhu.apps.googleusercontent.com">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LoginPage />} />
            <Route path="/chat" element={<ChatUI backend={OpenAIAdapter} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </GoogleOAuthProvider>
  </React.StrictMode>
);
