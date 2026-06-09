import { useState, useCallback, useEffect } from 'react';
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

export default function Layout({ user, onLogout }) {
  const role = user?.role ?? 4;
  
  // Define allowed navigation tabs based on role:
  // 1 = admin, 2 = hr, 3 = IT, 4 = other
  const allowedIds =
    role === 1 ? ['dashboard', 'staff', 'chat', 'logs'] :
    role === 2 ? ['dashboard', 'staff', 'chat'] :
    role === 3 ? ['chat', 'logs'] :
    ['chat'];

  const filteredNAV = NAV.filter(item => allowedIds.includes(item.id));

  const [active, setActive] = useState(() => {
    return filteredNAV[0]?.id || 'chat';
  });

  // Shared staff state — lives here so it never resets when switching tabs
  const [staff, setStaff] = useState([]);
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logSearch, setLogSearch] = useState('');
  const meta = PAGE_META[active] || PAGE_META['chat'];

  const onStaffLoaded = useCallback((data) => setStaff(data), []);

  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const res = await fetch('http://localhost:3000/auth/logs');
      if (res.ok) {
        const data = await res.json();
        setLogs(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('Error fetching logs:', e);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    if (active === 'logs') {
      fetchLogs();
    }
  }, [active]);

  const getRoleLabel = (r) => {
    switch (r) {
      case 1: return 'Admin';
      case 2: return 'HR';
      case 3: return 'IT';
      default: return user?.department || 'Staff';
    }
  };

  const formatTime = (isoString) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      const tz = 'Africa/Cairo';
      return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', timeZone: tz }) + ' ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: tz });
    } catch {
      return '—';
    }
  };

  const formatDuration = (mins, logoutTime) => {
    if (!logoutTime) {
      return (
        <span style={{ color: 'var(--teal)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--teal)', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
          Active Now
        </span>
      );
    }
    if (mins === undefined || mins === null) return '—';
    if (mins < 1) return '< 1m';
    const hrs = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return hrs > 0 ? `${hrs}h ${remainingMins}m` : `${remainingMins}m`;
  };

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
          {filteredNAV.map(item => (
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
          <div className="signout-btn" onClick={onLogout}>
            <span>Logout</span>
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
            <span style={{ fontSize: '0.8rem', color: 'var(--navy-mid)', fontWeight: 600, marginRight: '8px' }}>
              👤 {user?.name} ({getRoleLabel(role)})
            </span>
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
          {allowedIds.includes('dashboard') && (
            <div style={{ display: active === 'dashboard' ? 'block' : 'none' }}>
              <HRPanel view="dashboard" staff={staff} />
            </div>
          )}
          {allowedIds.includes('staff') && (
            <div style={{ display: active === 'staff' ? 'block' : 'none' }}>
              <HRPanel view="staff" staff={staff} onStaffLoaded={onStaffLoaded} />
            </div>
          )}
          {allowedIds.includes('chat') && (
            <div style={{ display: active === 'chat' ? 'block' : 'none' }}>
              <ChatInterface />
            </div>
          )}
          {allowedIds.includes('logs') && active === 'logs' && (
            <div className="table-wrap">
              <div className="table-header">
                <h3>Employee Session History</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                <button className="btn btn-ghost" onClick={fetchLogs} disabled={logsLoading} style={{ fontSize: '0.8rem', padding: '7px 14px' }}>
                  {logsLoading ? '↺ Loading…' : '↺ Refresh'}
                </button>
                <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: '320px' }}>
                  <svg style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                  <input
                    type="text"
                    placeholder="Search by ID, name, or email…"
                    value={logSearch}
                    onChange={e => setLogSearch(e.target.value)}
                    style={{
                      width: '100%', paddingLeft: '30px', paddingRight: '10px',
                      height: '32px', border: '1.5px solid #e2e8f0', borderRadius: '6px',
                      fontFamily: 'inherit', fontSize: '0.82rem', color: 'var(--navy)',
                      background: 'white', outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>
              </div>

              <table>
                <thead>
                  <tr>
                    <th>Employee ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Login Time</th>
                    <th>Logout Time</th>
                    <th>Time Spent Working</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const q = logSearch.toLowerCase();
                    const filtered = q ? logs.filter(l =>
                      String(l.employee_id).includes(q) ||
                      (l.name || '').toLowerCase().includes(q) ||
                      (l.email || '').toLowerCase().includes(q)
                    ) : logs;
                    if (logsLoading && logs.length === 0) return <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--grey)', padding: 32 }}>Loading session logs…</td></tr>;
                    if (filtered.length === 0 && logs.length === 0) return <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--grey)', padding: 32 }}>No session logs recorded yet.</td></tr>;
                    if (filtered.length === 0) return <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--grey)', padding: 32 }}>No logs match your search.</td></tr>;
                    return filtered.map((log, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 700, color: 'var(--grey)', fontSize: '0.8rem' }}>#{log.employee_id}</td>
                      <td style={{ fontWeight: 600 }}>{log.name}</td>
                      <td style={{ color: 'var(--grey)' }}>{log.email}</td>
                      <td>{formatTime(log.login_time)}</td>
                      <td>{formatTime(log.logout_time)}</td>
                      <td>{formatDuration(log.duration_minutes, log.logout_time)}</td>
                    </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
