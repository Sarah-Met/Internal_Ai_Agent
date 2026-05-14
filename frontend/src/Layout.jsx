import { useState, useCallback } from 'react';
import ChatInterface from './ChatInterface';
import HRPanel from './HRPanel';

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: '⊞' },
  { id: 'staff', label: 'Staff List', icon: '◫' },
  { id: 'chat', label: 'AI Chatbot', icon: '◈' },
  { id: 'logs', label: 'Log History', icon: '≡' },
];

const PAGE_META = {
  dashboard: { title: 'HR Center', sub: 'Manage operations and automate workflows.' },
  staff: { title: 'Staff List', sub: 'View and manage employee records.' },
  chat: { title: 'AI Assistant', sub: 'Powered by ZUNO · connected to FAQ knowledge base.' },
  logs: { title: 'Log History', sub: 'System activity and workflow execution logs.' },
};

export default function Layout() {
  const [active, setActive] = useState('dashboard');
  // Shared staff state — lives here so it never resets when switching tabs
  const [staff, setStaff] = useState([]);
  const meta = PAGE_META[active];

  const onStaffLoaded = useCallback((data) => setStaff(data), []);

  return (
    <>
      {/* ── Sidebar ── */}
      <div className="sidebar">
        <div className="sidebar-logo">
          <img src="/images/ZUNO_white.png" alt="ZUNO" style={{ width: 42, height: 42, borderRadius: 8, objectFit: 'contain' }} />
          <span className="logo-text">ZUNO</span>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-label">Main Menu</div>
          {NAV.map(item => (
            <div
              key={item.id}
              className={`nav-item ${active === item.id ? 'active' : ''}`}
              onClick={() => setActive(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </div>
          ))}

        </nav>

        <div className="sidebar-footer">
          <div className="nav-item">
            <span className="nav-icon">⚙</span>
            Settings
          </div>
        </div>
      </div>

      {/* ── Main ── */}
      <div className="main-content">
        {/* Top bar */}
        <div className="topbar">
          <span className="topbar-title">
            ZUNO &rsaquo; <span>{meta.title}</span>
          </span>
          <div className="topbar-actions">
            <span className="status-dot">n8n Connected</span>
          </div>
        </div>

        {/* Page header */}
        <div className="page-header">
          <h1>{meta.title}</h1>
          <p>{meta.sub}</p>
        </div>

        {/* Page body — keep all panels mounted, just hide inactive ones */}
        <div className="page-body">
          <div style={{ display: active === 'dashboard' ? 'block' : 'none' }}>
            <HRPanel view="dashboard" staff={staff} />
          </div>
          <div style={{ display: active === 'staff' ? 'block' : 'none' }}>
            <HRPanel view="staff" staff={staff} onStaffLoaded={onStaffLoaded} />
          </div>
          <div style={{ display: active === 'chat' ? 'block' : 'none' }}>
            <ChatInterface />
          </div>
          {active === 'logs' && (
            <div style={{ marginTop: 20, background: 'var(--white)', borderRadius: 'var(--radius)', padding: 32, border: '1px solid var(--grey-light)', color: 'var(--grey)', textAlign: 'center', fontSize: '0.9rem' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>≡</div>
              <p style={{ fontWeight: 700, color: 'var(--navy)', marginBottom: 6 }}>No logs yet</p>
              <p>System activity and workflow execution logs will appear here.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
