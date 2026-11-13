import { Navigate, createBrowserRouter } from "react-router-dom";
import { ApplicationShell } from "@/components/app-shell";
import { LandingPage } from "@/pages/landing-page";
import { LoginPage, RegisterPage } from "@/pages/auth-pages";
import {
  DashboardPage,
  ConsultationsPage,
  ReportsPage,
  MedicationSafetyPage,
  WorkflowPage,
  SettingsPage,
} from "@/pages/app-pages";
import { PatientsPage, PatientProfilePage } from "@/pages/patient-pages";

export const router = createBrowserRouter([
  { path: "/", element: <LandingPage /> },
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  {
    path: "/app",
    element: <ApplicationShell />,
    children: [
      { index: true, element: <Navigate to="/app/dashboard" replace /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "patients", element: <PatientsPage /> },
      { path: "patients/:patientId", element: <PatientProfilePage /> },
      { path: "consultations", element: <ConsultationsPage /> },
      { path: "reports", element: <ReportsPage /> },
      { path: "medication-safety", element: <MedicationSafetyPage /> },
      { path: "workflow", element: <WorkflowPage /> },
      { path: "settings", element: <SettingsPage /> },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);
