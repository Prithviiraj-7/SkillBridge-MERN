import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { getErrorMessage } from '../api/client';
import Avatar from '../components/common/Avatar';
import { StatusBadge } from '../components/common/Badge';
import {
  Inbox,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  MessageSquare,
  BookOpen,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  Check,
  Ban,
} from 'lucide-react';

export default function Requests() {
  const [activeTab, setActiveTab] = useState('received'); // 'received' | 'sent'
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const [requests, setRequests] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [error, setError] = useState('');
  const [bannerNotice, setBannerNotice] = useState('');

  const navigate = useNavigate();

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const endpoint = activeTab === 'received' ? '/requests/received' : '/requests/sent';
      const params = {
        page,
        limit: 8,
      };
      if (statusFilter) params.status = statusFilter;

      const res = await api.get(endpoint, { params });
      if (res.data && res.data.success) {
        setRequests(res.data.requests || []);
        setTotal(res.data.total || 0);
        setPages(res.data.pages || 1);
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load exchange requests'));
    } finally {
      setLoading(false);
    }
  }, [activeTab, statusFilter, page]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    setPage(1);
  };

  const handleUpdateStatus = async (requestId, newStatus) => {
    setActionLoading((prev) => ({ ...prev, [requestId]: true }));
    setError('');
    try {
      const res = await api.patch(`/requests/${requestId}/status`, { status: newStatus });
      if (res.data && res.data.success) {
        setBannerNotice(`Request ${newStatus} successfully!`);
        setTimeout(() => setBannerNotice(''), 3000);
        fetchRequests();
      }
    } catch (err) {
      setError(getErrorMessage(err, `Failed to ${newStatus} request`));
    } finally {
      setActionLoading((prev) => ({ ...prev, [requestId]: false }));
    }
  };

  const handleOpenConversation = async (requestId) => {
    setActionLoading((prev) => ({ ...prev, [requestId]: true }));
    try {
      const res = await api.post('/conversations', { requestId });
      if (res.data && res.data.success) {
        const convId = res.data.conversation.id || res.data.conversation._id;
        navigate(`/messages?conversationId=${convId}`);
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to open conversation'));
      setActionLoading((prev) => ({ ...prev, [requestId]: false }));
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Skill Exchange Requests</h1>
        <p className="mt-1 text-slate-600">
          Manage incoming requests, track sent propositions, and initiate conversations
        </p>
      </div>

      {bannerNotice && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{bannerNotice}</span>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs and Status Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 mb-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => handleTabChange('received')}
            className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'received'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Inbox className="w-4 h-4 text-brand-600" />
            Received Requests
          </button>

          <button
            onClick={() => handleTabChange('sent')}
            className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'sent'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Send className="w-4 h-4 text-brand-600" />
            Sent Requests
          </button>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end text-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Status:
          </span>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="py-1.5 px-3 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs sm:text-sm focus:ring-brand-500"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="declined">Declined</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Requests List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="bg-white rounded-2xl border border-slate-200 p-6 animate-pulse space-y-3 shadow-xs"
            >
              <div className="h-4 bg-slate-200 rounded w-1/4" />
              <div className="h-3 bg-slate-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200/80 p-8 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
            <Clock className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">
            No {statusFilter ? statusFilter : ''} {activeTab} requests
          </h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
            {activeTab === 'received'
              ? 'When other members discover your skills and propose an exchange, they will appear here.'
              : 'You have not sent any requests matching this filter. Explore the Discover page to connect!'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((reqItem) => {
            const reqId = reqItem.id || reqItem._id;
            const peer = activeTab === 'received' ? reqItem.sender : reqItem.recipient;
            const isPending = reqItem.status === 'pending';
            const isAccepted = reqItem.status === 'accepted';
            const isBusy = actionLoading[reqId];

            return (
              <div
                key={reqId}
                className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs hover:shadow-sm transition-shadow"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  {/* Left: User summary & exchange details */}
                  <div className="flex items-start gap-4">
                    <Avatar src={peer?.avatar} name={peer?.name} size="md" />
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-slate-900 text-base">{peer?.name}</h3>
                        <StatusBadge status={reqItem.status} />
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 pt-1">
                        <span className="flex items-center gap-1">
                          <GraduationCap className="w-3.5 h-3.5 text-teal-600" />
                          <span className="font-semibold text-slate-700">Wants to learn:</span>{' '}
                          {reqItem.skillWanted}
                        </span>

                        {reqItem.skillOffered ? (
                          <span className="flex items-center gap-1">
                            <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                            <span className="font-semibold text-slate-700">Offers in return:</span>{' '}
                            {reqItem.skillOffered}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">No skill barter offered</span>
                        )}
                      </div>

                      {reqItem.message && (
                        <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 mt-2 max-w-xl">
                          "{reqItem.message}"
                        </p>
                      )}

                      <p className="text-[11px] text-slate-400 pt-1">
                        Sent on {new Date(reqItem.createdAt).toLocaleDateString()} at{' '}
                        {new Date(reqItem.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-end gap-2 shrink-0 pt-2 sm:pt-0">
                    {/* If RECEIVED and PENDING: Accept or Decline */}
                    {activeTab === 'received' && isPending && (
                      <div className="flex items-center gap-2">
                        <button
                          disabled={isBusy}
                          onClick={() => handleUpdateStatus(reqId, 'accepted')}
                          className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1 cursor-pointer shadow-xs"
                        >
                          {isBusy ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                          Accept
                        </button>

                        <button
                          disabled={isBusy}
                          onClick={() => handleUpdateStatus(reqId, 'declined')}
                          className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Decline
                        </button>
                      </div>
                    )}

                    {/* If SENT and PENDING: Cancel */}
                    {activeTab === 'sent' && isPending && (
                      <button
                        disabled={isBusy}
                        onClick={() => handleUpdateStatus(reqId, 'cancelled')}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                      >
                        {isBusy ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Ban className="w-3.5 h-3.5" />
                        )}
                        Cancel Request
                      </button>
                    )}

                    {/* If ACCEPTED: Chat Button */}
                    {isAccepted && (
                      <button
                        disabled={isBusy}
                        onClick={() => handleOpenConversation(reqId)}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        {isBusy ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <MessageSquare className="w-3.5 h-3.5" />
                        )}
                        Chat & Message
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="p-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-medium text-slate-600 px-3">
            Page {page} of {pages}
          </span>
          <button
            disabled={page >= pages}
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            className="p-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
