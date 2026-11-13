import { lazy, Suspense, type ComponentType } from "react";
import { Navigate, createBrowserRouter } from "react-router-dom";
import { ApplicationShell } from "@/components/app-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { RouteErrorBoundary } from "@/components/route-error-boundary";

// Loading Skeleton Fallback for Lazy Loaded Routes
function PageLoader() {
  return (
    <div className="space-y-6 p-4 sm:p-6 animate-pulse">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-60 sm:w-80 rounded-xl" />
          <Skeleton className="h-4 w-48 sm:w-96 rounded-lg" />
        </div>
        <Skeleton className="h-9 w-32 rounded-xl" />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
      </div>

      <Skeleton className="h-96 w-full rounded-2xl" />
    </div>
  );
}

const withSuspense = (Component: ComponentType) => (
  <Suspense fallback={<PageLoader />}>
    <Component />
  </Suspense>
);

// Lazy Loaded Page Components for Optimum Chunking
const LandingPage = lazy(() =>
  import("@/pages/landing-page").then((m) => ({ default: m.LandingPage })),
);
const LoginPage = lazy(() =>
  import("@/pages/auth-pages").then((m) => ({ default: m.LoginPage })),
);
const RegisterPage = lazy(() =>
  import("@/pages/auth-pages").then((m) => ({ default: m.RegisterPage })),
);
const DashboardPage = lazy(() =>
  import("@/pages/app-pages").then((m) => ({ default: m.DashboardPage })),
);
const PatientsPage = lazy(() =>
  import("@/pages/patient-pages").then((m) => ({ default: m.PatientsPage })),
);
const PatientProfilePage = lazy(() =>
  import("@/pages/patient-pages").then((m) => ({ default: m.PatientProfilePage })),
);
const ConsultationsPage = lazy(() =>
  import("@/pages/consultation-workspace").then((m) => ({
    default: m.ConsultationsPage,
  })),
);
const ConsultationWorkspacePage = lazy(() =>
  import("@/pages/consultation-workspace").then((m) => ({
    default: m.ConsultationWorkspacePage,
  })),
);
const ReportsPage = lazy(() =>
  import("@/pages/report-intelligence-page").then((m) => ({
    default: m.ReportsPage,
  })),
);
const MedicationSafetyPage = lazy(() =>
  import("@/pages/medication-safety-page").then((m) => ({
    default: m.MedicationSafetyPage,
  })),
);
const WorkflowPage = lazy(() =>
  import("@/pages/workflow-visualizer-page").then((m) => ({
    default: m.WorkflowVisualizerPage,
  })),
);
const SettingsPage = lazy(() =>
  import("@/pages/settings-page").then((m) => ({ default: m.SettingsPage })),
);

export const router = createBrowserRouter([
  {
    path: "/",
    element: withSuspense(LandingPage),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/login",
    element: withSuspense(LoginPage),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/register",
    element: withSuspense(RegisterPage),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/app",
    element: <ApplicationShell />,
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: <Navigate to="/app/dashboard" replace /> },
      { path: "dashboard", element: withSuspense(DashboardPage) },
      { path: "patients", element: withSuspense(PatientsPage) },
      { path: "patients/:patientId", element: withSuspense(PatientProfilePage) },
      { path: "consultations", element: withSuspense(ConsultationsPage) },
      {
        path: "consultations/:consultationId",
        element: withSuspense(ConsultationWorkspacePage),
      },
      { path: "reports", element: withSuspense(ReportsPage) },
      { path: "safety", element: withSuspense(MedicationSafetyPage) },
      { path: "medication-safety", element: <Navigate to="/app/safety" replace /> },
      { path: "workflow", element: withSuspense(WorkflowPage) },
      { path: "settings", element: withSuspense(SettingsPage) },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);
