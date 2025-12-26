'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, UserPlus, LogIn, ArrowRight, Check, X } from 'lucide-react';

interface CredentialsData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  registration_secret: string;
  admin_secret: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<CredentialsData>({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    registration_secret: '',
    admin_secret: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');

  const passwordsMatch = formData.password === formData.confirmPassword;
  const passwordLongEnough = formData.password.length >= 6;
  const canProceed =
    formData.username.trim().length >= 3 &&
    formData.email.includes('@') &&
    passwordLongEnough &&
    passwordsMatch &&
    formData.registration_secret.trim().length > 0;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.username.trim() || formData.username.trim().length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }

    if (!formData.email.includes('@')) {
      setError('Please enter a valid email');
      return;
    }

    if (!passwordLongEnough) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (!passwordsMatch) {
      setError('Passwords do not match');
      return;
    }

    if (!formData.registration_secret.trim()) {
      setError('Registration secret is required');
      return;
    }

    // Store credentials in sessionStorage and proceed to step 2
    sessionStorage.setItem('register_credentials', JSON.stringify({
      username: formData.username.trim(),
      email: formData.email.trim(),
      password: formData.password,
      registration_secret: formData.registration_secret.trim(),
      admin_secret: formData.admin_secret.trim() || undefined,
    }));

    router.push('/register/profile');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <>
      <style jsx global>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        }

        .auth-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
          padding: 20px;
        }

        .auth-container {
          width: 100%;
          max-width: 480px;
        }

        .auth-card {
          background: rgba(255, 255, 255, 0.95);
          border-radius: 16px;
          padding: 40px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }

        .auth-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .auth-icon {
          width: 64px;
          height: 64px;
          background: linear-gradient(135deg, #10b981, #059669);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
        }

        .auth-icon svg {
          width: 32px;
          height: 32px;
          color: white;
        }

        .auth-title {
          font-size: 28px;
          font-weight: 700;
          color: #1a1a2e;
          margin-bottom: 8px;
        }

        .auth-subtitle {
          font-size: 14px;
          color: #6b7280;
        }

        .auth-steps {
          display: flex;
          justify-content: center;
          gap: 8px;
          margin-bottom: 24px;
        }

        .auth-step {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 600;
          padding: 6px 12px;
          border-radius: 20px;
        }

        .auth-step.active {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
        }

        .auth-step.inactive {
          background: #e5e7eb;
          color: #9ca3af;
        }

        .auth-step-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: currentColor;
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .auth-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .auth-label {
          font-size: 14px;
          font-weight: 600;
          color: #374151;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .auth-label-optional {
          font-size: 12px;
          font-weight: 400;
          color: #9ca3af;
        }

        .auth-input {
          width: 100%;
          padding: 12px 16px;
          font-size: 16px;
          border: 2px solid #e5e7eb;
          border-radius: 10px;
          background: #f9fafb;
          color: #1a1a2e;
          transition: all 0.2s;
          outline: none;
        }

        .auth-input:focus {
          border-color: #10b981;
          background: white;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
        }

        .auth-input::placeholder {
          color: #9ca3af;
        }

        .auth-input.error {
          border-color: #ef4444;
        }

        .auth-input.success {
          border-color: #10b981;
        }

        .auth-password-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .auth-password-wrapper .auth-input {
          padding-right: 48px;
        }

        .auth-password-toggle {
          position: absolute;
          right: 12px;
          background: none;
          border: none;
          padding: 4px;
          cursor: pointer;
          color: #6b7280;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.2s;
        }

        .auth-password-toggle:hover {
          color: #10b981;
        }

        .auth-password-toggle svg {
          width: 20px;
          height: 20px;
        }

        .auth-error {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          padding: 12px 16px;
          border-radius: 10px;
          font-size: 14px;
        }

        .auth-validation {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 8px;
        }

        .auth-validation-item {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          padding: 4px 8px;
          border-radius: 6px;
        }

        .auth-validation-item.valid {
          background: #d1fae5;
          color: #059669;
        }

        .auth-validation-item.invalid {
          background: #fee2e2;
          color: #dc2626;
        }

        .auth-validation-item svg {
          width: 14px;
          height: 14px;
        }

        .auth-button {
          width: 100%;
          padding: 14px 24px;
          font-size: 16px;
          font-weight: 600;
          color: white;
          background: linear-gradient(135deg, #10b981, #059669);
          border: none;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 8px;
        }

        .auth-button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 10px 20px -10px rgba(16, 185, 129, 0.5);
        }

        .auth-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .auth-button svg {
          width: 20px;
          height: 20px;
        }

        .auth-footer {
          text-align: center;
          margin-top: 24px;
          padding-top: 24px;
          border-top: 1px solid #e5e7eb;
        }

        .auth-footer-text {
          font-size: 14px;
          color: #6b7280;
        }

        .auth-footer-link {
          color: #10b981;
          font-weight: 600;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          transition: color 0.2s;
        }

        .auth-footer-link:hover {
          color: #059669;
        }

        .auth-footer-link svg {
          width: 16px;
          height: 16px;
        }

        .auth-hint {
          font-size: 12px;
          color: #9ca3af;
          margin-top: 4px;
        }
      `}</style>

      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-card">
            <div className="auth-header">
              <div className="auth-icon">
                <UserPlus />
              </div>
              <h1 className="auth-title">Create Account</h1>
              <p className="auth-subtitle">Join Corporate Warfare today</p>
            </div>

            <div className="auth-steps">
              <div className="auth-step active">
                <span className="auth-step-dot"></span>
                Step 1: Credentials
              </div>
              <div className="auth-step inactive">
                <span className="auth-step-dot"></span>
                Step 2: Profile
              </div>
            </div>

            <form onSubmit={handleSubmit} className="auth-form">
              {error && <div className="auth-error">{error}</div>}

              <div className="auth-field">
                <label htmlFor="username" className="auth-label">
                  Username
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Choose a username"
                  required
                  minLength={3}
                  className="auth-input"
                  autoComplete="username"
                />
                <p className="auth-hint">Must be at least 3 characters. Username is not case-sensitive.</p>
              </div>

              <div className="auth-field">
                <label htmlFor="email" className="auth-label">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  required
                  className="auth-input"
                  autoComplete="email"
                />
              </div>

              <div className="auth-field">
                <label htmlFor="password" className="auth-label">
                  Password
                </label>
                <div className="auth-password-wrapper">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Create a password"
                    required
                    minLength={6}
                    className="auth-input"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="auth-password-toggle"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff /> : <Eye />}
                  </button>
                </div>
              </div>

              <div className="auth-field">
                <label htmlFor="confirmPassword" className="auth-label">
                  Confirm Password
                </label>
                <div className="auth-password-wrapper">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm your password"
                    required
                    className={`auth-input ${formData.confirmPassword ? (passwordsMatch ? 'success' : 'error') : ''}`}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="auth-password-toggle"
                    tabIndex={-1}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff /> : <Eye />}
                  </button>
                </div>
                {formData.password && (
                  <div className="auth-validation">
                    <span className={`auth-validation-item ${passwordLongEnough ? 'valid' : 'invalid'}`}>
                      {passwordLongEnough ? <Check /> : <X />}
                      6+ characters
                    </span>
                    {formData.confirmPassword && (
                      <span className={`auth-validation-item ${passwordsMatch ? 'valid' : 'invalid'}`}>
                        {passwordsMatch ? <Check /> : <X />}
                        Passwords match
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="auth-field">
                <label htmlFor="registration_secret" className="auth-label">
                  Registration Secret
                </label>
                <input
                  id="registration_secret"
                  name="registration_secret"
                  type="text"
                  value={formData.registration_secret}
                  onChange={handleChange}
                  placeholder="Enter the registration secret"
                  required
                  className="auth-input"
                />
                <p className="auth-hint">Enter the secret code provided to you</p>
              </div>

              <div className="auth-field">
                <label htmlFor="admin_secret" className="auth-label">
                  Admin Secret <span className="auth-label-optional">(optional)</span>
                </label>
                <input
                  id="admin_secret"
                  name="admin_secret"
                  type="text"
                  value={formData.admin_secret}
                  onChange={handleChange}
                  placeholder="Enter admin secret if applicable"
                  className="auth-input"
                />
              </div>

              <button type="submit" disabled={!canProceed} className="auth-button">
                Continue to Profile <ArrowRight />
              </button>
            </form>

            <div className="auth-footer">
              <p className="auth-footer-text">
                Already have an account?{' '}
                <Link href="/login" className="auth-footer-link">
                  Sign In <LogIn />
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
