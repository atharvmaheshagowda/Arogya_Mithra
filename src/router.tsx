import { Navigate, createBrowserRouter } from "react-router-dom";
import { ApplicationShell } from "@/components/app-shell";
import { LoginPage, RegisterPage } from "@/pages/auth-pages";
import { DashboardPage, ModulePage } from "@/pages/app-pages";

function DevelopmentReady() {
  return <div className="sr-only">AAROGYA MITHRA development environment ready.</div>;
}

export const router = createBrowserRouter([
  { path: "/", element: <DevelopmentReady /> },
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
    element: <Navigate to="/login" replace />,
  },
]);
