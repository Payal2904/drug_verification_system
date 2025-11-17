import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import { ReactQueryDevtools } from "react-query/devtools";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";

// Layout Components
import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import Sidebar from "./components/layout/Sidebar";
import LoadingSpinner from "./components/common/LoadingSpinner";
import ErrorBoundary from "./components/common/ErrorBoundary";

// Page Components
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/auth/LoginPage";
import VerificationPage from "./pages/VerificationPage";
import ScanPage from "./pages/ScanPage";
import {
  RegisterPage,
  ProfilePage,
  ReportsPage,
  CreateReportPage,
  ReportDetailsPage,
  SupplyChainPage,
  AdminDashboard,
  UserManagement,
  DrugManagement,
  BatchManagement,
  SystemSettings,
  NotFoundPage,
} from "./pages/PlaceholderPages";

// Styles
import "./styles/globals.css";

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
    mutations: {
      retry: 1,
    },
  },
});

// Protected Route Component
const ProtectedRoute = ({ children, requiredRoles = [] }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

// Public Route Component (redirect if already authenticated)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Main App Layout Component
const AppLayout = ({ children }) => {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-neutral-50">
      <Header onMenuClick={() => setSidebarOpen(true)} />

      {user && (
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      )}

      <main className="w-full">
        <div className="pt-20 w-full max-w-none mx-0 px-0">
          <div className="w-full">{children}</div>
        </div>
      </main>

      <Footer />

      {/* Toast notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: "#fff",
            color: "#1f2937",
            borderRadius: "0.5rem",
            boxShadow:
              "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
          },
          success: {
            iconTheme: {
              primary: "#10b981",
              secondary: "#fff",
            },
          },
          error: {
            iconTheme: {
              primary: "#ef4444",
              secondary: "#fff",
            },
          },
        }}
      />
    </div>
  );
};

// Main App Component
function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <Router>
            <AuthProvider>
              <AppLayout>
                <Routes>
                  {/* Public Routes */}
                  <Route path="/" element={<HomePage />} />
                  <Route path="/scan" element={<ScanPage />} />
                  <Route path="/verify" element={<VerificationPage />} />

                  {/* Authentication Routes */}
                  <Route
                    path="/login"
                    element={
                      <PublicRoute>
                        <LoginPage />
                      </PublicRoute>
                    }
                  />
                  <Route
                    path="/register"
                    element={
                      <PublicRoute>
                        <RegisterPage />
                      </PublicRoute>
                    }
                  />

                  {/* Protected User Routes */}
                  <Route
                    path="/profile"
                    element={
                      <ProtectedRoute>
                        <ProfilePage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/reports"
                    element={
                      <ProtectedRoute>
                        <ReportsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/reports/create"
                    element={
                      <ProtectedRoute>
                        <CreateReportPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/reports/:reportId"
                    element={
                      <ProtectedRoute>
                        <ReportDetailsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/supply-chain"
                    element={
                      <ProtectedRoute>
                        <SupplyChainPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Admin Routes */}
                  <Route
                    path="/admin"
                    element={
                      <ProtectedRoute requiredRoles={["admin"]}>
                        <AdminDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/users"
                    element={
                      <ProtectedRoute requiredRoles={["admin"]}>
                        <UserManagement />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/drugs"
                    element={
                      <ProtectedRoute requiredRoles={["admin"]}>
                        <DrugManagement />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/batches"
                    element={
                      <ProtectedRoute requiredRoles={["admin"]}>
                        <BatchManagement />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/settings"
                    element={
                      <ProtectedRoute requiredRoles={["admin"]}>
                        <SystemSettings />
                      </ProtectedRoute>
                    }
                  />

                  {/* Error Routes */}
                  <Route
                    path="/unauthorized"
                    element={
                      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
                        <div className="text-center">
                          <div className="mx-auto h-12 w-12 text-error-500 mb-4">
                            <svg
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                              />
                            </svg>
                          </div>
                          <h1 className="text-2xl font-bold text-neutral-900 mb-2">
                            Access Denied
                          </h1>
                          <p className="text-neutral-600 mb-4">
                            You don't have permission to access this page.
                          </p>
                          <button
                            onClick={() => window.history.back()}
                            className="btn btn-primary"
                          >
                            Go Back
                          </button>
                        </div>
                      </div>
                    }
                  />
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </AppLayout>
            </AuthProvider>
          </Router>
        </ThemeProvider>

        {/* React Query DevTools (only in development) */}
        {process.env.NODE_ENV === "development" && (
          <ReactQueryDevtools initialIsOpen={false} />
        )}
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
