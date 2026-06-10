import { useState, useCallback, useEffect } from 'react';
import ChatInterface from './ChatInterface';
import HRPanel from './HRPanel';
import FAQEditor from './FAQEditor';

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: '⊞' },
  { id: 'staff', label: 'Staff List', icon: '◫' },
  { id: 'chat', label: 'AI Chatbot', icon: '◈' },
  { id: 'logs', label: 'Log History', icon: '≡' },
  { id: 'faq', label: 'FAQ Editor', icon: '✎' },
];

const PAGE_META = {
  dashboard: { title: 'HR Center', sub: 'Manage operations and automate workflows.' },
  staff: { title: 'Staff List', sub: 'View and manage employee records.' },
  chat: { title: 'AI Assistant', sub: 'Powered by ZUNO · connected to FAQ knowledge base.' },
  logs: { title: 'Log History', sub: 'System activity and workflow execution logs.' },
  faq: { title: 'FAQ Editor', sub: 'View, edit, and update FAQ database entries.' },
};

export default function Layout({ user, onLogout }) {
  const role = user?.role ?? 4;
  
  // Define allowed navigation tabs based on role:
  // 1 = admin, 2 = hr, 3 = IT, 4 = other
  const allowedIds =
    role === 1 || role === 2 ? ['dashboard', 'staff', 'chat', 'logs', 'faq'] :
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
  
  // Log filtering and sorting states
  const [logSearch, setLogSearch] = useState('');
  const [logFilterRole, setLogFilterRole] = useState('all');
  const [logFilterDept, setLogFilterDept] = useState('all');
  const [logFilterPwChanged, setLogFilterPwChanged] = useState('all');
  const [logSortBy, setLogSortBy] = useState('time-desc');

  const meta = PAGE_META[active] || PAGE_META['chat'];

  const onStaffLoaded = useCallback((data) => setStaff(data), []);

  const fetchStaff = async () => {
    try {
      const res = await fetch('http://localhost:5678/webhook/get-staff');
      if (res.ok) {
        const payload = await res.json();
        const data = payload?.data || (Array.isArray(payload) ? payload : []);
        setStaff(data);
      }
    } catch (e) {
      console.error('Error fetching staff in Layout:', e);
    }
  };

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
    fetchStaff();
  }, []);

  useEffect(() => {
    if (active === 'logs') {
      fetchLogs();
      fetchStaff();
    }
  }, [active]);

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  };

  const getRoleLabel = (r) => {
    switch (r) {
      case 1: return 'Admin';
      case 2: return 'HR';
      case 3: return 'IT';
      default: return user?.department || 'Staff';
    }
  };

  const getRoleBadgeLabel = (r) => {
    switch (r) {
      case 1: return 'System Admin';
      case 2: return 'HR Manager';
      case 3: return 'IT Support';
      default: return 'Staff Access';
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
        <div 
          className="sidebar-logo" 
          onClick={() => {
            if (allowedIds.includes('dashboard')) {
              setActive('dashboard');
            } else {
              setActive('chat');
            }
          }}
          style={{ cursor: 'pointer' }}
          title="Go to Home"
        >
          <img src="/images/ZUNO_white.png" alt="ZUNO" style={{ width: 42, height: 42, borderRadius: 8, objectFit: 'contain' }} />
          <span className="logo-text">ZUNO</span>
        </div>

        <nav className="sidebar-nav">
          {allowedIds.includes('chat') && (
            <div style={{ marginBottom: '20px', padding: '0 4px' }}>
              <button
                onClick={() => setActive('chat')}
                className={`zuno-ai-btn ${active === 'chat' ? 'active' : ''}`}
              >
                <img 
                  src="/images/ZUNO_white.png" 
                  className="icon-white" 
                  alt="ZUNO" 
                />
                <img 
                  src="/images/ZUNO_red.png" 
                  className="icon-red" 
                  alt="ZUNO" 
                />
                <span>ZUNO AI</span>
                <span className="ai-badge">AI</span>
              </button>
            </div>
          )}

          <div className="sidebar-label">Main Menu</div>
          {filteredNAV.filter(item => item.id !== 'chat').map(item => (
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
            <svg className="logout-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
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
          <div className="topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '0.95rem', color: '#000000', fontWeight: 600 }}>
                Welcome, <strong style={{ color: 'var(--red)', fontWeight: 800 }}>{user?.name}</strong>!
              </span>
              <div style={{ 
                width: '38px', 
                height: '38px', 
                borderRadius: '50%', 
                background: '#059794', 
                color: 'white', 
                fontSize: '0.9rem', 
                fontWeight: 700, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                userSelect: 'none',
                flexShrink: 0
              }} title={`${user?.name} (${getRoleLabel(role)})`}>
                {getInitials(user?.name)}
              </div>
            </div>
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
            <div style={{ display: active === 'chat' ? 'flex' : 'none', flexDirection: 'column', flex: 1, height: '100%', overflow: 'hidden' }}>
              <ChatInterface />
            </div>
          )}
          {allowedIds.includes('logs') && active === 'logs' && (
            <div className="table-wrap">
              <div className="table-header">
                <h3>Employee Session History</h3>
                <div className="flex gap-2">
                  <button className="btn btn-ghost" onClick={fetchLogs} disabled={logsLoading} style={{ fontSize: '0.8rem', padding: '7px 14px' }}>
                    {logsLoading ? '↺ Loading…' : '↺ Refresh'}
                  </button>
                </div>
              </div>

              {/* ── Search / Filter / Sort Toolbar for Logs ── */}
              {(() => {
                const logDeptOptions = [...new Set((staff || []).map(e => e.department).filter(Boolean))].sort();
                
                const filtered = logs
                  .filter(log => {
                    const q = logSearch.toLowerCase();
                    // Search
                    if (q && !(
                      String(log.employee_id).includes(q) ||
                      (log.name || '').toLowerCase().includes(q) ||
                      (log.email || '').toLowerCase().includes(q)
                    )) return false;

                    // Cross-reference employee in staff by email (most robust primary key)
                    const emp = staff.find(e => e.email && log.email && e.email.toLowerCase() === log.email.toLowerCase());

                    // Role Filter
                    if (logFilterRole !== 'all') {
                      const empRole = emp ? String(emp.role) : '4';
                      if (empRole !== logFilterRole) return false;
                    }

                    // Department Filter
                    if (logFilterDept !== 'all') {
                      const empDept = emp ? emp.department : '';
                      if (empDept !== logFilterDept) return false;
                    }

                    // Password changed filter
                    if (logFilterPwChanged !== 'all') {
                      const hasChanged = emp ? emp.needs_password_change === false : false;
                      if (logFilterPwChanged === 'yes' && !hasChanged) return false;
                      if (logFilterPwChanged === 'no' && hasChanged) return false;
                    }

                    return true;
                  })
                  .sort((a, b) => {
                    switch (logSortBy) {
                      case 'time-desc':
                        return new Date(b.login_time).getTime() - new Date(a.login_time).getTime();
                      case 'time-asc':
                        return new Date(a.login_time).getTime() - new Date(b.login_time).getTime();
                      case 'id-asc':
                        return (parseInt(a.employee_id) || 0) - (parseInt(b.employee_id) || 0);
                      case 'id-desc':
                        return (parseInt(b.employee_id) || 0) - (parseInt(a.employee_id) || 0);
                      case 'name-asc':
                        return (a.name || '').localeCompare(b.name || '');
                      case 'name-desc':
                        return (b.name || '').localeCompare(a.name || '');
                      default:
                        return 0;
                    }
                  });

                const logActiveFilters = logSearch || logFilterRole !== 'all' || logFilterDept !== 'all' || logFilterPwChanged !== 'all';
                const clearLogFilters = () => {
                  setLogSearch('');
                  setLogFilterRole('all');
                  setLogFilterDept('all');
                  setLogFilterPwChanged('all');
                };

                return (
                  <>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap',
                      padding: '10px 20px',
                      borderBottom: '1px solid var(--grey-light)',
                      background: '#fafbfc',
                    }}>
                      {/* Search */}
                      <div style={{ position: 'relative', flex: '1 1 180px', minWidth: '160px' }}>
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

                      {/* Role filter */}
                      <select value={logFilterRole} onChange={e => setLogFilterRole(e.target.value)} style={{ height: '32px', border: '1.5px solid #e2e8f0', borderRadius: '6px', padding: '0 8px', fontFamily: 'inherit', fontSize: '0.82rem', color: 'var(--navy)', background: 'white', cursor: 'pointer' }}>
                        <option value="all" style={{ color: '#059794', fontWeight: 'bold' }}>All Roles</option>
                        <option value="1">Admin</option>
                        <option value="2">HR</option>
                        <option value="3">IT</option>
                        <option value="4">Other</option>
                      </select>

                      {/* Department filter */}
                      <select value={logFilterDept} onChange={e => setLogFilterDept(e.target.value)} style={{ height: '32px', border: '1.5px solid #e2e8f0', borderRadius: '6px', padding: '0 8px', fontFamily: 'inherit', fontSize: '0.82rem', color: 'var(--navy)', background: 'white', cursor: 'pointer' }}>
                        <option value="all" style={{ color: '#059794', fontWeight: 'bold' }}>All Departments</option>
                        {logDeptOptions.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>

                      {/* Password Changed filter */}
                      <select value={logFilterPwChanged} onChange={e => setLogFilterPwChanged(e.target.value)} style={{ height: '32px', border: '1.5px solid #e2e8f0', borderRadius: '6px', padding: '0 8px', fontFamily: 'inherit', fontSize: '0.82rem', color: 'var(--navy)', background: 'white', cursor: 'pointer' }}>
                        <option value="all">Password: Any</option>
                        <option value="yes">Password Changed: Yes</option>
                        <option value="no">Password Changed: No</option>
                      </select>

                      {/* Sort */}
                      <select value={logSortBy} onChange={e => setLogSortBy(e.target.value)} style={{ height: '32px', border: '1.5px solid #e2e8f0', borderRadius: '6px', padding: '0 8px', fontFamily: 'inherit', fontSize: '0.82rem', color: 'var(--navy)', background: 'white', cursor: 'pointer' }}>
                        <option value="time-desc">Sort: Newer First</option>
                        <option value="time-asc">Sort: Older First</option>
                        <option value="id-asc">Sort: ID ↑</option>
                        <option value="id-desc">Sort: ID ↓</option>
                        <option value="name-asc">Sort: Name A–Z</option>
                        <option value="name-desc">Sort: Name Z–A</option>
                      </select>

                      {/* Clear filters */}
                      {logActiveFilters && (
                        <button onClick={clearLogFilters} style={{ height: '32px', padding: '0 12px', border: '1.5px solid #e2e8f0', borderRadius: '6px', background: 'white', fontFamily: 'inherit', fontSize: '0.82rem', color: 'var(--red)', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          × Clear
                        </button>
                      )}

                      <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: 'var(--grey)', whiteSpace: 'nowrap' }}>
                        {filtered.length} of {logs.length} session{logs.length !== 1 ? 's' : ''}
                      </span>
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
                        {logsLoading && logs.length === 0 ? (
                          <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--grey)', padding: 32 }}>Loading session logs…</td></tr>
                        ) : filtered.length === 0 && logs.length === 0 ? (
                          <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--grey)', padding: 32 }}>No session logs recorded yet.</td></tr>
                        ) : filtered.length === 0 ? (
                          <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--grey)', padding: 32 }}>No logs match your search or filters.</td></tr>
                        ) : (
                          filtered.map((log, i) => (
                            <tr key={i}>
                              <td style={{ fontWeight: 700, color: 'var(--grey)', fontSize: '0.8rem' }}>#{log.employee_id}</td>
                              <td style={{ fontWeight: 600 }}>{log.name}</td>
                              <td style={{ color: 'var(--grey)' }}>{log.email}</td>
                              <td>{formatTime(log.login_time)}</td>
                              <td>{formatTime(log.logout_time)}</td>
                              <td>{formatDuration(log.duration_minutes, log.logout_time)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </>
                );
              })()}
            </div>
          )}
          {allowedIds.includes('faq') && (
            <div style={{ display: active === 'faq' ? 'block' : 'none' }}>
              <FAQEditor />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
