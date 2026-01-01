'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import NextLink from 'next/link';
import { Eye, EyeOff, LogIn, UserPlus } from 'lucide-react';
import { authAPI, LoginData } from '@/lib/api';
import { Card, CardBody, Input, Button, Link, Spacer } from "@heroui/react";
import { getErrorMessage } from '@/lib/utils';

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<LoginData>({
    username: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const cleanedData: LoginData = {
        username: formData.username.trim(),
        password: formData.password,
      };

      if (!cleanedData.username || !cleanedData.password) {
        setError('Username and password are required');
        setLoading(false);
        return;
      }

      const response = await authAPI.login(cleanedData);
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      router.push('/home');
    } catch (err: unknown) {
      console.error('Login error:', err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-5">
      <Card className="w-full max-w-md p-4">
        <CardBody className="gap-6">
          <div className="text-center mb-2">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20">
              <LogIn className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Welcome Back</h1>
            <p className="text-sm text-default-500">Sign in to continue to Corporate Warfare</p>
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
              placeholder="Enter your username"
              autoComplete="username"
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
              placeholder="Enter your password"
              autoComplete="current-password"
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

            <Button
              type="submit"
              color="primary"
              size="lg"
              isLoading={loading}
              className="w-full font-semibold shadow-lg shadow-primary/20"
            >
              Sign In
            </Button>
          </form>

          <div className="text-center pt-4 border-t border-divider">
            <p className="text-sm text-default-500 mb-2">Don&apos;t have an account?</p>
            <Link
              as={NextLink}
              href="/register"
              color="primary"
              className="font-semibold flex items-center justify-center gap-1"
            >
              <UserPlus className="w-4 h-4" />
              Create Account
            </Link>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
