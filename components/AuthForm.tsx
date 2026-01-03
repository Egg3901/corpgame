'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, RegisterData, LoginData } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';
import { announceToScreenReader } from '@/lib/utils/accessibility';

interface AuthFormProps {
  mode: 'login' | 'register';
}

import { Input, Select, SelectItem, Button } from "@heroui/react";
import PasswordInput from './auth/PasswordInput';

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
    } catch (err: unknown) {
      console.error('Auth error:', err);
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      // Announce error to screen readers
      announceToScreenReader(`Error: ${errorMessage}`, 'assertive');
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

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div 
          className="bg-danger-50 border border-danger-200 text-danger px-4 py-3 rounded-xl text-sm"
          role="alert"
          aria-live="assertive"
        >
          {error}
        </div>
      )}

      {mode === 'register' ? (
        <>
          <Input
            id="username"
            name="username"
            type="text"
            label="Username"
            labelPlacement="outside"
            placeholder="Enter your username"
            description="Used for logging into your account"
            variant="bordered"
            isRequired
            value={(formData as RegisterData).username || ''}
            onChange={handleChange}
          />

          <Input
            id="email"
            name="email"
            type="email"
            label="Email"
            labelPlacement="outside"
            placeholder="Enter your email"
            variant="bordered"
            isRequired
            value={(formData as RegisterData).email}
            onChange={handleChange}
          />

          <Input
            id="player_name"
            name="player_name"
            type="text"
            label="Player Name"
            labelPlacement="outside"
            placeholder="Enter your player name"
            description="This name will be displayed to other players in-game"
            variant="bordered"
            isRequired
            value={(formData as RegisterData).player_name || ''}
            onChange={handleChange}
          />

          <Select
            id="gender"
            name="gender"
            label="Gender"
            labelPlacement="outside"
            placeholder="Select gender"
            variant="bordered"
            isRequired
            selectedKeys={(formData as RegisterData).gender ? [(formData as RegisterData).gender as string] : []}
            onChange={(e) => handleSelectChange('gender', e.target.value)}
          >
            <SelectItem key="m">Male</SelectItem>
            <SelectItem key="f">Female</SelectItem>
            <SelectItem key="nonbinary">Non-binary</SelectItem>
          </Select>

          <Input
            id="age"
            name="age"
            type="number"
            label="Age"
            labelPlacement="outside"
            placeholder="Enter your age"
            description="Must be between 18 and 80"
            variant="bordered"
            isRequired
            min={18}
            max={80}
            value={String((formData as RegisterData).age || '')}
            onChange={handleChange}
          />

          <Select
            id="starting_state"
            name="starting_state"
            label="Starting State"
            labelPlacement="outside"
            placeholder="Select a state"
            variant="bordered"
            isRequired
            selectedKeys={(formData as RegisterData).starting_state ? [(formData as RegisterData).starting_state as string] : []}
            onChange={(e) => handleSelectChange('starting_state', e.target.value)}
          >
            {US_STATES.map((state) => (
              <SelectItem key={state.value}>
                {state.label}
              </SelectItem>
            ))}
          </Select>

          <Input
            id="registration_secret"
            name="registration_secret"
            type="password"
            label="Registration Secret"
            labelPlacement="outside"
            placeholder="Enter registration code"
            description="Required for beta access"
            variant="bordered"
            isRequired
            value={(formData as RegisterData).registration_secret || ''}
            onChange={handleChange}
          />

          <Input
            id="admin_secret"
            name="admin_secret"
            type="password"
            label="Admin Secret"
            labelPlacement="outside"
            placeholder="Optional"
            variant="bordered"
            value={(formData as RegisterData).admin_secret || ''}
            onChange={handleChange}
          />
        </>
      ) : (
        <Input
          id="username"
          name="username"
          type="text"
          label="Username"
          labelPlacement="outside"
          placeholder="Enter your username"
          variant="bordered"
          isRequired
          value={(formData as LoginData).username}
          onChange={handleChange}
        />
      )}

      <PasswordInput
        id="password"
        name="password"
        value={formData.password}
        onChange={handleChange}
        label="Password"
      />

      <Button
        type="submit"
        color="primary"
        size="lg"
        className="w-full font-bold"
        isLoading={loading}
      >
        {mode === 'login' ? 'Sign In' : 'Create Account'}
      </Button>
    </form>
  );
}


