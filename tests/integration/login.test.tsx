import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import LoginPage from '@/app/login/page';
import { authAPI } from '@/lib/api';
import { routerPushMock } from '@/tests/setup';

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    authAPI: {
      ...actual.authAPI,
      login: vi.fn(),
    },
  };
});

describe('Login workflow', () => {
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

  beforeEach(() => {
    routerPushMock.mockReset();
    window.localStorage.clear();
    vi.mocked(authAPI.login).mockReset();
  });

  afterEach(() => {
    consoleErrorSpy.mockClear();
  });

  it('shows validation error when required fields are missing', async () => {
    const { container } = render(<LoginPage />);

    const form = container.querySelector('form');
    if (!form) throw new Error('Expected a form element to be rendered');
    fireEvent.submit(form);

    expect(await screen.findByText(/username and password are required/i)).toBeInTheDocument();
    expect(authAPI.login).not.toHaveBeenCalled();
    expect(routerPushMock).not.toHaveBeenCalled();
  });

  it('trims username, stores auth data, and navigates to home on success', async () => {
    vi.mocked(authAPI.login).mockResolvedValue({
      token: 't123',
      user: { id: 1, username: 'alice' },
    } as any);

    render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText(/enter your username/i), {
      target: { name: 'username', value: '  alice  ' },
    });
    fireEvent.change(screen.getByPlaceholderText(/enter your password/i), {
      target: { name: 'password', value: 'secret' },
    });

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(authAPI.login).toHaveBeenCalledWith({ username: 'alice', password: 'secret' });
    });

    expect(window.localStorage.getItem('token')).toBe('t123');
    expect(window.localStorage.getItem('user')).toBe(JSON.stringify({ id: 1, username: 'alice' }));
    expect(routerPushMock).toHaveBeenCalledWith('/home');
  });

  it('renders backend-provided error messages on failure', async () => {
    vi.mocked(authAPI.login).mockRejectedValue({ response: { data: { error: 'Invalid credentials' } } });

    render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText(/enter your username/i), {
      target: { name: 'username', value: 'alice' },
    });
    fireEvent.change(screen.getByPlaceholderText(/enter your password/i), {
      target: { name: 'password', value: 'wrong' },
    });

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/invalid credentials/i)).toBeInTheDocument();
    expect(routerPushMock).not.toHaveBeenCalled();
  });

  it('toggles password visibility via accessible control', () => {
    render(<LoginPage />);

    const passwordInput = screen.getByPlaceholderText(/enter your password/i);
    expect(passwordInput).toHaveAttribute('type', 'password');

    fireEvent.click(screen.getByRole('button', { name: /toggle password visibility/i }));
    expect(passwordInput).toHaveAttribute('type', 'text');
  });
});
