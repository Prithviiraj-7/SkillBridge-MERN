import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Profile from '../pages/Profile';
import { AuthProvider } from '../context/AuthContext';
import api from '../api/client';

vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
  },
  getErrorMessage: (err, fallback) => (err.response?.data?.message || fallback),
}));

const mockProfile = {
  id: 'me-1',
  name: 'Devika Nair',
  email: 'devika@example.com',
  bio: 'Software engineer and violinist',
  location: 'Kochi, India',
  role: 'both',
  skillsToTeach: ['React', 'JavaScript'],
  skillsToLearn: ['Violin', 'Carnatic Music'],
  availability: 'Weekend mornings',
};

describe('Frontend - Profile Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('skillbridge_token', 'mock-token');
    localStorage.setItem('skillbridge_user', JSON.stringify(mockProfile));
  });

  it('renders own profile details in view mode', async () => {
    api.get.mockImplementation((url) => {
      if (url.includes('/auth/me') || url.includes('/users/me')) {
        return Promise.resolve({ data: { success: true, user: mockProfile } });
      }
      return Promise.reject(new Error('not found'));
    });

    render(
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <Profile />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Devika Nair')).toBeInTheDocument();
      expect(screen.getByText('Software engineer and violinist')).toBeInTheDocument();
      expect(screen.getByText('Kochi, India')).toBeInTheDocument();
      expect(screen.getByText('Weekend mornings')).toBeInTheDocument();
    });
  });

  it('toggles into edit mode and allows updating name and adding a skill', async () => {
    api.get.mockImplementation((url) => {
      if (url.includes('/auth/me') || url.includes('/users/me')) {
        return Promise.resolve({ data: { success: true, user: mockProfile } });
      }
      return Promise.reject(new Error('not found'));
    });


    render(
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <Profile />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /edit profile/i }));

    // Verify edit form fields appeared
    expect(screen.getByLabelText(/display name/i)).toHaveValue('Devika Nair');

    // Add a new skill
    const skillInput = screen.getByPlaceholderText(/add a skill you can teach/i);
    fireEvent.change(skillInput, { target: { value: 'TypeScript' } });
    const addButtons = screen.getAllByRole('button', { name: /add/i });
    fireEvent.click(addButtons[0]);

    expect(screen.getByText('TypeScript')).toBeInTheDocument();

    // Mock successful save
    api.put.mockResolvedValueOnce({
      data: {
        success: true,
        user: { ...mockProfile, skillsToTeach: [...mockProfile.skillsToTeach, 'TypeScript'] },
      },
    });

    fireEvent.click(screen.getByRole('button', { name: /save profile/i }));

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith(
        '/users/me',
        expect.objectContaining({
          skillsToTeach: expect.arrayContaining(['TypeScript']),
        })
      );
    });
  });
});
