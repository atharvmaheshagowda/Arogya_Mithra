import { Navigate, createBrowserRouter } from "react-router-dom";
import { ApplicationShell } from "@/components/app-shell";
import { LandingPage } from "@/pages/landing-page";
import { LoginPage, RegisterPage } from "@/pages/auth-pages";
import { DashboardPage, ModulePage } from "@/pages/app-pages";

export const router = createBrowserRouter([
  { path: "/", element: <LandingPage /> },
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  {
    path: "/app",
    element: <ApplicationShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "patients", element: <ModulePage /> },
      { path: "consultations", element: <ModulePage /> },
      { path: "reports", element: <ModulePage /> },
      { path: "medication-safety", element: <ModulePage /> },
      { path: "workflow", element: <ModulePage /> },
      { path: "settings", element: <ModulePage /> },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);
