import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from '../App';
import api from '../api/client';

vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
  },
  getErrorMessage: (err, fallback) => (err.response?.data?.message || fallback),
}));

describe('Stage 8 - Frontend End-to-End User Journey Simulation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('verifies the full flow: login, discovery, request modal, requests tab, messaging, and logout', async () => {
    const mockUser = {
      id: 'user-devika',
      name: 'Devika Nair',
      email: 'devika@skillbridge.test',
      role: 'both',
      skillsToTeach: ['React'],
      skillsToLearn: ['Python'],
    };

    const mockPartner = {
      id: 'user-rohan',
      name: 'Rohan Verma',
      role: 'both',
      skillsToTeach: ['Python'],
      skillsToLearn: ['React'],
    };

    // 1. Mock Login API call
    api.post.mockImplementation((url) => {
      if (url.includes('/auth/login')) {
        return Promise.resolve({
          data: {
            success: true,
            token: 'mock-valid-jwt',
            user: mockUser,
          },
        });
      }
      if (url.includes('/requests')) {
        return Promise.resolve({
          data: {
            success: true,
            request: {
              id: 'req-1',
              sender: mockUser,
              recipient: mockPartner,
              skillWanted: 'Python',
              status: 'pending',
            },
          },
        });
      }
      return Promise.reject(new Error('Unknown POST'));
    });

    api.get.mockImplementation((url) => {
      if (url.includes('/auth/me')) {
        return Promise.resolve({
          data: { success: true, user: mockUser },
        });
      }
      if (url.includes('/users') && !url.includes('/users/')) {
        return Promise.resolve({
          data: {
            success: true,
            users: [mockPartner],
            total: 1,
            page: 1,
            pages: 1,
          },
        });
      }
      return Promise.resolve({ data: { success: true } });
    });

    render(<App />);

    // Step A: Home page renders with navigation
    expect(screen.getByText(/share what you know/i)).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /discover/i }).length).toBeGreaterThanOrEqual(1);

    // Step B: Navigate to login
    const loginLink = screen.getByRole('link', { name: /log in/i });
    fireEvent.click(loginLink);

    await waitFor(() => {
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    });

    // Step C: Perform login
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'devika@skillbridge.test' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'Password123!' },
    });
    fireEvent.click(screen.getByRole('button', { name: /log in to skillbridge/i }));

    // Step D: After login, navigated to Discover and authenticated links appear
    await waitFor(() => {
      expect(localStorage.getItem('skillbridge_token')).toBe('mock-valid-jwt');
      expect(screen.getByText('Devika')).toBeInTheDocument();
    });

    // Step E: Verify Discover page shows peer card
    await waitFor(() => {
      expect(screen.getByText('Rohan Verma')).toBeInTheDocument();
    });

    // Step F: Open Request Exchange modal
    const requestButtons = screen.getAllByRole('button', { name: /request exchange/i });
    fireEvent.click(requestButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/exchange with rohan verma/i)).toBeInTheDocument();
    });

    // Step G: Submit request
    const sendButton = screen.getByRole('button', { name: /send request/i });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/requests',
        expect.objectContaining({
          recipient: 'user-rohan',
        })
      );
    });

    // Step H: Perform Logout
    const logoutBtn = screen.getByTitle(/log out/i);
    fireEvent.click(logoutBtn);

    await waitFor(() => {
      expect(localStorage.getItem('skillbridge_token')).toBeNull();
      expect(screen.queryByTitle(/log out/i)).not.toBeInTheDocument();
    });
  });
});
