import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Login from '../pages/Login';
import Register from '../pages/Register';
import { AuthProvider } from '../context/AuthContext';
import api from '../api/client';

// Mock the API client
vi.mock('../api/client', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
  getErrorMessage: (err, fallback) => (err.response?.data?.message || fallback),
}));

const renderWithProviders = (component) => {
  return render(
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>{component}</AuthProvider>
    </BrowserRouter>
  );
};

describe('Frontend - Authentication Pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('Login Page', () => {
    it('renders login form with email and password inputs', () => {
      renderWithProviders(<Login />);
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
    });

    it('displays error message on failed login attempt', async () => {
      api.post.mockRejectedValueOnce({
        response: { data: { success: false, message: 'Invalid email or password' } },
      });

      renderWithProviders(<Login />);

      fireEvent.change(screen.getByLabelText(/email address/i), {
        target: { value: 'wrong@example.com' },
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'wrongpassword' },
      });

      fireEvent.click(screen.getByRole('button', { name: /log in/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Invalid email or password');
      });
    });

    it('stores token and user in localStorage on successful login', async () => {
      const mockUser = { id: 'u1', name: 'Priya', email: 'priya@example.com' };
      api.post.mockResolvedValueOnce({
        data: {
          success: true,
          token: 'mock-jwt-token',
          user: mockUser,
        },
      });

      renderWithProviders(<Login />);

      fireEvent.change(screen.getByLabelText(/email address/i), {
        target: { value: 'priya@example.com' },
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'password123' },
      });

      fireEvent.click(screen.getByRole('button', { name: /log in/i }));

      await waitFor(() => {
        expect(localStorage.getItem('skillbridge_token')).toBe('mock-jwt-token');
        expect(JSON.parse(localStorage.getItem('skillbridge_user')).name).toBe('Priya');
      });
    });
  });

  describe('Register Page', () => {
    it('renders registration form with all required and flexible fields', () => {
      renderWithProviders(<Register />);

      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/skills you can teach/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/skills you want to learn/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create my skillbridge account/i })).toBeInTheDocument();
    });

    it('rejects passwords shorter than 6 characters before API call', async () => {
      renderWithProviders(<Register />);

      fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Test User' } });
      fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByLabelText(/password/i), { target: { value: '123' } });

      fireEvent.click(screen.getByRole('button', { name: /create my skillbridge account/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('at least 6 characters');
      });
      expect(api.post).not.toHaveBeenCalled();
    });
  });
});
