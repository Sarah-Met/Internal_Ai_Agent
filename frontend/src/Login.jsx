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
            gap: '14px',
            background: 'linear-gradient(135deg, rgba(0,172,193,0.07) 0%, rgba(0,172,193,0.03) 100%)',
            border: '1px solid rgba(0,172,193,0.25)',
            borderLeft: '4px solid var(--teal)',
            borderRadius: '10px',
            padding: '14px 16px',
            marginBottom: '4px',
          }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '8px',
              background: 'rgba(0,172,193,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, fontSize: '16px',
            }}>🔐</div>
            <div>
              <p style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--teal)', margin: 0, letterSpacing: '0.2px' }}>
                Password Reset Required
              </p>
              <p style={{ fontSize: '0.78rem', color: 'var(--navy-mid)', margin: '3px 0 0', lineHeight: 1.5 }}>
                Your account was assigned a temporary password. Please create a new secure password to proceed.
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
