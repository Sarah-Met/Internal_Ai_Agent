import React, { useState } from 'react';

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [needsReset, setNeedsReset] = useState(false);
  const [tempUser, setTempUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Security question states
  const [securityQuestion, setSecurityQuestion] = useState('What is your pet name?');
  const [securityAnswer, setSecurityAnswer] = useState('');

  // Forgot password states
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotQuestion, setForgotQuestion] = useState('');
  const [forgotAnswer, setForgotAnswer] = useState('');
  const [adminRequestSent, setAdminRequestSent] = useState(false);

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
        body: JSON.stringify({ 
          email: tempUser.email, 
          new_pass: newPassword,
          security_question: securityQuestion,
          security_answer: securityAnswer 
        }),
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

  const isResetValid = hasMinLength && hasLetter && hasNumber && hasSpecial && passwordsMatch && securityAnswer.trim() !== '';

  // --- Forgot Password Logic ---
  const handleForgotEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3000/auth/security-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'User not found or no security question set');
      }
      const data = await response.json();
      setForgotQuestion(data.question);
      setForgotStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotAnswerSubmit = async (e) => {
    e.preventDefault();
    if (forgotStep === 2) {
      setForgotStep(3);
    } else if (forgotStep === 3) {
      if (!isResetValid) return;
      setError('');
      setLoading(true);
      try {
        const response = await fetch('http://localhost:3000/auth/reset-with-security-answer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: forgotEmail, answer: forgotAnswer, new_pass: newPassword }),
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to reset password');
        }
        // Success
        setForgotMode(false);
        setForgotStep(1);
        setNewPassword('');
        setConfirmPassword('');
        setForgotAnswer('');
        setError('Password successfully reset. You can now log in.');
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSendToAdmin = async () => {
    setError('');
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3000/auth/reset-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to send request');
      }
      setAdminRequestSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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
            
            <div className="login-field">
              <label>Security Question</label>
              <select
                value={securityQuestion}
                onChange={(e) => setSecurityQuestion(e.target.value)}
                disabled={loading}
                className="inline-input"
                style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', border: '1.5px solid #e2e8f0', background: 'var(--off-white)' }}
              >
                <option value="What is your pet name?">What is your pet name?</option>
                <option value="What is your favorite sport?">What is your favorite sport?</option>
                <option value="What was the name of your first school?">What was the name of your first school?</option>
                <option value="In what city were you born?">In what city were you born?</option>
              </select>
            </div>
            
            <div className="login-field">
              <label>Security Answer</label>
              <input
                type="text"
                value={securityAnswer}
                onChange={(e) => setSecurityAnswer(e.target.value)}
                placeholder="Enter your answer"
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

  if (forgotMode) {
    return (
      <div className="login-container">
        <div className="login-card" style={{ width: '400px' }}>
          <div className="login-logo">
            <img src="/images/ZUNO_red.png" alt="ZUNO" style={{ width: 48, height: 48, borderRadius: 12 }} />
            <h1>ZUNO</h1>
          </div>
          <p className="login-subtitle">Forgot Password</p>
          
          {error && (
            <div className="login-error-alert">
              <span>⚠</span> {error}
            </div>
          )}

          {adminRequestSent ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <p style={{ color: 'var(--teal)', fontWeight: 'bold' }}>Request sent to admin!</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--navy-mid)' }}>Please wait for your administrator to approve your request. They will provide you with a new temporary password.</p>
              <button className="btn btn-ghost" onClick={() => setForgotMode(false)} style={{ marginTop: '16px' }}>Back to Login</button>
            </div>
          ) : forgotStep === 1 ? (
            <form onSubmit={handleForgotEmailSubmit} className="login-form">
              <div className="login-field">
                <label>Email Address</label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="Enter your email"
                  disabled={loading}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary login-btn" disabled={loading}>
                {loading ? 'Checking...' : 'Next →'}
              </button>
              <div style={{ textAlign: 'center', marginTop: '16px' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setForgotMode(false)}>Back to Login</button>
              </div>
            </form>
          ) : forgotStep === 2 || forgotStep === 3 ? (
            <form onSubmit={handleForgotAnswerSubmit} className="login-form">
              <div className="login-field">
                <label>Security Question</label>
                <div style={{ padding: '10px 14px', background: 'var(--off-white)', borderRadius: '6px', border: '1.5px solid #e2e8f0', color: 'var(--navy)', fontWeight: 600, fontSize: '0.9rem' }}>
                  {forgotQuestion}
                </div>
              </div>
              
              <div className="login-field">
                <label>Your Answer</label>
                <input
                  type="text"
                  value={forgotAnswer}
                  onChange={(e) => setForgotAnswer(e.target.value)}
                  placeholder="Enter your answer"
                  disabled={loading || forgotStep === 3}
                  required
                />
              </div>
              
              {forgotStep === 3 && (
                <>
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
                </>
              )}

              <button type="submit" className="btn btn-primary login-btn" disabled={loading || (forgotStep === 3 && !isResetValid)} style={{ marginBottom: '8px' }}>
                {forgotStep === 2 ? 'Verify Answer' : 'Reset Password'}
              </button>
              
              {forgotStep === 2 && (
                <button type="button" className="btn btn-ghost login-btn" onClick={handleSendToAdmin} disabled={loading} style={{ border: '1.5px solid var(--red)', color: 'var(--red)' }}>
                  I don't remember (Request Admin Help)
                </button>
              )}

              <div style={{ textAlign: 'center', marginTop: '16px' }}>
                <button type="button" className="btn btn-ghost" onClick={() => { setForgotStep(1); setForgotMode(false); }}>Cancel</button>
              </div>
            </form>
          ) : null}
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
          
          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <button 
              type="button" 
              onClick={() => { setError(''); setForgotMode(true); setForgotStep(1); setAdminRequestSent(false); }}
              style={{ background: 'none', border: 'none', color: 'var(--navy-mid)', fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Forgot Password?
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
