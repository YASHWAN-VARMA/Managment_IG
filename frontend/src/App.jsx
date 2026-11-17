import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./layouts/AppLayout.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Vehicles from "./pages/Vehicles.jsx";
import Drivers from "./pages/Drivers.jsx";
import Trips from "./pages/Trips.jsx";
import Finance from "./pages/Finance.jsx";
import Documents from "./pages/Documents.jsx";
import Reports from "./pages/Reports.jsx";
import Settings from "./pages/Settings.jsx";
import { useAuth } from "./context/AuthContext.jsx";

function ProtectedLayout() {
  const { user, loading } = useAuth();
  if (loading) return <div className="screen-loader">Loading Managment_IG...</div>;
  return user ? <AppLayout /> : <Navigate to="/login" replace />;
}
export default function App() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route element={<ProtectedLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="/vehicles" element={<Vehicles />} />
        <Route path="/drivers" element={<Drivers />} />
        <Route path="/trips" element={<Trips />} />
        <Route path="/finance" element={<Finance />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
