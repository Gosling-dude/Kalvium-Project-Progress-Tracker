import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./lib/auth";
import { Layout } from "./components/Layout";
import { Spinner } from "./components/ui/Feedback";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { CohortsPage } from "./pages/CohortsPage";
import { CohortDetailPage } from "./pages/CohortDetailPage";
import { StudentsPage } from "./pages/StudentsPage";
import { StudentDetailPage } from "./pages/student/StudentDetailPage";
import { DeliverablesPage } from "./pages/DeliverablesPage";
import { FlagsPage } from "./pages/FlagsPage";
import { EmailsPage } from "./pages/EmailsPage";
import { HistoryPage } from "./pages/HistoryPage";
import { SettingsPage } from "./pages/SettingsPage";

function ProtectedShell() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  return <Layout />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedShell />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/cohorts" element={<CohortsPage />} />
        <Route path="/cohorts/:id" element={<CohortDetailPage />} />
        <Route path="/students" element={<StudentsPage />} />
        <Route path="/students/:id" element={<StudentDetailPage />} />
        <Route path="/deliverables" element={<DeliverablesPage />} />
        <Route path="/flags" element={<FlagsPage />} />
        <Route path="/emails" element={<EmailsPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
