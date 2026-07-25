import { Routes, Route, Navigate } from 'react-router-dom';
import AdminHome from './AdminHome';
import RecordingStudio from './RecordingStudio';
import AnalyticsDashboard from './AnalyticsDashboard';

// All admin screens live behind this one lazy-loaded router (see App.jsx),
// so none of their code — or even their sub-paths — ships in the main
// bundle. Each screen keeps its own ADMIN_EMAIL check as defense in depth.
const AdminRoutes = () => (
  <Routes>
    <Route index element={<AdminHome />} />
    <Route path="record" element={<RecordingStudio />} />
    <Route path="analytics" element={<AnalyticsDashboard />} />
    <Route path="*" element={<Navigate to="/home" replace />} />
  </Routes>
);

export default AdminRoutes;
