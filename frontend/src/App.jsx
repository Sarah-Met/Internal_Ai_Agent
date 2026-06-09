import React, { useState, useEffect } from 'react';
import Layout from './Layout';
import Login from './Login';
import './index.css';

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const cachedUser = localStorage.getItem('zuno_user');
    if (cachedUser) {
      try {
        setUser(JSON.parse(cachedUser));
      } catch (e) {
        localStorage.removeItem('zuno_user');
      }
    }
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    localStorage.setItem('zuno_user', JSON.stringify(userData));
  };

  const handleLogout = async () => {
    if (user?.session_id) {
      try {
        await fetch('http://localhost:3000/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: user.session_id }),
        });
      } catch (e) {
        console.error('Error logging out:', e);
      }
    }
    setUser(null);
    localStorage.removeItem('zuno_user');
  };

  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return <Layout user={user} onLogout={handleLogout} />;
}

export default App;