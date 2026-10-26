import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Messages from '../pages/Messages';
import { AuthProvider } from '../context/AuthContext';
import api from '../api/client';

vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
  getErrorMessage: (err, fallback) => (err.response?.data?.message || fallback),
}));

const mockCurrentUser = {
  id: 'user-me',
  name: 'Current User',
  email: 'me@example.com',
};

const mockPartner = {
  id: 'user-other',
  name: 'Rohan Sharma',
  skillsToTeach: ['Python'],
};

const mockConversation = {
  id: 'conv-1',
  participants: [mockCurrentUser, mockPartner],
  lastMessage: { text: 'Hello there!' },
  lastMessageAt: new Date().toISOString(),
};

const mockMessages = [
  {
    id: 'm1',
    conversation: 'conv-1',
    sender: mockPartner,
    text: 'Hello there!',
    createdAt: new Date().toISOString(),
    readAt: null,
  },
];

describe('Frontend - Messaging Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('skillbridge_token', 'mock-token');
    localStorage.setItem('skillbridge_user', JSON.stringify(mockCurrentUser));
  });

  it('renders conversations and message history', async () => {
    api.get.mockImplementation((url) => {
      if (url.includes('/auth/me')) {
        return Promise.resolve({
          data: { success: true, user: mockCurrentUser },
        });
      }
      if (url.includes('/conversations?')) {
        return Promise.resolve({
          data: { success: true, conversations: [mockConversation], total: 1 },
        });
      }
      if (url.includes('/messages')) {
        return Promise.resolve({
          data: { success: true, messages: mockMessages, total: 1 },
        });
      }
      return Promise.reject(new Error('not found'));
    });
    api.patch.mockResolvedValue({ data: { success: true } });

    render(
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <Messages />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Rohan Sharma').length).toBeGreaterThan(0);
      expect(screen.getByText('Hello there!')).toBeInTheDocument();
    });
  });

  it('sends message via REST and clears input draft on success', async () => {
    api.get.mockImplementation((url) => {
      if (url.includes('/auth/me')) {
        return Promise.resolve({
          data: { success: true, user: mockCurrentUser },
        });
      }
      if (url.includes('/conversations?')) {
        return Promise.resolve({
          data: { success: true, conversations: [mockConversation], total: 1 },
        });
      }
      if (url.includes('/messages')) {
        return Promise.resolve({
          data: { success: true, messages: mockMessages, total: 1 },
        });
      }
      return Promise.reject(new Error('not found'));
    });
    api.patch.mockResolvedValue({ data: { success: true } });

    api.post.mockResolvedValueOnce({
      data: {
        success: true,
        message: {
          id: 'm2',
          conversation: 'conv-1',
          sender: mockCurrentUser,
          text: 'Sounds great! Looking forward to it.',
          createdAt: new Date().toISOString(),
          readAt: null,
        },
      },
    });

    render(
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <Messages />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/type your message/i)).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/type your message/i);
    fireEvent.change(input, { target: { value: 'Sounds great! Looking forward to it.' } });

    const sendBtn = screen.getByRole('button', { name: /send/i });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/conversations/conv-1/messages',
        expect.objectContaining({ text: 'Sounds great! Looking forward to it.' })
      );
      // Input cleared
      expect(input.value).toBe('');
    });
  });
});
