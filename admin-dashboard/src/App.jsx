import React, { useEffect, useState } from 'react';
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
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const closeMenu = () => setMenuOpen(false);
  const navItems = [['/','Overview'],['/routes','Routes'],['/outlets','Outlets'],['/territories','Territories'],['/reps','Team'],['/products','Products'],['/reconciliation','Reconciliation'],['/audit-log','Audit log']];
  useEffect(() => { const onKeyDown = (event) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setCommandOpen(true); } if (event.key === 'Escape') setCommandOpen(false); }; window.addEventListener('keydown', onKeyDown); return () => window.removeEventListener('keydown', onKeyDown); }, []);
  const navigation = navItems.map(([to, label]) => <NavLink key={to} to={to} end={to === '/'} onClick={closeMenu}>{label}</NavLink>);
  const commands = navItems.filter(([, label]) => label.toLowerCase().includes(commandQuery.toLowerCase()));
  const runCommand = (to) => { navigate(to); setCommandOpen(false); setCommandQuery(''); closeMenu(); };
  return <div className="app-shell modern-shell"><aside className="sidebar"><NavLink className="brand" to="/" aria-label="Brandsphere home"><img className="brand-logo" src="/brandsphere-wordmark.png" alt="Brandsphere Marketing Agency" /></NavLink><span className="sidebar-label">WORKSPACE</span><nav className="sidebar-nav" aria-label="Dashboard">{navigation}</nav><div className="sidebar-footer"><div className="user-card"><span className="user-avatar">{(user?.name || 'M').slice(0, 1).toUpperCase()}</span><span><strong>{user?.name || 'Manager'}</strong><small>Manager account</small></span></div><button className="sidebar-action" onClick={() => setChangingPassword(true)}>Account security</button><button className="sidebar-action" onClick={() => { signOut(); navigate('/login'); }}>Sign out</button></div></aside><header className="mobile-header"><NavLink className="brand" to="/" aria-label="Brandsphere home" onClick={closeMenu}><img className="brand-logo" src="/brandsphere-wordmark.png" alt="Brandsphere Marketing Agency" /></NavLink><button className="nav-toggle" type="button" aria-expanded={menuOpen} aria-controls="dashboard-navigation" onClick={() => setMenuOpen((open) => !open)}><span aria-hidden="true">☰</span><span>{menuOpen ? 'Close' : 'Menu'}</span></button></header><nav id="dashboard-navigation" className={`mobile-nav ${menuOpen ? 'is-open' : ''}`} aria-label="Dashboard">{navigation}</nav><main className="workspace"><div className="workspace-top"><span><i />Live workspace</span><div><button className="command-trigger" onClick={() => setCommandOpen(true)}>Quick switch <kbd>⌘ K</kbd></button><button className="workspace-account" onClick={() => setChangingPassword(true)}>Account</button></div></div><div className="shell-content">{children}</div></main>{commandOpen && <div className="command-backdrop" onMouseDown={() => setCommandOpen(false)}><section className="command-palette" role="dialog" aria-modal="true" aria-label="Quick switch" onMouseDown={(event) => event.stopPropagation()}><div className="command-search"><span aria-hidden="true">⌕</span><input autoFocus value={commandQuery} onChange={(event) => setCommandQuery(event.target.value)} placeholder="Jump to a workspace…" /></div><div className="command-results">{commands.length ? commands.map(([to, label]) => <button key={to} onClick={() => runCommand(to)}><span>{label}</span><small>{to === '/' ? 'Overview' : `Go to ${label}`}</small></button>) : <p>No matching workspace.</p>}</div><small className="command-hint">Press Esc to close</small></section></div>}{changingPassword && <PasswordChangeDialog onClose={() => setChangingPassword(false)} />}</div>;
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
