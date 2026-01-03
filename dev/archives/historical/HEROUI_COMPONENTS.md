# HeroUI Component Documentation

This document outlines the usage and implementation details of the newly refactored HeroUI components.

## 1. AuthForm
**Location**: `components/AuthForm.tsx`

The `AuthForm` component handles both login and registration flows. It has been refactored to use HeroUI's `Input`, `Select`, `Button`, and `Card` components.

### Props
- `mode`: `'login' | 'register'` - Determines the form state.

### Usage
```tsx
import AuthForm from '@/components/AuthForm';

export default function LoginPage() {
  return <AuthForm mode="login" />;
}
```

### HeroUI Implementation Details
- **Inputs**: Uses `variant="bordered"` for a clean look.
- **Selects**: Uses `Select` and `SelectItem` for gender and state selection.
- **Validation**: Displays error messages in a `Card` with `bg-danger-50`.
- **Loading State**: The submit button uses `isLoading` prop during API calls.

## 2. PasswordInput
**Location**: `components/auth/PasswordInput.tsx`

A reusable password input component with visibility toggle.

### Props
- `id`: string
- `name`: string
- `value`: string
- `onChange`: (e: React.ChangeEvent<HTMLInputElement>) => void
- `label`: string (optional, default: "Password")
- `isInvalid`: boolean (optional)
- `errorMessage`: string (optional)

### Usage
```tsx
<PasswordInput
  id="password"
  name="password"
  value={password}
  onChange={handleChange}
  label="Current Password"
/>
```

### HeroUI Implementation Details
- Uses `Input` with `endContent` slot for the visibility toggle button.
- Handles `type="text"` vs `type="password"` internally.

## 3. SendCashModal
**Location**: `components/SendCashModal.tsx`

A modal dialog for transferring funds between players.

### Props
- `isOpen`: boolean
- `onClose`: () => void
- `recipientId`: number
- `recipientName`: string
- `onSuccess`: (newBalance: number) => void

### Usage
```tsx
<SendCashModal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  recipientId={123}
  recipientName="CorpOne"
  onSuccess={handleSuccess}
/>
```

### HeroUI Implementation Details
- Uses `Modal`, `ModalContent`, `ModalHeader`, `ModalBody`, `ModalFooter`.
- Manages focus trap and scroll locking automatically.
- success state displays a clean success message within the modal body.
