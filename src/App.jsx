import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout.jsx";
import { DashboardPage } from "./pages/DashboardPage.jsx";
import { ServicesPage } from "./pages/ServicesPage.jsx";
import { SupportPage } from "./pages/SupportPage.jsx";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="services" element={<ServicesPage />} />
        <Route path="support" element={<SupportPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
