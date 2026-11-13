import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import "./index.css";
import { router } from "./router";
import { ThemeProvider } from "./components/theme-provider";
import { ToastProvider } from "./components/ui/toast";
import { AuthProvider } from "./lib/auth";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider><ToastProvider><AuthProvider><RouterProvider router={router} /></AuthProvider></ToastProvider></ThemeProvider>
  </StrictMode>,
);
