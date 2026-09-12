import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./lib/auth";
import { Layout } from "./components/Layout";
import { Spinner } from "./components/ui/Feedback";
import { LoginPage } from "./pages/LoginPage";
import { CohortsPage } from "./pages/CohortsPage";
import { CohortDetailPage } from "./pages/CohortDetailPage";
import { CohortTrackAPage } from "./pages/CohortTrackAPage";
import { CohortTrackBPage } from "./pages/CohortTrackBPage";
import { StudentsPage } from "./pages/StudentsPage";
import { StudentDetailPage } from "./pages/student/StudentDetailPage";
import { FlagsPage } from "./pages/FlagsPage";
import { TasksPage } from "./pages/TasksPage";
import { EmailsPage } from "./pages/EmailsPage";
import { HistoryPage } from "./pages/HistoryPage";
import { SettingsPage } from "./pages/SettingsPage";

function ProtectedShell() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  return <Layout />;
}

// Cohorts are the starting point for an Admin; a Growth Coach's home is
// their Tasks feed instead (spec section 17: they see what needs their
// attention for their own assigned students, not a program-wide view).
function HomePage() {
  const { user } = useAuth();
  return <Navigate to={user?.role === "ADMIN" ? "/cohorts" : "/tasks"} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedShell />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/cohorts" element={<CohortsPage />} />
        <Route path="/cohorts/:id" element={<CohortDetailPage />} />
        <Route path="/cohorts/:id/track-a" element={<CohortTrackAPage />} />
        <Route path="/cohorts/:id/track-b" element={<CohortTrackBPage />} />
        <Route path="/students" element={<StudentsPage />} />
        <Route path="/students/:id" element={<StudentDetailPage />} />
        <Route path="/flags" element={<FlagsPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/emails" element={<EmailsPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
