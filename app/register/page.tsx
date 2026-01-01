'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import NextLink from 'next/link';
import { Eye, EyeOff, UserPlus, LogIn, ArrowRight, Check, X } from 'lucide-react';
import { Card, CardBody, Input, Button, Link, Chip } from "@heroui/react";

interface CredentialsData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<CredentialsData>({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
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
    passwordsMatch;

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

    // Store credentials in sessionStorage and proceed to step 2
    sessionStorage.setItem('register_credentials', JSON.stringify({
      username: formData.username.trim(),
      email: formData.email.trim(),
      password: formData.password,
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-5">
      <Card className="w-full max-w-lg p-4">
        <CardBody className="gap-6">
          <div className="text-center mb-2">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20">
              <UserPlus className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Create Account</h1>
            <p className="text-sm text-default-500">Join Corporate Warfare today</p>
          </div>

          <div className="flex justify-center gap-3 mb-2">
            <Chip
              color="success"
              variant="flat"
              startContent={<span className="w-2 h-2 rounded-full bg-success ml-1" />}
              className="px-2"
            >
              Step 1: Credentials
            </Chip>
            <Chip
              variant="flat"
              className="px-2 text-default-400 bg-default-100"
              startContent={<span className="w-2 h-2 rounded-full bg-default-300 ml-1" />}
            >
              Step 2: Profile
            </Chip>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
              <div className="bg-danger-50 border border-danger-200 text-danger-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <Input
              label="Username"
              labelPlacement="outside"
              name="username"
              value={formData.username}
              onChange={handleChange}
              variant="bordered"
              placeholder="Choose a username"
              autoComplete="username"
              isRequired
              description="Must be at least 3 characters. Username is not case-sensitive."
              classNames={{
                inputWrapper: "bg-default-50 hover:bg-default-100",
              }}
            />

            <Input
              label="Email"
              labelPlacement="outside"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              variant="bordered"
              placeholder="Enter your email"
              autoComplete="email"
              isRequired
              classNames={{
                inputWrapper: "bg-default-50 hover:bg-default-100",
              }}
            />

            <Input
              label="Password"
              labelPlacement="outside"
              name="password"
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={handleChange}
              variant="bordered"
              placeholder="Create a password"
              autoComplete="new-password"
              isRequired
              classNames={{
                inputWrapper: "bg-default-50 hover:bg-default-100",
              }}
              endContent={
                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  onPress={() => setShowPassword(!showPassword)}
                  aria-label="toggle password visibility"
                  className="min-w-0"
                >
                  {showPassword ? (
                    <EyeOff className="text-2xl text-default-400 pointer-events-none" />
                  ) : (
                    <Eye className="text-2xl text-default-400 pointer-events-none" />
                  )}
                </Button>
              }
            />

            <div className="flex flex-col gap-2">
              <Input
                label="Confirm Password"
                labelPlacement="outside"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={formData.confirmPassword}
                onChange={handleChange}
                variant="bordered"
                placeholder="Confirm your password"
                autoComplete="new-password"
                isRequired
                color={formData.confirmPassword ? (passwordsMatch ? "success" : "danger") : "default"}
                classNames={{
                  inputWrapper: "bg-default-50 hover:bg-default-100",
                }}
                endContent={
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label="toggle confirm password visibility"
                    className="min-w-0"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="text-2xl text-default-400 pointer-events-none" />
                    ) : (
                      <Eye className="text-2xl text-default-400 pointer-events-none" />
                    )}
                  </Button>
                }
              />
              
              {formData.password && (
                <div className="flex flex-wrap gap-2 mt-1">
                  <Chip
                    size="sm"
                    color={passwordLongEnough ? "success" : "danger"}
                    variant="flat"
                    startContent={passwordLongEnough ? <Check size={14} /> : <X size={14} />}
                  >
                    6+ characters
                  </Chip>
                  {formData.confirmPassword && (
                    <Chip
                      size="sm"
                      color={passwordsMatch ? "success" : "danger"}
                      variant="flat"
                      startContent={passwordsMatch ? <Check size={14} /> : <X size={14} />}
                    >
                      Passwords match
                    </Chip>
                  )}
                </div>
              )}
            </div>

            <Button
              type="submit"
              color="success"
              size="lg"
              className="w-full font-semibold shadow-lg shadow-success/20 text-white"
              isDisabled={!canProceed}
              endContent={<ArrowRight size={20} />}
            >
              Next Step
            </Button>
          </form>

          <div className="text-center pt-4 border-t border-divider">
            <p className="text-sm text-default-500 mb-2">Already have an account?</p>
            <Link
              as={NextLink}
              href="/login"
              color="success"
              className="font-semibold flex items-center justify-center gap-1"
            >
              Sign In <LogIn className="w-4 h-4" />
            </Link>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
