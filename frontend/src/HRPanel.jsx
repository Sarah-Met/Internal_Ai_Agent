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
function Modal({ config, onClose, onSuccess, staffList = [] }) {
  const [fields, setFields] = useState({});
  const [loading, setLoading] = useState(false);
  if (!config) return null;

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
        payload = { employee_id: nextId, name: fields.f2, department: fields.f3, email: fields.f4, username: fields.f5, password: fields.f6 };
      } else {
        payload = { employee_id: fields.f1, name: fields.f2, department: fields.f3, email: fields.f4, username: fields.f5, password: fields.f6 };
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

  const inp = (key, placeholder, type = 'text') => (
    <div className="modal-field" key={key}>
      <label>{placeholder}</label>
      <input type={type} placeholder={`Enter ${placeholder.toLowerCase()}…`} value={fields[key] || ''} onChange={e => setFields(p => ({ ...p, [key]: e.target.value }))} />
    </div>
  );

  const ta = (key, placeholder) => (
    <div className="modal-field" key={key}>
      <label>{placeholder}</label>
      <textarea rows={3} placeholder={`Enter ${placeholder.toLowerCase()}…`} value={fields[key] || ''} onChange={e => setFields(p => ({ ...p, [key]: e.target.value }))} />
    </div>
  );

  let body;
  if (config.type === 'email')    body = <>{inp('f1','Recipient Email','email')}{ta('f2','Message')}</>;
  else if (config.type === 'announce') body = <>{inp('f1','Headline')}{ta('f2','Details')}</>;
  else if (config.type === 'delete')   body = <><p className="text-sm text-grey mb-4">This action permanently removes the employee record.</p>{inp('f1','Employee ID')}</>;
  else if (config.type === 'add')      body = <>{inp('f2','Full Name')}{inp('f3','Department')}{inp('f4','Email','email')}{inp('f5','Username')}{inp('f6','Password','password')}</>;
  else                                 body = <>{inp('f1','Employee ID')}{inp('f2','Full Name')}{inp('f3','Department')}{inp('f4','Email','email')}{inp('f5','Username')}{inp('f6','Password','password')}</>;

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
function Metrics({ employeeCount }) {
  const items = [
    { label: 'Total Employees', value: employeeCount !== null ? String(employeeCount) : '—',  sub: 'From database' },
    { label: 'AI Queries Today', value: '—',  sub: 'Chatbot sessions' },
    { label: 'Reports Generated', value: '—', sub: 'This month' },
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
  // Staff Management — Teal
  { type: 'add',            label: 'Add Staff',         desc: 'Onboard a new employee to the system.', icon: '+', color: 'teal', btnClass: 'btn-teal',        btnLabel: 'Add Entry',  modal: true },
  { type: 'update',         label: 'Update Staff',      desc: 'Modify existing employee records.',     icon: '↺', color: 'teal', btnClass: 'btn-teal',        btnLabel: 'Update',     modal: true },
  // Destructive — Outline Red
  { type: 'delete',         label: 'Delete Staff',      desc: 'Remove an employee from the database.', icon: '✕', color: 'red',  btnClass: 'btn-outline-red', btnLabel: 'Delete',     modal: true },
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
    } catch {
      alert('Failed to generate report. Is n8n active?');
    } finally {
      setDlLoading(null);
    }
  };

  /* ── Staff List View ── */
  if (view === 'staff') {
    return (
      <>
        <div className="table-wrap">
          <div className="table-header">
            <h3>Employee Records</h3>
            <div className="flex gap-2">
              <button className="btn btn-ghost" onClick={fetchStaff} disabled={staffLoading} style={{ fontSize: '0.8rem', padding: '7px 14px' }}>
                {staffLoading ? '↺ Loading…' : '↺ Refresh'}
              </button>
              <button className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '7px 14px' }} onClick={() => setModal({ type: 'add', title: 'New Hire' })}>
                + Add Staff
              </button>
            </div>
          </div>

          {staffError && (
            <div style={{ padding: '16px 20px', color: 'var(--red)', fontSize: '0.85rem', background: 'rgba(253,45,48,0.06)', borderBottom: '1px solid rgba(253,45,48,0.15)' }}>
              ⚠ {staffError}
            </div>
          )}

          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Department</th>
                <th>Email</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {staff.length === 0 && staffLoading ? (
                <tr><td colSpan="5" style={{ textAlign: 'center', color: 'var(--grey)', padding: 32 }}>Loading staff data…</td></tr>
              ) : staff.length === 0 ? (
                <tr><td colSpan="5" style={{ textAlign: 'center', color: 'var(--grey)', padding: 32 }}>Press Refresh to load employees.</td></tr>
              ) : staff.map((emp, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 700, color: 'var(--grey)', fontSize: '0.8rem' }}>#{emp.employee_id || '—'}</td>
                  <td style={{ fontWeight: 600 }}>{emp.name || '—'}</td>
                  <td>{emp.department || '—'}</td>
                  <td style={{ color: 'var(--grey)' }}>{emp.email || '—'}</td>
                  <td><span className="badge badge-teal">Active</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Modal config={modal} onClose={() => setModal(null)} onSuccess={fetchStaff} staffList={staff} />
      </>
    );
  }

  /* ── Dashboard View ── */
  return (
    <>
      <Metrics employeeCount={staff.length > 0 ? staff.length : null} />

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

      <Modal config={modal} onClose={() => setModal(null)} onSuccess={fetchStaff} staffList={staff} />
    </>
  );
}
