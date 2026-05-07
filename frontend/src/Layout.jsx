import { useState } from 'react';
import ChatInterface from './ChatInterface';
import HRPanel from './HRPanel';

export default function Layout() {
  const [active, setActive] = useState('dashboard');

  return (
    <>
      <div className="sidebar">
        <h2>Business Automation</h2>
        <div 
          className={`nav-item ${active === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActive('dashboard')}
        >
          <i className="fas fa-home"></i> Dashboard
        </div>
        <div 
          className={`nav-item ${active === 'staff' ? 'active' : ''}`}
          onClick={() => setActive('staff')}
        >
          <i className="fas fa-user-tie"></i> Staff List
        </div>
        <div 
          className={`nav-item ${active === 'chat' ? 'active' : ''}`}
          onClick={() => setActive('chat')}
        >
          <i className="fas fa-comments"></i> HR Chatbot
        </div>
        <div 
          className={`nav-item ${active === 'logs' ? 'active' : ''}`}
          onClick={() => setActive('logs')}
        >
          <i className="fas fa-clock"></i> Log History
        </div>
      </div>

      <div className="main-content">
        {active === 'dashboard' && <HRPanel view="dashboard" />}
        {active === 'staff' && <HRPanel view="staff" />}
        {active === 'chat' && <ChatInterface />}
        {active === 'logs' && (
          <div className="view-section active">
            <h1>Log History</h1>
            <p>System activity logs will appear here.</p>
          </div>
        )}
      </div>
    </>
  );
}
