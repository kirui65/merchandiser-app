import React, { useState } from 'react';
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
import TerritoriesPage from './pages/TerritoriesPage.jsx';
import PasswordChangeDialog from './components/PasswordChangeDialog.jsx';

function RequireAuth({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

function Shell({ children }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [changingPassword, setChangingPassword] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);
  return <div className="app-shell"><header className="topbar"><NavLink className="brand" to="/" aria-label="Brandsphere home" onClick={closeMenu}><img className="brand-logo" src="/brandsphere-wordmark.png" alt="Brandsphere Marketing Agency" /></NavLink><button className="nav-toggle" type="button" aria-expanded={menuOpen} aria-controls="dashboard-navigation" onClick={() => setMenuOpen((open) => !open)}><span aria-hidden="true">☰</span><span>{menuOpen ? 'Close' : 'Menu'}</span></button><nav id="dashboard-navigation" className={`nav ${menuOpen ? 'is-open' : ''}`} aria-label="Dashboard"><NavLink to="/" end onClick={closeMenu}>Overview</NavLink><NavLink to="/routes" onClick={closeMenu}>Routes</NavLink><NavLink to="/outlets" onClick={closeMenu}>Outlets</NavLink><NavLink to="/territories" onClick={closeMenu}>Territories</NavLink><NavLink to="/reps" onClick={closeMenu}>Team</NavLink><NavLink to="/products" onClick={closeMenu}>Products</NavLink><NavLink to="/reconciliation" onClick={closeMenu}>Reconciliation</NavLink><NavLink to="/audit-log" onClick={closeMenu}>Audit log</NavLink></nav><div className="account-actions"><span className="account-label"><strong>{user?.name || 'Manager'}</strong>Manager account</span><button className="ui-button ui-button-secondary" onClick={() => setChangingPassword(true)}>Change password</button><button className="ui-button ui-button-secondary" onClick={() => { signOut(); navigate('/login'); }}>Sign out</button></div></header><main className="shell-content">{children}</main>{changingPassword && <PasswordChangeDialog onClose={() => setChangingPassword(false)} />}</div>;
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
          <Route path="/territories" element={<RequireAuth><Shell><TerritoriesPage /></Shell></RequireAuth>} />
          <Route path="/reconciliation" element={<RequireAuth><Shell><ReconciliationPage /></Shell></RequireAuth>} />
          <Route path="/audit-log" element={<RequireAuth><Shell><AuditLogPage /></Shell></RequireAuth>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
