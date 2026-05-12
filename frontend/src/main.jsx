import { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { AppProvider } from "./context/AppContext.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import ErrorBoundary from "./components/ErrorBoundary";
import Spinner from "./components/ui/Spinner";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <AppProvider>
            <Suspense fallback={<div className="p-8 flex items-center justify-center"><Spinner size={36} /></div>}>
              <App />
            </Suspense>
          </AppProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>
);

