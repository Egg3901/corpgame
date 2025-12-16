'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, RegisterData, LoginData } from '@/lib/api';

interface AuthFormProps {
  mode: 'login' | 'register';
}

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

export default function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<RegisterData | LoginData>(
    mode === 'register'
      ? { 
          email: '', 
          username: '', 
          password: '', 
          player_name: '', 
          gender: undefined, 
          age: undefined, 
          starting_state: undefined,
          registration_secret: '',
          admin_secret: ''
        }
      : { username: '', password: '' }
  );
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let response;
      if (mode === 'register') {
        const registerData = formData as RegisterData;
        // Ensure required fields are not empty strings
        if (!registerData.email?.trim() || !registerData.username?.trim() || !registerData.password || 
            !registerData.player_name?.trim() || !registerData.gender || 
            registerData.age === undefined || registerData.age === null || 
            !registerData.starting_state?.trim() || !registerData.registration_secret?.trim()) {
          setError('All fields are required');
          setLoading(false);
          return;
        }
        // Clean up the data before sending
        const cleanedData: RegisterData = {
          email: registerData.email.trim(),
          username: registerData.username.trim(),
          password: registerData.password,
          player_name: registerData.player_name.trim(),
          gender: registerData.gender,
          age: registerData.age,
          starting_state: registerData.starting_state.trim(),
          registration_secret: registerData.registration_secret?.trim(),
          admin_secret: registerData.admin_secret?.trim() || undefined
        };
        response = await authAPI.register(cleanedData);
      } else {
        const loginData = formData as LoginData;
        if (!loginData.username?.trim() || !loginData.password) {
          setError('Username and password are required');
          setLoading(false);
          return;
        }
        // Clean up the data before sending
        const cleanedData: LoginData = {
          username: loginData.username.trim(),
          password: loginData.password
        };
        response = await authAPI.login(cleanedData);
      }

      // Store token
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));

      // Redirect to home page
      router.push('/home');
    } catch (err: any) {
      console.error('Auth error:', err);
      
      // More detailed error handling
      let errorMessage = 'An error occurred';
      
      if (err.code === 'ECONNREFUSED' || err.message?.includes('Network Error')) {
        errorMessage = 'Cannot connect to server. Please ensure the backend server is running on port 3001.';
      } else if (err.response) {
        // Server responded with error status
        errorMessage = err.response.data?.error || err.response.data?.message || `Server error: ${err.response.status}`;
      } else if (err.request) {
        // Request made but no response received
        errorMessage = 'No response from server. Please check your connection and ensure the backend is running.';
      } else {
        errorMessage = err.message || 'An unexpected error occurred';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    let value: string | number | undefined = e.target.value;
    
    if (e.target.type === 'number') {
      value = e.target.value === '' ? undefined : parseInt(e.target.value);
      if (isNaN(value as number)) {
        value = undefined;
      }
    } else if (e.target.tagName === 'SELECT') {
      // For select elements, empty string means no selection
      value = e.target.value === '' ? undefined : e.target.value;
    }
    
    setFormData({
      ...formData,
      [e.target.name]: value,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {mode === 'register' ? (
        <>
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">
              Username <span className="text-gray-500 text-xs">(for login)</span>
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              value={(formData as RegisterData).username || ''}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-corporate-blue focus:border-corporate-blue text-gray-900 bg-white"
            />
            <p className="mt-1 text-xs text-gray-500">Used for logging into your account</p>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={(formData as RegisterData).email}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-corporate-blue focus:border-corporate-blue text-gray-900 bg-white"
            />
          </div>

          <div>
            <label htmlFor="player_name" className="block text-sm font-medium text-gray-700">
              Player Name <span className="text-gray-500 text-xs">(in-game display)</span>
            </label>
            <input
              id="player_name"
              name="player_name"
              type="text"
              required
              value={(formData as RegisterData).player_name || ''}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-corporate-blue focus:border-corporate-blue text-gray-900 bg-white"
            />
            <p className="mt-1 text-xs text-gray-500">This name will be displayed to other players in-game</p>
          </div>

          <div>
            <label htmlFor="gender" className="block text-sm font-medium text-gray-700">
              Gender
            </label>
            <select
              id="gender"
              name="gender"
              required
              value={(formData as RegisterData).gender || ''}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-corporate-blue focus:border-corporate-blue text-gray-900 bg-white"
            >
              <option value="">Select gender</option>
              <option value="m">Male</option>
              <option value="f">Female</option>
              <option value="nonbinary">Non-binary</option>
            </select>
          </div>

          <div>
            <label htmlFor="age" className="block text-sm font-medium text-gray-700">
              Age
            </label>
            <input
              id="age"
              name="age"
              type="number"
              required
              min={18}
              max={80}
              value={(formData as RegisterData).age || ''}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-corporate-blue focus:border-corporate-blue text-gray-900 bg-white"
            />
            <p className="mt-1 text-xs text-gray-500">Must be between 18 and 80</p>
          </div>

          <div>
            <label htmlFor="starting_state" className="block text-sm font-medium text-gray-700">
              Starting State
            </label>
            <select
              id="starting_state"
              name="starting_state"
              required
              value={(formData as RegisterData).starting_state || ''}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-corporate-blue focus:border-corporate-blue text-gray-900 bg-white"
            >
              <option value="">Select a state</option>
              {US_STATES.map((state) => (
                <option key={state.value} value={state.value}>
                  {state.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="registration_secret" className="block text-sm font-medium text-gray-700">
              Registration Secret
            </label>
            <input
              id="registration_secret"
              name="registration_secret"
              type="text"
              required
              value={(formData as RegisterData).registration_secret || ''}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-corporate-blue focus:border-corporate-blue text-gray-900 bg-white"
            />
            <p className="mt-1 text-xs text-gray-500">Enter the registration secret provided to you.</p>
          </div>

          <div>
            <label htmlFor="admin_secret" className="block text-sm font-medium text-gray-700">
              Admin Secret <span className="text-gray-500 text-xs">(optional)</span>
            </label>
            <input
              id="admin_secret"
              name="admin_secret"
              type="text"
              value={(formData as RegisterData).admin_secret || ''}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-corporate-blue focus:border-corporate-blue text-gray-900 bg-white"
            />
            <p className="mt-1 text-xs text-gray-500">Provide the admin secret if you should have admin access.</p>
          </div>
        </>
      ) : (
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700">
            Username
          </label>
          <input
            id="username"
            name="username"
            type="text"
            required
            value={(formData as LoginData).username || ''}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-corporate-blue focus:border-corporate-blue text-gray-900 bg-white"
          />
        </div>
      )}

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={6}
          value={formData.password}
          onChange={handleChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-corporate-blue focus:border-corporate-blue text-gray-900 bg-white"
        />
        {mode === 'register' && (
          <p className="mt-1 text-sm text-gray-500">Must be at least 6 characters</p>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-corporate-blue hover:bg-corporate-blue-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-corporate-blue disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Processing...' : mode === 'login' ? 'Sign In' : 'Create Account'}
      </button>
    </form>
  );
}
