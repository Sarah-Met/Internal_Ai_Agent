import React, { useState, useEffect } from 'react';

const webhooks = {
  'gen-details':  `http://localhost:5678/webhook/gen-details`,
  'gen-attendance': `http://localhost:5678/webhook/gen-attendance`,
  'email':        `http://localhost:5678/webhook/send-email`,
  'announce':     `http://localhost:5678/webhook/broadcast`,
  'add':          `http://localhost:5678/webhook/add-employee`,
  'update':       `http://localhost:5678/webhook/update-employee`,
  'delete':       `http://localhost:5678/webhook/delete-employee`,
  'get-staff':    `http://localhost:5678/webhook/get-staff`,
};

function Modal({ config, onClose, onSuccess }) {
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
        // Auto-increment logic
        const getRes = await fetch(webhooks['get-staff']);
        if (!getRes.ok) throw new Error('Failed to fetch staff for ID generation');
        const staffData = await getRes.json();
        const staffList = staffData.data || [];
        const highestId = staffList.reduce((max, emp) => Math.max(max, parseInt(emp.employee_id) || 0), 0);
        const nextId = (highestId + 1).toString();

        payload = {
          employee_id: nextId, 
          name: fields.f2,
          department: fields.f3, 
          email: fields.f4,
          username: fields.f5, 
          password: fields.f6,
        };
      } else { // update
        payload = {
          employee_id: fields.f1, 
          name: fields.f2,
          department: fields.f3, 
          email: fields.f4,
          username: fields.f5, 
          password: fields.f6,
        };
      }

      const res = await fetch(webhooks[config.type], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Network response was not ok');
      alert('Success!');
      if (onSuccess) onSuccess();
      onClose();
    } catch {
      alert('Error connecting to n8n workflow.');
    } finally {
      setLoading(false);
    }
  };

  const inp = (key, placeholder, type = 'text') => (
    <input
      key={key}
      type={type}
      placeholder={placeholder}
      value={fields[key] || ''}
      onChange={e => setFields(p => ({ ...p, [key]: e.target.value }))}
    />
  );
  
  const ta = (key, placeholder) => (
    <textarea
      key={key}
      placeholder={placeholder}
      rows={4}
      value={fields[key] || ''}
      onChange={e => setFields(p => ({ ...p, [key]: e.target.value }))}
    />
  );

  let formContent;
  if (config.type === 'email')   formContent = <>{inp('f1','Recipient Email','email')}{ta('f2','Message')}</>;
  else if (config.type === 'announce') formContent = <>{inp('f1','Headline')}{ta('f2','Details')}</>;
  else if (config.type === 'delete')   formContent = <><p>Permanently remove staff?</p>{inp('f1','Employee ID')}</>;
  else if (config.type === 'add') formContent = <>
    {inp('f2','Name')}{inp('f3','Department')}{inp('f4','Email','email')}
    {inp('f5','Username')}{inp('f6','Password','password')}
  </>;
  else formContent = <>
    {inp('f1','Employee ID')}{inp('f2','Name')}{inp('f3','Department')}
    {inp('f4','Email','email')}{inp('f5','Username')}{inp('f6','Password','password')}
  </>;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2>{config.title}</h2>
        {formContent}
        <div className="modal-btns">
          <button className="btn" style={{ background: '#95a5a6' }} onClick={onClose}>Cancel</button>
          <button className="btn" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Sending...' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function HRPanel({ view }) {
  const [modal, setModal] = useState(null);
  const [staff, setStaff] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffError, setStaffError] = useState(null);
  const [dlLoading, setDlLoading] = useState(null);

  const fetchStaff = async () => {
    setStaffLoading(true);
    setStaffError(null);
    try {
      const res = await fetch(webhooks['get-staff']);
      if (!res.ok) throw new Error('Network response was not ok');
      const payload = await res.json();
      setStaff(payload.data || []);
    } catch {
      setStaffError('Error connecting to n8n.');
    } finally {
      setStaffLoading(false);
    }
  };

  useEffect(() => {
    if (view === 'staff') fetchStaff();
  }, [view]);

  const downloadReport = async (type, filename) => {
    setDlLoading(type);
    try {
      const res = await fetch(webhooks[type], { method: 'POST' });
      if (!res.ok) throw new Error('Network response was not ok');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename; a.click();
      window.URL.revokeObjectURL(url);
    } catch { alert('Failed to generate report. Is n8n active?'); }
    finally { setDlLoading(null); }
  };

  if (view === 'staff') {
    return (
      <div className="view-section active">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1>Staff List</h1>
            <button className="btn" style={{ width: 'auto', padding: '8px 16px', background: 'var(--accent)' }} onClick={fetchStaff} disabled={staffLoading}>
              {staffLoading ? 'Refreshing...' : 'Refresh'}
            </button>
        </div>
        {staffError && <p style={{color:'red'}}>{staffError}</p>}
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Department</th>
              <th>Email</th>
            </tr>
          </thead>
          <tbody>
            {staffLoading ? (
              <tr><td colSpan="4">Refreshing staff data...</td></tr>
            ) : staff.length === 0 ? (
              <tr><td colSpan="4">No employees found.</td></tr>
            ) : staff.map((emp, i) => (
              <tr key={i}>
                <td>{emp.employee_id || '-'}</td>
                <td>{emp.name || '-'}</td>
                <td>{emp.department || '-'}</td>
                <td>{emp.email || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Dashboard view
  return (
    <div className="view-section active">
      <header style={{ marginBottom: '30px' }}>
        <h1>HR Center</h1>
        <p style={{ color: '#666' }}>Select a specific operation.</p>
      </header>
      
      <div className="grid">
        <div className="card generate">
          <i className="fas fa-id-card"></i>
          <h3>Employee Details</h3>
          <p>Export full staff profile reports.</p>
          <button className="btn" onClick={() => downloadReport('gen-details', 'Staff_Report.xlsx')}>
            {dlLoading === 'gen-details' ? 'Downloading...' : 'Generate Now'}
          </button>
        </div>
        
        <div className="card generate">
          <i className="fas fa-calendar-check"></i>
          <h3>Attendance Report</h3>
          <p>Pull monthly attendance logs.</p>
          <button className="btn" onClick={() => downloadReport('gen-attendance', 'Attendance_Report.xlsx')}>
            {dlLoading === 'gen-attendance' ? 'Downloading...' : 'Generate Now'}
          </button>
        </div>
        
        <div className="card comm">
          <i className="fas fa-envelope"></i>
          <h3>Send Email</h3>
          <p>Direct email to specific staff.</p>
          <button className="btn" style={{ background: 'var(--warning)' }} onClick={() => setModal({ type: 'email', title: 'Compose Email' })}>
            Compose
          </button>
        </div>
        
        <div className="card comm">
          <i className="fas fa-bullhorn"></i>
          <h3>Broadcast</h3>
          <p>Send company-wide news.</p>
          <button className="btn" style={{ background: 'var(--warning)' }} onClick={() => setModal({ type: 'announce', title: 'Broadcast' })}>
            Announce
          </button>
        </div>
        
        <div className="card data">
          <i className="fas fa-user-plus"></i>
          <h3>Add Staff</h3>
          <p>Onboard a new employee.</p>
          <button className="btn" style={{ background: 'var(--success)' }} onClick={() => setModal({ type: 'add', title: 'New Hire' })}>
            Add Entry
          </button>
        </div>
        
        <div className="card data">
          <i className="fas fa-edit"></i>
          <h3>Update Staff</h3>
          <p>Modify existing records.</p>
          <button className="btn" style={{ background: 'var(--success)' }} onClick={() => setModal({ type: 'update', title: 'Edit Details' })}>
            Update
          </button>
        </div>
        
        <div className="card danger">
          <i className="fas fa-user-minus" style={{ color: 'var(--danger)' }}></i>
          <h3>Delete Staff</h3>
          <p>Remove staff from database.</p>
          <button className="btn" style={{ background: 'var(--danger)' }} onClick={() => setModal({ type: 'delete', title: 'Delete Record' })}>
            Delete
          </button>
        </div>
      </div>

      <Modal 
        config={modal} 
        onClose={() => setModal(null)} 
        onSuccess={() => {
          if (modal && ['add', 'update', 'delete'].includes(modal.type)) {
            fetchStaff();
          }
        }} 
      />
    </div>
  );
}
