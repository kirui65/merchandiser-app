import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import LoginPage from './auth/LoginPage';
import Dashboard from './pages/Dashboard.jsx';
import RouteReplayPage from './pages/RouteReplayPage.jsx';
import RepsPage from './pages/RepsPage.jsx';
import OutletsPage from './pages/OutletsPage.jsx';
import ReconciliationPage from './pages/ReconciliationPage.jsx';
import ProductsPage from './pages/ProductsPage.jsx';
import AuditLogPage from './pages/AuditLogPage.jsx';

function RequireAuth({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

function Shell({ children }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  return <div className="app-shell"><header className="topbar"><NavLink className="brand" to="/"><span>●</span> Brandsphere</NavLink><nav className="nav"><NavLink to="/" end>Overview</NavLink><NavLink to="/routes">Routes</NavLink><NavLink to="/reps">Reps</NavLink><NavLink to="/products">Products</NavLink><NavLink to="/outlets">Outlets</NavLink><NavLink to="/reconciliation">Reconciliation</NavLink><NavLink to="/audit-log">Audit log</NavLink></nav><button className="ui-button ui-button-secondary" onClick={() => { signOut(); navigate('/login'); }}>Sign out</button></header><main className="shell-content">{children}</main></div>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <RequireAuth><Shell><Dashboard /></Shell></RequireAuth>
            }
          />
          <Route path="/routes" element={<RequireAuth><Shell><RouteReplayPage /></Shell></RequireAuth>} />
          <Route path="/reps" element={<RequireAuth><Shell><RepsPage /></Shell></RequireAuth>} />
          <Route path="/products" element={<RequireAuth><Shell><ProductsPage /></Shell></RequireAuth>} />
          <Route path="/outlets" element={<RequireAuth><Shell><OutletsPage /></Shell></RequireAuth>} />
          <Route path="/reconciliation" element={<RequireAuth><Shell><ReconciliationPage /></Shell></RequireAuth>} />
          <Route path="/audit-log" element={<RequireAuth><Shell><AuditLogPage /></Shell></RequireAuth>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
