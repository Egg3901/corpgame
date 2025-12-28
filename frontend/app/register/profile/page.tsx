'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, ArrowLeft, Check, Loader2 } from 'lucide-react';
import { authAPI, RegisterData } from '@/lib/api';

const US_STATES = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
];

interface ProfileData {
  player_name: string;
  gender: '' | 'm' | 'f' | 'nonbinary';
  age: string;
  starting_state: string;
}

interface StoredCredentials {
  username: string;
  email: string;
  password: string;
  registration_secret: string;
  admin_secret?: string;
}

export default function RegisterProfilePage() {
  const router = useRouter();
  const [credentials, setCredentials] = useState<StoredCredentials | null>(null);
  const [formData, setFormData] = useState<ProfileData>({
    player_name: '',
    gender: '',
    age: '',
    starting_state: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem('register_credentials');
    if (!stored) {
      router.push('/register');
      return;
    }
    try {
      const parsed = JSON.parse(stored) as StoredCredentials;
      setCredentials(parsed);
    } catch {
      router.push('/register');
    }
  }, [router]);

  const canSubmit =
    formData.player_name.trim().length > 0 &&
    formData.gender !== '' &&
    formData.age !== '' &&
    parseInt(formData.age) >= 18 &&
    parseInt(formData.age) <= 80 &&
    formData.starting_state !== '';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!credentials) {
      setError('Session expired. Please start over.');
      router.push('/register');
      return;
    }

    if (!formData.player_name.trim()) {
      setError('Player name is required');
      return;
    }

    if (!formData.gender) {
      setError('Please select a gender');
      return;
    }

    const age = parseInt(formData.age);
    if (isNaN(age) || age < 18 || age > 80) {
      setError('Age must be between 18 and 80');
      return;
    }

    if (!formData.starting_state) {
      setError('Please select a starting state');
      return;
    }

    setLoading(true);

    try {
      const registerData: RegisterData = {
        username: credentials.username,
        email: credentials.email,
        password: credentials.password,
        registration_secret: credentials.registration_secret,
        admin_secret: credentials.admin_secret,
        player_name: formData.player_name.trim(),
        gender: formData.gender as 'm' | 'f' | 'nonbinary',
        age: age,
        starting_state: formData.starting_state,
      };

      const response = await authAPI.register(registerData);

      // Clear stored credentials
      sessionStorage.removeItem('register_credentials');

      // Store auth data
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));

      router.push('/home');
    } catch (err: any) {
      console.error('Registration error:', err);
      let errorMessage = 'An error occurred';

      if (err.code === 'ECONNREFUSED' || err.message?.includes('Network Error')) {
        errorMessage = 'Cannot connect to server. Please ensure the backend server is running.';
      } else if (err.response) {
        errorMessage = err.response.data?.error || err.response.data?.message || `Server error: ${err.response.status}`;
      } else if (err.request) {
        errorMessage = 'No response from server. Please check your connection.';
      } else {
        errorMessage = err.message || 'An unexpected error occurred';
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleBack = () => {
    router.push('/register');
  };

  if (!credentials) {
    return null;
  }

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
          background: linear-gradient(135deg, #8b5cf6, #7c3aed);
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

        .auth-step.completed {
          background: #d1fae5;
          color: #059669;
        }

        .auth-step.active {
          background: linear-gradient(135deg, #8b5cf6, #7c3aed);
          color: white;
        }

        .auth-step-icon {
          width: 16px;
          height: 16px;
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
        }

        .auth-input,
        .auth-select {
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

        .auth-select {
          cursor: pointer;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 12px center;
          padding-right: 44px;
        }

        .auth-input:focus,
        .auth-select:focus {
          border-color: #8b5cf6;
          background: white;
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
        }

        .auth-input::placeholder {
          color: #9ca3af;
        }

        .auth-error {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          padding: 12px 16px;
          border-radius: 10px;
          font-size: 14px;
        }

        .auth-button-group {
          display: flex;
          gap: 12px;
          margin-top: 8px;
        }

        .auth-button {
          flex: 1;
          padding: 14px 24px;
          font-size: 16px;
          font-weight: 600;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .auth-button-primary {
          color: white;
          background: linear-gradient(135deg, #8b5cf6, #7c3aed);
        }

        .auth-button-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 10px 20px -10px rgba(139, 92, 246, 0.5);
        }

        .auth-button-secondary {
          color: #374151;
          background: #f3f4f6;
          border: 2px solid #e5e7eb;
        }

        .auth-button-secondary:hover:not(:disabled) {
          background: #e5e7eb;
        }

        .auth-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .auth-button svg {
          width: 20px;
          height: 20px;
        }

        .auth-hint {
          font-size: 12px;
          color: #9ca3af;
          margin-top: 4px;
        }

        .auth-info-box {
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 10px;
          padding: 14px 16px;
          margin-bottom: 16px;
        }

        .auth-info-title {
          font-size: 12px;
          font-weight: 600;
          color: #1d4ed8;
          margin-bottom: 4px;
        }

        .auth-info-text {
          font-size: 13px;
          color: #3b82f6;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .auth-spinner {
          animation: spin 1s linear infinite;
        }
      `}</style>

      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-card">
            <div className="auth-header">
              <div className="auth-icon">
                <User />
              </div>
              <h1 className="auth-title">Your Profile</h1>
              <p className="auth-subtitle">Tell us about yourself</p>
            </div>

            <div className="auth-steps">
              <div className="auth-step completed">
                <Check className="auth-step-icon" />
                Credentials
              </div>
              <div className="auth-step active">
                <span className="auth-step-dot"></span>
                Profile
              </div>
            </div>

            <div className="auth-info-box">
              <div className="auth-info-title">Account Details</div>
              <div className="auth-info-text">
                Creating account for: <strong>{credentials.username}</strong> ({credentials.email})
              </div>
            </div>

            <form onSubmit={handleSubmit} className="auth-form">
              {error && <div className="auth-error">{error}</div>}

              <div className="auth-field">
                <label htmlFor="player_name" className="auth-label">
                  Player Name
                </label>
                <input
                  id="player_name"
                  name="player_name"
                  type="text"
                  value={formData.player_name}
                  onChange={handleChange}
                  placeholder="Enter your in-game display name"
                  required
                  className="auth-input"
                />
                <p className="auth-hint">This name will be visible to other players</p>
              </div>

              <div className="auth-field">
                <label htmlFor="gender" className="auth-label">
                  Gender
                </label>
                <select
                  id="gender"
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  required
                  className="auth-select"
                >
                  <option value="">Select gender</option>
                  <option value="m">Male</option>
                  <option value="f">Female</option>
                  <option value="nonbinary">Non-binary</option>
                </select>
              </div>

              <div className="auth-field">
                <label htmlFor="age" className="auth-label">
                  Age
                </label>
                <input
                  id="age"
                  name="age"
                  type="number"
                  value={formData.age}
                  onChange={handleChange}
                  placeholder="Enter your age"
                  required
                  min={18}
                  max={80}
                  className="auth-input"
                />
                <p className="auth-hint">Must be between 18 and 80</p>
              </div>

              <div className="auth-field">
                <label htmlFor="starting_state" className="auth-label">
                  Starting State
                </label>
                <select
                  id="starting_state"
                  name="starting_state"
                  value={formData.starting_state}
                  onChange={handleChange}
                  required
                  className="auth-select"
                >
                  <option value="">Select your starting state</option>
                  {US_STATES.map((state) => (
                    <option key={state.value} value={state.value}>
                      {state.label}
                    </option>
                  ))}
                </select>
                <p className="auth-hint">This will be your home market for business operations</p>
              </div>

              <div className="auth-button-group">
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={loading}
                  className="auth-button auth-button-secondary"
                >
                  <ArrowLeft /> Back
                </button>
                <button
                  type="submit"
                  disabled={!canSubmit || loading}
                  className="auth-button auth-button-primary"
                >
                  {loading ? (
                    <>
                      <Loader2 className="auth-spinner" /> Creating...
                    </>
                  ) : (
                    <>
                      Create Account <Check />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
