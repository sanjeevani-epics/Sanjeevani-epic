import React, { useContext } from "react";
import { EthProvider } from "./contexts/EthContext";
import EthContext from "./contexts/EthContext/EthContext";
import AuthProvider from "./contexts/AuthContext/AuthProvider";
import useAuth from "./contexts/AuthContext/useAuth";
import Login from "./components/Auth/Login";
import { AlertProvider } from "./contexts/AlertContext/AlertContext";
import { useRoutes, Navigate, useLocation } from "react-router-dom";
import routes from "./routes";
import Register from "./components/Register";

window.global = window;

function AppContent() {
  const { state } = useContext(EthContext);
  const { user } = useAuth();
  const location = useLocation();
  
  const routesArray = Array.isArray(routes) ? routes : [];
  const content = useRoutes(routesArray);

  if (state.loading) {
    return <div style={{ textAlign: "center", marginTop: "20%" }}>Loading Blockchain Data...</div>;
  }

  if (state.initError) {
    return (
      <div
        style={{
          textAlign: "center",
          marginTop: "15%",
          padding: "0 24px",
          maxWidth: 520,
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        <p style={{ color: "#b91c1c", marginBottom: 16 }}>{state.initError}</p>
        <button type="button" onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }

  const path = location.pathname || "/";
  if (!user && path !== "/") {
    return <Login />;
  }

  if (state.role === "unknown" && path !== "/") {
    return <Register />;
  }

  if (path === "/") {
    if (user && state.role === "doctor") return <Navigate to="/doctor" replace />;
    if (user && state.role === "patient") return <Navigate to="/patient" replace />;
  }

  return <div id="App">{content}</div>;
}

function App() {
  return (
    <EthProvider>
      <AuthProvider>
        <AlertProvider>
          <AppContent />
        </AlertProvider>
      </AuthProvider>
    </EthProvider>
  );
}

export default App;