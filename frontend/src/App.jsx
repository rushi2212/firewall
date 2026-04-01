import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import Logs from "./pages/Logs";
import TestPayload from "./pages/TestPayload";
import Lab from "./pages/Lab";
import LabLoginPortal from "./pages/LabLoginPortal";
import LabBotDetection from "./pages/LabBotDetection";
import LabUserBehaviour from "./pages/LabUserBehaviour";
import Alerts from "./pages/Alerts";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import PresentationDashboard from "./pages/PresentationDashboard";

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Login Route */}
        <Route path="/login" element={<Login />} />

        {/* Public Routes with Navbar */}
        <Route
          path="/*"
          element={
            <div className="min-h-screen bg-linear-to-br from-gray-900 via-gray-800 to-gray-900">
              <Navbar />
              <main className="container mx-auto px-4 py-8">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/logs" element={<Logs />} />
                  <Route path="/test" element={<TestPayload />} />
                  <Route path="/lab" element={<Lab />} />
                  <Route path="/lab/login" element={<LabLoginPortal />} />
                  <Route path="/lab/bot" element={<LabBotDetection />} />
                  <Route path="/lab/behaviour" element={<LabUserBehaviour />} />
                  <Route path="/alerts" element={<Alerts />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/presentation" element={<PresentationDashboard />} />

                  {/* Protected Admin Route */}
                  <Route
                    path="/admin/dashboard"
                    element={
                      <ProtectedRoute>
                        <AdminDashboard />
                      </ProtectedRoute>
                    }
                  />
                </Routes>
              </main>
            </div>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
