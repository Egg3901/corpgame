'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Button, Input } from '@heroui/react';

interface PasswordInputProps {
  id: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  autoComplete?: string;
  label?: string;
  isInvalid?: boolean;
  errorMessage?: string;
}

export default function PasswordInput({
  id,
  name,
  value,
  onChange,
  placeholder = 'Enter password',
  required = true,
  minLength = 6,
  autoComplete = 'current-password',
  label = 'Password',
  isInvalid,
  errorMessage,
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <Input
      id={id}
      name={name}
      label={label}
      labelPlacement="outside"
      variant="bordered"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      required={required}
      minLength={minLength}
      autoComplete={autoComplete}
      isInvalid={isInvalid}
      errorMessage={errorMessage}
      type={showPassword ? 'text' : 'password'}
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
  );
}
