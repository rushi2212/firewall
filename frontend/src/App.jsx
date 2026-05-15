import React, { Suspense, lazy } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import Spinner from "./components/ui/Spinner";

// Lazy-loaded pages
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Logs = lazy(() => import("./pages/Logs"));
const TestPayload = lazy(() => import("./pages/TestPayload"));
const Lab = lazy(() => import("./pages/Lab"));
const LabLoginPortal = lazy(() => import("./pages/LabLoginPortal"));
const LabBotDetection = lazy(() => import("./pages/LabBotDetection"));
const LabUserBehaviour = lazy(() => import("./pages/LabUserBehaviour"));
const Alerts = lazy(() => import("./pages/Alerts"));
const Settings = lazy(() => import("./pages/Settings"));
const Login = lazy(() => import("./pages/Login"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const PresentationDashboard = lazy(() => import("./pages/PresentationDashboard"));

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Login Route */}
        <Route path="/login" element={<Suspense fallback={<Spinner size={28} />}><Login /></Suspense>} />

        {/* Public Routes with Navbar */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <div className="app-shell">
                <Navbar />
                <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                  <Suspense fallback={<div className="py-8 flex justify-center"><Spinner size={36} /></div>}>
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
                      <Route path="/admin/dashboard" element={<AdminDashboard />} />
                    </Routes>
                  </Suspense>
                </main>
              </div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
