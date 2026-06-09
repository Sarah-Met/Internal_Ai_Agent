import React, { useState } from 'react';

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Password change states
  const [needsReset, setNeedsReset] = useState(false);
  const [tempUser, setTempUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:3000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Invalid email or password');
      }

      const userData = await response.json();
      if (userData.needs_password_change) {
        setTempUser(userData);
        setNeedsReset(true);
      } else {
        onLoginSuccess(userData);
      }
    } catch (err) {
      setError(err.message || 'Connection error. Check that backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    if (!isResetValid) return;

    setError('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:3000/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: tempUser.email, new_pass: newPassword }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update password');
      }

      // Complete login using updated profile
      const loggedInUser = { ...tempUser, needs_password_change: false };
      onLoginSuccess(loggedInUser);
    } catch (err) {
      setError(err.message || 'Connection error. Check that backend is running.');
    } finally {
      setLoading(false);
    }
  };

  // Live validation checks
  const hasMinLength = newPassword.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);
  const passwordsMatch = newPassword === confirmPassword && newPassword !== '';

  const isResetValid = hasMinLength && hasLetter && hasNumber && hasSpecial && passwordsMatch;

  if (needsReset) {
    return (
      <div className="login-container">
        <div className="login-card" style={{ width: '440px' }}>
          <div className="login-logo">
            <img src="/images/ZUNO_red.png" alt="ZUNO" style={{ width: 48, height: 48, borderRadius: 12 }} />
            <h1>ZUNO</h1>
          </div>
          <p className="login-subtitle">First-Time Login: Secure Password Reset</p>
          
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            borderLeft: '3px solid var(--teal)',
            padding: '12px 16px',
            background: 'var(--off-white)',
            borderRadius: '6px',
            marginBottom: '16px',
          }}>
            <svg 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="var(--teal)" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              style={{ marginTop: '2px', flexShrink: 0 }}
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <div>
              <p style={{ fontWeight: 600, fontSize: '0.825rem', color: 'var(--teal)', margin: 0 }}>
                Password Reset Required
              </p>
              <p style={{ fontSize: '0.78rem', color: 'var(--navy-mid)', margin: '4px 0 0', lineHeight: 1.45 }}>
                First-time login detected. Please create a new secure password to proceed to your account.
              </p>
            </div>
          </div>

          {error && (
            <div className="login-error-alert">
              <span>⚠</span> {error}
            </div>
          )}

          <form onSubmit={handleResetSubmit} className="login-form">
            <div className="login-field">
              <label>New Secure Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                disabled={loading}
                required
              />
            </div>

            <div className="login-field">
              <label>Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                disabled={loading}
                required
              />
            </div>

            {/* Password strength checker UI */}
            <div style={{ width: '100%', fontSize: '0.8rem', marginTop: '4px', color: 'var(--navy-mid)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <p style={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--navy)', marginBottom: '2px' }}>Requirements:</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: hasMinLength ? 'var(--teal)' : 'var(--red)', fontWeight: 500 }}>
                <span>{hasMinLength ? '✓' : '✗'}</span> Minimum 8 characters
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: hasLetter ? 'var(--teal)' : 'var(--red)', fontWeight: 500 }}>
                <span>{hasLetter ? '✓' : '✗'}</span> Contains letters (a-z, A-Z)
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: hasNumber ? 'var(--teal)' : 'var(--red)', fontWeight: 500 }}>
                <span>{hasNumber ? '✓' : '✗'}</span> Contains numbers (0-9)
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: hasSpecial ? 'var(--teal)' : 'var(--red)', fontWeight: 500 }}>
                <span>{hasSpecial ? '✓' : '✗'}</span> Contains special character (!@#$ etc.)
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: passwordsMatch ? 'var(--teal)' : 'var(--red)', fontWeight: 500 }}>
                <span>{passwordsMatch ? '✓' : '✗'}</span> Passwords match
              </div>
            </div>

            <button type="submit" className="btn btn-primary login-btn" disabled={!isResetValid || loading} style={{ marginTop: '16px' }}>
              {loading ? 'Updating Password...' : 'Save & Log In →'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-logo">
          <img src="/images/ZUNO_red.png" alt="ZUNO" style={{ width: 48, height: 48, borderRadius: 12 }} />
          <h1>ZUNO</h1>
        </div>
        <p className="login-subtitle">Internal Employee Portal</p>
        
        {error && (
          <div className="login-error-alert">
            <span>⚠</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-field">
            <label>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. employee@company.com"
              disabled={loading}
              required
            />
          </div>

          <div className="login-field">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              disabled={loading}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary login-btn" disabled={loading}>
            {loading ? 'Logging in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
