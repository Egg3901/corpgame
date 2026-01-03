'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { User, ArrowLeft, Check, Loader2 } from 'lucide-react';
import { authAPI, RegisterData } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';
import { Card, CardBody, Input, Button, Select, SelectItem, Chip } from "@heroui/react";

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

const GENDER_OPTIONS = [
  { value: 'm', label: 'Male' },
  { value: 'f', label: 'Female' },
  { value: 'nonbinary', label: 'Non-binary' },
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
        player_name: formData.player_name.trim(),
        gender: formData.gender as 'm' | 'f' | 'nonbinary',
        age: parseInt(formData.age),
        starting_state: formData.starting_state,
      };

      await authAPI.register(registerData);
      router.push('/login?registered=true');
    } catch (err: unknown) {
      console.error('Profile completion failed:', err);
      setError(getErrorMessage(err, 'Failed to complete profile. Please try again.'));
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

  const handleSelectChange = (name: string) => (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [name]: e.target.value,
    });
  };

  const handleBack = () => {
    router.push('/register');
  };

  if (!credentials) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-5">
      <Card className="w-full max-w-lg p-4">
        <CardBody className="gap-6">
          <div className="text-center mb-2">
            <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-violet-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-violet-500/20">
              <User className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Your Profile</h1>
            <p className="text-sm text-default-500">Tell us about yourself</p>
          </div>

          <div className="flex justify-center gap-3 mb-2">
            <Chip
              color="success"
              variant="flat"
              startContent={<Check size={14} />}
              className="px-2"
            >
              Credentials
            </Chip>
            <Chip
              color="secondary"
              variant="flat"
              className="px-2"
              startContent={<span className="w-2 h-2 rounded-full bg-secondary ml-1" />}
            >
              Step 2: Profile
            </Chip>
          </div>

          <div className="bg-primary-50 border border-primary-100 rounded-lg p-4 mb-2">
            <div className="text-xs font-semibold text-primary-700 mb-1">Account Details</div>
            <div className="text-sm text-primary-600">
              Creating account for: <strong>{credentials.username}</strong> ({credentials.email})
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
              <div className="bg-danger-50 border border-danger-200 text-danger-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <Input
              label="Player Name"
              labelPlacement="outside"
              name="player_name"
              value={formData.player_name}
              onChange={handleChange}
              variant="bordered"
              placeholder="Enter your in-game display name"
              isRequired
              description="This name will be visible to other players"
              classNames={{
                inputWrapper: "bg-default-50 hover:bg-default-100",
              }}
            />

            <Select
              label="Gender"
              labelPlacement="outside"
              name="gender"
              selectedKeys={formData.gender ? [formData.gender] : []}
              onChange={handleSelectChange('gender')}
              variant="bordered"
              placeholder="Select gender"
              isRequired
              classNames={{
                trigger: "bg-default-50 hover:bg-default-100",
              }}
            >
              {GENDER_OPTIONS.map((option) => (
                <SelectItem key={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </Select>

            <Input
              label="Age"
              labelPlacement="outside"
              name="age"
              type="number"
              value={formData.age}
              onChange={handleChange}
              variant="bordered"
              placeholder="Enter your age"
              isRequired
              min={18}
              max={80}
              description="Must be between 18 and 80"
              classNames={{
                inputWrapper: "bg-default-50 hover:bg-default-100",
              }}
            />

            <Select
              label="Starting State"
              labelPlacement="outside"
              name="starting_state"
              selectedKeys={formData.starting_state ? [formData.starting_state] : []}
              onChange={handleSelectChange('starting_state')}
              variant="bordered"
              placeholder="Select your starting state"
              isRequired
              description="This will be your home market for business operations"
              classNames={{
                trigger: "bg-default-50 hover:bg-default-100",
              }}
            >
              {US_STATES.map((state) => (
                <SelectItem key={state.value}>
                  {state.label}
                </SelectItem>
              ))}
            </Select>

            <div className="flex gap-3 mt-2">
              <Button
                type="button"
                onClick={handleBack}
                variant="flat"
                color="default"
                size="lg"
                className="flex-1 font-semibold"
                isDisabled={loading}
                startContent={<ArrowLeft size={20} />}
              >
                Back
              </Button>
              <Button
                type="submit"
                color="secondary"
                size="lg"
                className="flex-1 font-semibold shadow-lg shadow-secondary/20 text-white"
                isDisabled={!canSubmit || loading}
                isLoading={loading}
                endContent={!loading && <Check size={20} />}
              >
                {loading ? 'Creating...' : 'Create Account'}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
