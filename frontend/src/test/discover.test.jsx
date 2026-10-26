import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Discover from '../pages/Discover';
import { AuthProvider } from '../context/AuthContext';
import api from '../api/client';

vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
  getErrorMessage: (err, fallback) => (err.response?.data?.message || fallback),
}));

const mockUsers = [
  {
    id: 'user-1',
    name: 'Aarav Sharma',
    role: 'both',
    location: 'Bengaluru',
    bio: 'Passionate React developer and mentor',
    skillsToTeach: ['React', 'JavaScript'],
    skillsToLearn: ['Python'],
  },
  {
    id: 'user-2',
    name: 'Maya Rao',
    role: 'teacher',
    location: 'Delhi',
    bio: 'Flute instructor and musician',
    skillsToTeach: ['Classical Flute'],
    skillsToLearn: ['Piano'],
  },
];

const renderDiscover = () => {
  return render(
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <Discover />
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('Frontend - Discover Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders peer cards when users are returned from API', async () => {
    api.get.mockImplementation((url) => {
      if (url.includes('/auth/me')) {
        return Promise.resolve({ data: { success: true, user: null } });
      }
      return Promise.resolve({
        data: {
          success: true,
          users: mockUsers,
          total: 2,
          page: 1,
          pages: 1,
        },
      });
    });

    renderDiscover();

    await waitFor(() => {
      expect(screen.getByText('Aarav Sharma')).toBeInTheDocument();
      expect(screen.getByText('Maya Rao')).toBeInTheDocument();
      expect(screen.getByText('Classical Flute')).toBeInTheDocument();
    });
  });

  it('displays empty results message when no peers match filters', async () => {
    api.get.mockImplementation((url) => {
      if (url.includes('/auth/me')) {
        return Promise.resolve({ data: { success: true, user: null } });
      }
      return Promise.resolve({
        data: {
          success: true,
          users: [],
          total: 0,
          page: 1,
          pages: 0,
        },
      });
    });

    renderDiscover();

    await waitFor(() => {
      expect(screen.getByText(/no matching peers found/i)).toBeInTheDocument();
    });
  });

  it('triggers search with query parameters when submitting search form', async () => {
    api.get.mockImplementation((url) => {
      if (url.includes('/auth/me')) {
        return Promise.resolve({ data: { success: true, user: null } });
      }
      return Promise.resolve({
        data: {
          success: true,
          users: [mockUsers[0]],
          total: 1,
          page: 1,
          pages: 1,
        },
      });
    });

    renderDiscover();

    const searchInput = screen.getByPlaceholderText(/search by name, skill, or keyword/i);
    fireEvent.change(searchInput, { target: { value: 'React' } });

    const searchButton = screen.getByRole('button', { name: /^search$/i });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        '/users',
        expect.objectContaining({
          params: expect.objectContaining({ search: 'React' }),
        })
      );
    });
  });

  it('opens request modal when clicking Request Exchange button', async () => {
    // Set authenticated user in localStorage
    localStorage.setItem(
      'skillbridge_user',
      JSON.stringify({ id: 'current-u', name: 'Current User' })
    );
    localStorage.setItem('skillbridge_token', 'mock-token');

    api.get.mockImplementation((url) => {
      if (url.includes('/auth/me')) {
        return Promise.resolve({
          data: { success: true, user: { id: 'current-u', name: 'Current User' } },
        });
      }
      return Promise.resolve({
        data: {
          success: true,
          users: [mockUsers[0]],
          total: 1,
          page: 1,
          pages: 1,
        },
      });
    });

    renderDiscover();

    await waitFor(() => {
      expect(screen.getByText('Aarav Sharma')).toBeInTheDocument();
    });

    const requestButtons = screen.getAllByRole('button', { name: /request exchange/i });
    fireEvent.click(requestButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/exchange with aarav sharma/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/skill you want to learn/i)).toBeInTheDocument();
    });
  });
});
