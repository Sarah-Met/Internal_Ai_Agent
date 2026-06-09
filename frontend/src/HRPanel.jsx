import React, { useState, useEffect } from 'react';

const webhooks = {
  'gen-details':    'http://localhost:5678/webhook/gen-details',
  'gen-attendance': 'http://localhost:5678/webhook/gen-attendance',
  'email':          'http://localhost:5678/webhook/send-email',
  'announce':       'http://localhost:5678/webhook/broadcast',
  'add':            'http://localhost:5678/webhook/add-employee',
  'update':         'http://localhost:5678/webhook/update-employee',
  'delete':         'http://localhost:5678/webhook/delete-employee',
  'get-staff':      'http://localhost:5678/webhook/get-staff',
};

/* ─── Modal ─── */
function Modal({ config, onClose, onSuccess, onOptimisticDelete, staffList = [] }) {
  const [fields, setFields] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (config && config.initialData) {
      setFields({
        f1: config.initialData.employee_id || '',
        f2: config.initialData.name || '',
        f3: config.initialData.department || '',
        f4: config.initialData.email || '',
        f5: config.initialData.password || '',
        f6: config.initialData.role || '4'
      });
    } else {
      setFields({ f6: '4' });
    }
  }, [config]);

  if (!config) return null;

  const handleConfirmDelete = async () => {
    const deletedId = config.empId;
    setLoading(true);
    try {
      const res = await fetch(webhooks['delete'], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: deletedId }),
      });
      if (!res.ok) throw new Error();

      // Optimistically remove the employee from the list immediately
      if (onOptimisticDelete) onOptimisticDelete(deletedId);
      onClose();

      // Poll until the DB confirms the employee is gone
      const pollForDeletion = async (attempts = 0) => {
        if (attempts >= 4) {
          // Fallback: just do a normal refresh
          if (onSuccess) onSuccess();
          return;
        }
        const delay = (attempts + 1) * 2000; // 2s, 4s, 6s, 8s
        setTimeout(async () => {
          try {
            const pollRes = await fetch(webhooks['get-staff']);
            if (!pollRes.ok) return pollForDeletion(attempts + 1);
            const pollPayload = await pollRes.json();
            const data = pollPayload?.data || (Array.isArray(pollPayload) ? pollPayload : []);
            // Check if the deleted employee is gone from DB
            const stillExists = data.some(e => String(e.employee_id) === String(deletedId));
            if (!stillExists) {
              // Confirmed gone — sync the full list from DB
              if (onSuccess) onSuccess();
            } else {
              // Still in DB — retry
              pollForDeletion(attempts + 1);
            }
          } catch {
            pollForDeletion(attempts + 1);
          }
        }, delay);
      };
      pollForDeletion();
    } catch {
      alert('Error connecting to n8n workflow. Check that n8n is running.');
    } finally {
      setLoading(false);
    }
  };

  if (config.type === 'confirm-delete') {
    return (
      <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="modal">
          <p className="modal-title" style={{color: 'var(--red)'}}>{config.title}</p>
          <p className="modal-sub" style={{ color: '#000', fontSize: '0.95rem' }}>
            Are you sure you want to permanently delete <strong style={{ color: 'var(--red)' }}>{config.empName}</strong>? This action cannot be undone.
          </p>
          <div className="modal-btns">
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={handleConfirmDelete} disabled={loading}>
              {loading ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async () => {
    setLoading(true);
    let payload = {};
    try {
      if (config.type === 'email') {
        payload = { email: fields.f1, message: fields.f2 };
      } else if (config.type === 'announce') {
        payload = { headline: fields.f1, details: fields.f2 };
      } else if (config.type === 'delete') {
        payload = { employee_id: fields.f1 };
      } else if (config.type === 'add') {
        const list = staffList || [];
        const nextId = (list.reduce((max, e) => Math.max(max, parseInt(e.employee_id) || 0), 0) + 1).toString();
        payload = { 
          employee_id: nextId, 
          name: fields.f2, 
          department: fields.f3, 
          email: fields.f4, 
          password: fields.f5,
          role: Number(fields.f6)
        };
      } else {
        payload = { 
          employee_id: fields.f1, 
          name: fields.f2, 
          department: fields.f3, 
          email: fields.f4, 
          password: fields.f5,
          role: Number(fields.f6)
        };
      }

      const res = await fetch(webhooks[config.type], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      alert('Operation completed successfully.');
      if (onSuccess) onSuccess();
      onClose();
    } catch {
      alert('Error connecting to n8n workflow. Check that n8n is running.');
    } finally {
      setLoading(false);
    }
  };

  const inp = (key, placeholder, type = 'text', disabled = false) => (
    <div className="modal-field" key={key}>
      <label>{placeholder}</label>
      <input type={type} placeholder={`Enter ${placeholder.toLowerCase()}…`} value={fields[key] || ''} onChange={e => setFields(p => ({ ...p, [key]: e.target.value }))} disabled={disabled} style={disabled ? { opacity: 0.6, cursor: 'not-allowed' } : {}} />
    </div>
  );

  const ta = (key, placeholder) => (
    <div className="modal-field" key={key}>
      <label>{placeholder}</label>
      <textarea rows={3} placeholder={`Enter ${placeholder.toLowerCase()}…`} value={fields[key] || ''} onChange={e => setFields(p => ({ ...p, [key]: e.target.value }))} />
    </div>
  );

  const roleSelect = (key) => (
    <div className="modal-field" key={key}>
      <label>Role</label>
      <select 
        value={fields[key] || '4'} 
        onChange={e => setFields(p => ({ ...p, [key]: e.target.value }))}
        style={{
          width: '100%',
          padding: '10px 14px',
          border: '1.5px solid var(--grey-light)',
          borderRadius: 'var(--radius-sm)',
          fontFamily: 'inherit',
          fontSize: '0.875rem',
          color: 'var(--navy)',
          background: 'var(--off-white)',
          outline: 'none'
        }}
      >
        <option value="1">Admin (Role 1)</option>
        <option value="2">HR (Role 2)</option>
        <option value="3">IT (Role 3)</option>
        <option value="4">Other Department (Role 4)</option>
      </select>
    </div>
  );

  let body;
  if (config.type === 'email')    body = <>{inp('f1','Recipient Email','email')}{ta('f2','Message')}</>;
  else if (config.type === 'announce') body = <>{inp('f1','Headline')}{ta('f2','Details')}</>;
  else if (config.type === 'delete')   body = <><p className="text-sm text-grey mb-4">This action permanently removes the employee record.</p>{inp('f1','Employee ID')}</>;
  else if (config.type === 'add')      body = <>{inp('f2','Full Name')}{inp('f3','Department')}{inp('f4','Email','email')}{inp('f5','Password','password')}{roleSelect('f6')}</>;
  else if (config.type === 'update')   body = <>{inp('f1','Employee ID', 'text', true)}{inp('f2','Full Name')}{inp('f3','Department')}{inp('f4','Email','email')}{inp('f5','Password','password')}{roleSelect('f6')}</>;
  else                                 body = <>{inp('f1','Employee ID')}{inp('f2','Full Name')}{inp('f3','Department')}{inp('f4','Email','email')}{inp('f5','Password','password')}{roleSelect('f6')}</>;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <p className="modal-title">{config.title}</p>
        <p className="modal-sub">Fill in the fields and click Submit to trigger the automation workflow.</p>
        {body}
        <div className="modal-btns">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Running…' : 'Submit →'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Metric Row ─── */
function Metrics({ metrics }) {
  const items = [
    { label: 'Total Employees', value: metrics?.totalEmployees !== null && metrics?.totalEmployees !== undefined ? String(metrics.totalEmployees) : '—',  sub: 'From database' },
    { label: 'AI Queries Today', value: metrics?.aiQueriesToday !== null && metrics?.aiQueriesToday !== undefined ? String(metrics.aiQueriesToday) : '—',  sub: 'Chatbot sessions' },
    { label: 'Reports Generated', value: metrics?.reportsGenerated !== null && metrics?.reportsGenerated !== undefined ? String(metrics.reportsGenerated) : '—', sub: 'This month' },
  ];
  return (
    <div className="grid mb-5">
      {items.map((m, i) => (
        <div className="metric-card" key={i}>
          <div className="metric-label">{m.label}</div>
          <div className="metric-value">{m.value}</div>
          <div className="metric-sub">{m.sub}</div>
        </div>
      ))}
    </div>
  );
}

const CARDS = [
  // Reports — Red (primary brand action)
  { type: 'gen-details',    label: 'Employee Details',  desc: 'Export full staff profile reports.',     icon: '◫', color: 'red',  btnClass: 'btn-primary',     btnLabel: 'Generate →', dl: { filename: 'Staff_Report.xlsx' } },
  { type: 'gen-attendance', label: 'Attendance Report', desc: 'Pull monthly attendance logs.',          icon: '☑', color: 'red',  btnClass: 'btn-primary',     btnLabel: 'Generate →', dl: { filename: 'Attendance_Report.xlsx' } },
  // Communication — Navy
  { type: 'email',          label: 'Send Email',        desc: 'Direct email to a specific employee.',  icon: '✉', color: 'navy', btnClass: 'btn-navy',        btnLabel: 'Compose',    modal: true },
  { type: 'announce',       label: 'Broadcast',         desc: 'Send company-wide announcements.',      icon: '⊛', color: 'navy', btnClass: 'btn-navy',        btnLabel: 'Announce',   modal: true },
];

const MODAL_TITLES = {
  email: 'Compose Email', announce: 'Broadcast Message',
  add: 'New Hire', update: 'Edit Employee', delete: 'Remove Employee',
};

/* ─── Main Export ─── */
export default function HRPanel({ view, staff = [], onStaffLoaded }) {
  const [modal, setModal] = useState(null);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffError, setStaffError] = useState(null);
  const [dlLoading, setDlLoading] = useState(null);
  const [editingRowId, setEditingRowId] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [editLoading, setEditLoading] = useState(false);

  const [metrics, setMetrics] = useState({
    totalEmployees: null,
    aiQueriesToday: null,
    reportsGenerated: null
  });

  const fetchMetrics = async () => {
    try {
      const res = await fetch('http://localhost:3000/auth/metrics');
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch (err) {
      console.error('Error fetching metrics:', err);
    }
  };

  useEffect(() => {
    if (view === 'dashboard') {
      fetchMetrics();
    }
  }, [view, staff.length]);

  const [isAddingInline, setIsAddingInline] = useState(false);
  const [addFormData, setAddFormData] = useState({});
  const [addLoading, setAddLoading] = useState(false);
  const [passwordReminder, setPasswordReminder] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Search / Filter / Sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterDept, setFilterDept] = useState('all');
  const [filterPwChanged, setFilterPwChanged] = useState('all');
  const [sortBy, setSortBy] = useState('id-asc');

  const generateRandomPassword = () => {
    // Excluded ambiguous characters (l, I, 1, o, O, 0)
    const chars = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNOPQRSTUVWXYZ23456789';
    let pass = '';
    for (let i = 0; i < 8; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  };

  const handleInitAddInline = () => {
    setIsAddingInline(true);
    setAddFormData({
      name: '',
      role: 4,
      department: '',
      email: '',
      password: generateRandomPassword()
    });
  };

  const handleSaveAdd = async () => {
    if (!addFormData.name || !addFormData.email || !addFormData.password) {
      alert('Please enter Name, Email, and Password.');
      return;
    }
    setAddLoading(true);
    try {
      const list = staff || [];
      const nextId = (list.reduce((max, e) => Math.max(max, parseInt(e.employee_id) || 0), 0) + 1).toString();
      const payload = {
        employee_id: nextId,
        name: addFormData.name,
        department: addFormData.department,
        email: addFormData.email,
        password: addFormData.password,
        role: Number(addFormData.role || 4)
      };

      const res = await fetch(webhooks['add'], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();

      // Optimistically update the UI instantly
      if (onStaffLoaded) {
        onStaffLoaded([
          ...staff,
          {
            employee_id: nextId,
            name: addFormData.name,
            department: addFormData.department,
            email: addFormData.email,
            role: Number(addFormData.role || 4),
            needs_password_change: true
          }
        ]);
      }

      // Capture values before clearing form state
      const savedEmail = addFormData.email;
      const savedPassword = addFormData.password;
      const savedName = addFormData.name;

      setIsAddingInline(false);
      setAddFormData({});

      // Show HR the reminder to send the password to the new employee
      setPasswordReminder({ name: savedName, password: savedPassword });

      // Poll until the new employee appears in the DB (n8n may take a moment to commit)
      const pollForNewEmployee = async (attempts = 0) => {
        if (attempts >= 4) return; // Give up after 4 tries (~8 seconds total)
        const delay = (attempts + 1) * 2000; // 2s, 4s, 6s, 8s
        setTimeout(async () => {
          try {
            const pollRes = await fetch(webhooks['get-staff']);
            if (!pollRes.ok) return pollForNewEmployee(attempts + 1);
            const pollPayload = await pollRes.json();
            const data = pollPayload?.data || (Array.isArray(pollPayload) ? pollPayload : []);
            // Only replace the list if the new employee is confirmed in the DB response
            const confirmed = data.some(e =>
              e.employee_id === nextId ||
              (e.email && e.email === savedEmail)
            );
            if (confirmed) {
              if (onStaffLoaded) onStaffLoaded(data);
            } else {
              // Not found yet — keep optimistic entry and retry
              pollForNewEmployee(attempts + 1);
            }
          } catch {
            // Network error — retry
            pollForNewEmployee(attempts + 1);
          }
        }, delay);
      };
      pollForNewEmployee();
    } catch {
      alert('Error connecting to n8n workflow. Check that n8n is running.');
    } finally {
      setAddLoading(false);
    }
  };

  const handleEditClick = (emp) => {
    setEditingRowId(emp.employee_id);
    setEditFormData({ ...emp });
  };

  const handleCancelEdit = () => {
    setEditingRowId(null);
    setEditFormData({});
  };

  const handleSaveEdit = async () => {
    setEditLoading(true);
    try {
      const payload = {
        employee_id: editFormData.employee_id,
        name: editFormData.name,
        department: editFormData.department,
        email: editFormData.email,
        password: editFormData.password,
        role: Number(editFormData.role || 4)
      };
      const res = await fetch(webhooks['update'], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();

      // Optimistically update the UI instantly
      if (onStaffLoaded) {
        onStaffLoaded(staff.map(emp => 
          emp.employee_id === editFormData.employee_id ? { ...emp, ...payload } : emp
        ));
      }

      setEditingRowId(null);
      
      // Sync in background after a short delay for n8n execution
      setTimeout(() => {
        fetchStaff();
      }, 1500);
    } catch {
      alert('Error connecting to n8n workflow. Check that n8n is running.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteClick = (emp) => {
    setModal({ type: 'confirm-delete', title: 'Delete Employee', empId: emp.employee_id, empName: emp.name });
  };

  const handleOptimisticDelete = (deletedId) => {
    if (onStaffLoaded) {
      onStaffLoaded(staff.filter(e => String(e.employee_id) !== String(deletedId)));
    }
    setModal(null);
  };

  const fetchStaff = async () => {
    setStaffLoading(true);
    setStaffError(null);
    try {
      const res = await fetch(webhooks['get-staff']);
      if (!res.ok) throw new Error('Failed to load data');
      const payload = await res.json();
      const data = payload?.data || (Array.isArray(payload) ? payload : []);
      if (onStaffLoaded) onStaffLoaded(data);
    } catch (err) {
      setStaffError('Could not load staff data. Try again.');
    } finally {
      setStaffLoading(false);
    }
  };

  const downloadReport = async (type, filename) => {
    setDlLoading(type);
    try {
      const res = await fetch(webhooks[type], { method: 'POST' });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename; a.click();
      window.URL.revokeObjectURL(url);

      try {
        await fetch('http://localhost:3000/auth/log-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reportType: type }),
        });
        fetchMetrics();
      } catch (err) {
        console.error('Error logging report:', err);
      }
    } catch {
      alert('Failed to generate report. Is n8n active?');
    } finally {
      setDlLoading(null);
    }
  };

  const formatTime = (isoString) => {
    if (!isoString) return 'Never';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: '2-digit' }) + ' ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });
    } catch {
      return 'Never';
    }
  };

  const getRoleBadgeClass = (roleNum) => {
    switch (roleNum) {
      case 1: return 'badge-teal';
      case 2: return 'badge-teal';
      default: return 'badge-grey';
    }
  };

  const getRoleName = (roleNum) => {
    switch (roleNum) {
      case 1: return 'Admin';
      case 2: return 'HR';
      case 3: return 'IT';
      default: return 'Other';
    }
  };

  /* ── Staff List View ── */
  if (view === 'staff') {
    // Build unique department list for filter dropdown
    const deptOptions = [...new Set((staff || []).map(e => e.department).filter(Boolean))].sort();

    // Apply search + filters + sort
    const filteredStaff = (staff || [])
      .filter(e => {
        const q = searchQuery.toLowerCase();
        if (q && !(
          String(e.employee_id).includes(q) ||
          (e.name || '').toLowerCase().includes(q) ||
          (e.email || '').toLowerCase().includes(q)
        )) return false;
        if (filterRole !== 'all' && String(e.role) !== filterRole) return false;
        if (filterDept !== 'all' && e.department !== filterDept) return false;
        if (filterPwChanged === 'yes' && e.needs_password_change !== false) return false;
        if (filterPwChanged === 'no'  && e.needs_password_change === false) return false;
        return true;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'id-asc':   return (parseInt(a.employee_id) || 0) - (parseInt(b.employee_id) || 0);
          case 'id-desc':  return (parseInt(b.employee_id) || 0) - (parseInt(a.employee_id) || 0);
          case 'name-asc': return (a.name || '').localeCompare(b.name || '');
          case 'name-desc':return (b.name || '').localeCompare(a.name || '');
          default: return 0;
        }
      });

    const activeFilters = searchQuery || filterRole !== 'all' || filterDept !== 'all' || filterPwChanged !== 'all';
    const clearFilters = () => { setSearchQuery(''); setFilterRole('all'); setFilterDept('all'); setFilterPwChanged('all'); };
    return (
      <>
        <div className="table-wrap">
          <div className="table-header">
            <h3>Employee Records</h3>
            <div className="flex gap-2">
              <button className="btn btn-ghost" onClick={fetchStaff} disabled={staffLoading} style={{ fontSize: '0.8rem', padding: '7px 14px' }}>
                {staffLoading ? '↺ Loading…' : '↺ Refresh'}
              </button>
              <button className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '7px 14px' }} onClick={handleInitAddInline}>
                + Add Staff
              </button>
            </div>
          </div>

          {/* ── Search / Filter / Sort Toolbar ── */}
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
                placeholder="Search by name, ID, or email…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%', paddingLeft: '30px', paddingRight: '10px',
                  height: '32px', border: '1.5px solid #e2e8f0', borderRadius: '6px',
                  fontFamily: 'inherit', fontSize: '0.82rem', color: 'var(--navy)',
                  background: 'white', outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Role filter */}
            <select value={filterRole} onChange={e => setFilterRole(e.target.value)} style={{ height: '32px', border: '1.5px solid #e2e8f0', borderRadius: '6px', padding: '0 8px', fontFamily: 'inherit', fontSize: '0.82rem', color: 'var(--navy)', background: 'white', cursor: 'pointer' }}>
              <option value="all" style={{ color: '#059794', fontWeight: 'bold' }}>All Roles</option>
              <option value="1">Admin</option>
              <option value="2">HR</option>
              <option value="3">IT</option>
              <option value="4">Other</option>
            </select>

            {/* Department filter */}
            <select value={filterDept} onChange={e => setFilterDept(e.target.value)} style={{ height: '32px', border: '1.5px solid #e2e8f0', borderRadius: '6px', padding: '0 8px', fontFamily: 'inherit', fontSize: '0.82rem', color: 'var(--navy)', background: 'white', cursor: 'pointer' }}>
              <option value="all" style={{ color: '#059794', fontWeight: 'bold' }}>All Departments</option>
              {deptOptions.map(d => <option key={d} value={d}>{d}</option>)}
            </select>

            {/* Password Changed filter */}
            <select value={filterPwChanged} onChange={e => setFilterPwChanged(e.target.value)} style={{ height: '32px', border: '1.5px solid #e2e8f0', borderRadius: '6px', padding: '0 8px', fontFamily: 'inherit', fontSize: '0.82rem', color: 'var(--navy)', background: 'white', cursor: 'pointer' }}>
              <option value="all">Password: Any</option>
              <option value="yes">Password Changed: Yes</option>
              <option value="no">Password Changed: No</option>
            </select>

            {/* Sort */}
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ height: '32px', border: '1.5px solid #e2e8f0', borderRadius: '6px', padding: '0 8px', fontFamily: 'inherit', fontSize: '0.82rem', color: 'var(--navy)', background: 'white', cursor: 'pointer' }}>
              <option value="id-asc">Sort: ID ↑</option>
              <option value="id-desc">Sort: ID ↓</option>
              <option value="name-asc">Sort: Name A–Z</option>
              <option value="name-desc">Sort: Name Z–A</option>
            </select>

            {/* Clear filters */}
            {activeFilters && (
              <button onClick={clearFilters} style={{ height: '32px', padding: '0 12px', border: '1.5px solid #e2e8f0', borderRadius: '6px', background: 'white', fontFamily: 'inherit', fontSize: '0.82rem', color: 'var(--red)', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>
                × Clear
              </button>
            )}

            <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: 'var(--grey)', whiteSpace: 'nowrap' }}>
              {filteredStaff.length} of {staff.length} employee{staff.length !== 1 ? 's' : ''}
            </span>
          </div>


          {staffError && (
            <div style={{ padding: '16px 20px', color: 'var(--red)', fontSize: '0.85rem', background: 'rgba(253,45,48,0.06)', borderBottom: '1px solid rgba(253,45,48,0.15)' }}>
              ⚠ {staffError}
            </div>
          )}

          {passwordReminder && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: '14px',
              padding: '14px 20px',
              background: 'linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(245,158,11,0.03) 100%)',
              borderBottom: '1px solid rgba(245,158,11,0.25)',
              borderLeft: '4px solid #F59E0B',
            }}>
              <div style={{ fontSize: '20px', lineHeight: 1 }}>⚠️</div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 700, fontSize: '0.85rem', color: '#92400E', margin: 0 }}>
                  Action Required — Send Temporary Password
                </p>
                <p style={{ fontSize: '0.78rem', color: '#78350F', margin: '4px 0 8px', lineHeight: 1.5 }}>
                  <strong>{passwordReminder.name}</strong> has been added. Please copy and send the temporary password below to them directly. They will be prompted to change it on first login.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <code style={{
                    background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)',
                    borderRadius: '6px', padding: '5px 12px',
                    fontFamily: 'monospace', fontSize: '1rem', fontWeight: 700,
                    color: '#92400E', letterSpacing: '2px',
                  }}>{passwordReminder.password}</code>
                  <button
                    onClick={() => { navigator.clipboard.writeText(passwordReminder.password); }}
                    style={{
                      background: '#F59E0B', color: '#fff', border: 'none',
                      borderRadius: '6px', padding: '5px 12px', fontSize: '0.78rem',
                      fontWeight: 600, cursor: 'pointer',
                    }}
                  >Copy</button>
                  <button
                    onClick={() => setPasswordReminder(null)}
                    style={{
                      background: 'transparent', color: '#92400E', border: '1px solid rgba(245,158,11,0.4)',
                      borderRadius: '6px', padding: '5px 12px', fontSize: '0.78rem',
                      fontWeight: 600, cursor: 'pointer',
                    }}
                  >Dismiss</button>
                </div>
              </div>
            </div>
          )}

          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Role</th>
                <th>Department</th>
                <th>Email</th>
                <th>{isAddingInline ? 'Generated Password' : 'Password Changed'}</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isAddingInline && (
                <tr className="inline-add-row" style={{ borderLeft: '4px solid #059794' }}>
                  <td style={{ background: '#E0F7FA', borderBottom: '1px solid #B2EBF2', fontWeight: 700, color: 'var(--grey)', fontSize: '0.8rem' }}>#New</td>
                  <td style={{ background: '#E0F7FA', borderBottom: '1px solid #B2EBF2' }}>
                    <input 
                      type="text" 
                      className="inline-input" 
                      placeholder="Full Name" 
                      value={addFormData.name || ''} 
                      onChange={e => setAddFormData({...addFormData, name: e.target.value})} 
                    />
                  </td>
                  <td style={{ background: '#E0F7FA', borderBottom: '1px solid #B2EBF2' }}>
                    <select 
                      className="inline-input" 
                      value={addFormData.role || '4'} 
                      onChange={e => setAddFormData({...addFormData, role: Number(e.target.value)})}
                    >
                      <option value="1">Admin</option>
                      <option value="2">HR</option>
                      <option value="3">IT</option>
                      <option value="4">Other</option>
                    </select>
                  </td>
                  <td style={{ background: '#E0F7FA', borderBottom: '1px solid #B2EBF2' }}>
                    <input 
                      type="text" 
                      className="inline-input" 
                      placeholder="Department" 
                      value={addFormData.department || ''} 
                      onChange={e => setAddFormData({...addFormData, department: e.target.value})} 
                    />
                  </td>
                  <td style={{ background: '#E0F7FA', borderBottom: '1px solid #B2EBF2' }}>
                    <input 
                      type="text" 
                      className="inline-input" 
                      placeholder="Email" 
                      value={addFormData.email || ''} 
                      onChange={e => setAddFormData({...addFormData, email: e.target.value})} 
                    />
                  </td>
                  <td style={{ background: '#E0F7FA', borderBottom: '1px solid #B2EBF2' }}>
                    <input 
                      type="text" 
                      className="inline-input" 
                      value={addFormData.password || ''} 
                      readOnly
                      title="Temporary Password (HR must copy and give to new employee)"
                      style={{ fontWeight: 'bold', letterSpacing: '0.5px', color: 'var(--navy-mid)', cursor: 'text' }}
                    />
                  </td>
                  <td style={{ background: '#E0F7FA', borderBottom: '1px solid #B2EBF2', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button className="btn btn-ghost" style={{ padding: '5px 10px', fontSize: '0.8rem', background: 'white' }} onClick={() => setIsAddingInline(false)} disabled={addLoading}>Cancel</button>
                      <button className="btn btn-teal" style={{ padding: '5px 10px', fontSize: '0.8rem' }} onClick={handleSaveAdd} disabled={addLoading}>{addLoading ? 'Saving...' : 'Save'}</button>
                    </div>
                  </td>
                </tr>
              )}
              {filteredStaff.length === 0 && staffLoading ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', color: 'var(--grey)', padding: 32 }}>Loading staff data…</td></tr>
              ) : filteredStaff.length === 0 && staff.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', color: 'var(--grey)', padding: 32 }}>Press Refresh to load employees.</td></tr>
              ) : filteredStaff.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', color: 'var(--grey)', padding: 32 }}>No employees match your search or filters.</td></tr>
              ) : filteredStaff.map((emp, i) => {
                const isEditing = editingRowId === emp.employee_id;
                return (
                  <tr key={i}>
                    <td style={{ fontWeight: 700, color: 'var(--grey)', fontSize: '0.8rem' }}>#{emp.employee_id || '—'}</td>
                    {isEditing ? (
                      <>
                        <td>
                          <input type="text" className="inline-input" value={editFormData.name || ''} onChange={e => setEditFormData({...editFormData, name: e.target.value})} />
                        </td>
                        <td>
                          <select 
                            className="inline-input" 
                            value={editFormData.role || '4'} 
                            onChange={e => setEditFormData({...editFormData, role: Number(e.target.value)})}
                          >
                            <option value="1">Admin</option>
                            <option value="2">HR</option>
                            <option value="3">IT</option>
                            <option value="4">Other</option>
                          </select>
                        </td>
                        <td>
                          <input type="text" className="inline-input" value={editFormData.department || ''} onChange={e => setEditFormData({...editFormData, department: e.target.value})} />
                        </td>
                        <td>
                          <input type="text" className="inline-input" value={editFormData.email || ''} onChange={e => setEditFormData({...editFormData, email: e.target.value})} />
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={{ fontWeight: 600 }}>{emp.name || '—'}</td>
                        <td style={
                          emp.role === 1 ? { color: '#059794', fontWeight: '700' } :
                          emp.role === 2 ? { color: '#059794', fontWeight: '700' } :
                          emp.role === 3 ? { color: 'var(--navy-mid)', fontWeight: '600' } :
                          { color: 'var(--grey)', fontWeight: '500' }
                        }>
                          {getRoleName(emp.role)}
                        </td>
                        <td>{emp.department || '—'}</td>
                        <td style={{ color: 'var(--grey)' }}>{emp.email || '—'}</td>
                      </>
                    )}
                    <td>
                      {emp.needs_password_change === false ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#059669', fontWeight: '600', fontSize: '0.85rem' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }}></span>
                          Yes
                        </span>
                      ) : (
                        <div style={{ display: 'inline-flex', flexDirection: 'row', alignItems: 'center', gap: '8px', flexWrap: 'nowrap' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#E11D48', fontWeight: '700', fontSize: '0.85rem', flexShrink: 0 }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#F43F5E', display: 'inline-block', flexShrink: 0 }}></span>
                            No
                          </span>
                          {emp.password && !emp.password.startsWith('$2') && (
                            <>
                              <div style={{
                                display: 'inline-flex', alignItems: 'center',
                                background: '#f8fafc',
                                border: '1.5px solid #e2e8f0',
                                borderRadius: '6px',
                                padding: '4px 10px',
                                fontFamily: 'inherit',
                                fontSize: '0.9rem',
                                fontWeight: '600',
                                color: 'var(--navy)',
                                letterSpacing: '0.3px',
                              }}>
                                {emp.password}
                              </div>
                              <div style={{ position: 'relative', display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
                                <button
                                  title="Copy to clipboard"
                                  onClick={() => {
                                    navigator.clipboard.writeText(emp.password);
                                    setCopiedId(emp.employee_id);
                                    setTimeout(() => setCopiedId(null), 2000);
                                  }}
                                  style={{
                                    background: copiedId === emp.employee_id ? 'var(--teal)' : '#f1f5f9',
                                    border: '1.5px solid ' + (copiedId === emp.employee_id ? 'var(--teal)' : '#e2e8f0'),
                                    borderRadius: '6px',
                                    padding: '5px 7px',
                                    cursor: 'pointer',
                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                    transition: 'all 0.2s ease',
                                    flexShrink: 0,
                                  }}
                                >
                                  {copiedId === emp.employee_id ? (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                      <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                  ) : (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                    </svg>
                                  )}
                                </button>
                                {copiedId === emp.employee_id && (
                                  <div style={{
                                    position: 'absolute',
                                    top: 'calc(100% + 7px)',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    background: 'var(--teal)',
                                    color: '#fff',
                                    fontSize: '0.72rem',
                                    fontWeight: 600,
                                    padding: '3px 9px',
                                    borderRadius: '20px',
                                    whiteSpace: 'nowrap',
                                    zIndex: 10,
                                    pointerEvents: 'none',
                                    boxShadow: '0 2px 8px rgba(0,172,193,0.3)',
                                    animation: 'fadeIn 0.15s ease',
                                  }}>
                                    Copied
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        {isEditing ? (
                          <>
                            <button className="btn btn-ghost" style={{ padding: '5px 10px', fontSize: '0.8rem' }} onClick={handleCancelEdit} disabled={editLoading}>Cancel</button>
                            <button className="btn btn-teal" style={{ padding: '5px 10px', fontSize: '0.8rem' }} onClick={handleSaveEdit} disabled={editLoading}>{editLoading ? 'Saving...' : 'Save'}</button>
                          </>
                        ) : (
                          <>
                            <button className="btn btn-teal" style={{ padding: '5px 10px', fontSize: '0.8rem' }} onClick={() => handleEditClick(emp)} title="Edit">✎ Edit</button>
                            <button className="btn btn-primary" style={{ width: '30px', height: '30px', padding: 0, display: 'inline-flex', justifyContent: 'center', alignItems: 'center', borderRadius: '4px' }} onClick={() => handleDeleteClick(emp)} title="Delete">✕</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <Modal config={modal} onClose={() => setModal(null)} onSuccess={fetchStaff} onOptimisticDelete={handleOptimisticDelete} staffList={staff} />
      </>
    );
  }

  /* ── Dashboard View ── */
  return (
    <>
      <Metrics metrics={metrics} />

      <div style={{ marginTop: 24, marginBottom: 12 }}>
        <p className="font-bold" style={{ fontSize: '0.9rem', color: 'var(--navy)' }}>Automation Actions</p>
        <p className="text-xs text-grey mt-1">Click any action to trigger the connected n8n workflow.</p>
      </div>

      <div className="grid-2">
        {CARDS.map(card => (
          <div className="card" key={card.type}>
            <div className={`card-icon ${card.color}`}>{card.icon}</div>
            <h3>{card.label}</h3>
            <p>{card.desc}</p>
            <button
              className={`btn ${card.btnClass}`}
              onClick={() => {
                if (card.modal) {
                  setModal({ type: card.type, title: MODAL_TITLES[card.type] });
                } else {
                  downloadReport(card.type, card.dl.filename);
                }
              }}
              disabled={dlLoading === card.type}
            >
              {dlLoading === card.type ? 'Generating…' : card.btnLabel}
            </button>
          </div>
        ))}
      </div>

      <Modal config={modal} onClose={() => setModal(null)} onSuccess={fetchStaff} onOptimisticDelete={handleOptimisticDelete} staffList={staff} />
    </>
  );
}
