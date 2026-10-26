import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { getErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/common/Avatar';
import { RoleBadge } from '../components/common/Badge';
import {
  Search,
  Filter,
  MapPin,
  BookOpen,
  GraduationCap,
  Sparkles,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
  Send,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export default function Discover() {
  const { isAuthenticated, user: currentUser } = useAuth();
  const navigate = useNavigate();

  // Filter and search states
  const [searchTerm, setSearchTerm] = useState('');
  const [teachFilter, setTeachFilter] = useState('');
  const [learnFilter, setLearnFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [page, setPage] = useState(1);

  // Data states
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Request Exchange Modal state
  const [selectedUser, setSelectedUser] = useState(null);
  const [requestData, setRequestData] = useState({
    skillWanted: '',
    skillOffered: '',
    message: '',
  });
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [requestError, setRequestError] = useState('');
  const [requestSuccess, setRequestSuccess] = useState('');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit: 9,
      };

      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (teachFilter.trim()) params.teach = teachFilter.trim();
      if (learnFilter.trim()) params.learn = learnFilter.trim();
      if (roleFilter.trim()) params.role = roleFilter.trim();
      if (locationFilter.trim()) params.location = locationFilter.trim();

      const res = await api.get('/users', { params });
      if (res.data && res.data.success) {
        setUsers(res.data.users || []);
        setTotal(res.data.total || 0);
        setPages(res.data.pages || 1);
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to discover users'));
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, teachFilter, learnFilter, roleFilter, locationFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setTeachFilter('');
    setLearnFilter('');
    setRoleFilter('');
    setLocationFilter('');
    setPage(1);
  };

  const openRequestModal = (user) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setSelectedUser(user);
    // Pre-populate skill wanted if user has skillsToTeach
    const defaultWanted = user.skillsToTeach && user.skillsToTeach.length > 0 ? user.skillsToTeach[0] : '';
    // Pre-populate skill offered if current user has skillsToTeach
    const defaultOffered =
      currentUser && currentUser.skillsToTeach && currentUser.skillsToTeach.length > 0
        ? currentUser.skillsToTeach[0]
        : '';

    setRequestData({
      skillWanted: defaultWanted,
      skillOffered: defaultOffered,
      message: '',
    });
    setRequestError('');
    setRequestSuccess('');
  };

  const closeRequestModal = () => {
    setSelectedUser(null);
    setRequestError('');
    setRequestSuccess('');
  };

  const handleSendRequest = async (e) => {
    e.preventDefault();
    setRequestError('');
    setRequestSuccess('');

    if (!requestData.skillWanted.trim()) {
      setRequestError('Please specify the skill you want to learn or discuss');
      return;
    }

    setSubmittingRequest(true);
    try {
      const res = await api.post('/requests', {
        recipient: selectedUser.id || selectedUser._id,
        skillWanted: requestData.skillWanted.trim(),
        skillOffered: requestData.skillOffered.trim(),
        message: requestData.message.trim(),
      });

      if (res.data && res.data.success) {
        setRequestSuccess('Skill exchange request sent successfully!');
        setTimeout(() => {
          closeRequestModal();
        }, 1500);
      }
    } catch (err) {
      setRequestError(getErrorMessage(err, 'Failed to send exchange request'));
    } finally {
      setSubmittingRequest(false);
    }
  };

  const hasActiveFilters =
    searchTerm || teachFilter || learnFilter || roleFilter || locationFilter;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
          Discover Peers & Skills
        </h1>
        <p className="mt-1 text-slate-600">
          Find people to learn from, share your knowledge with, or arrange mutual skill exchanges
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 mb-8">
        <form onSubmit={handleSearchSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* General Search */}
            <div className="md:col-span-4 relative">
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name, skill, or keyword..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-900 text-sm"
              />
            </div>

            {/* Teaching Skill */}
            <div className="md:col-span-3 relative">
              <GraduationCap className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Teaches (e.g. React)..."
                value={teachFilter}
                onChange={(e) => setTeachFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-900 text-sm"
              />
            </div>

            {/* Learning Skill */}
            <div className="md:col-span-3 relative">
              <BookOpen className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Wants to learn..."
                value={learnFilter}
                onChange={(e) => setLearnFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-900 text-sm"
              />
            </div>

            {/* Filter buttons */}
            <div className="md:col-span-2 flex items-center gap-2">
              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl font-semibold text-white bg-brand-600 hover:bg-brand-700 shadow-sm transition-all text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <Search className="w-4 h-4" />
                Search
              </button>
            </div>
          </div>

          {/* Secondary Filters row */}
          <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100 text-xs sm:text-sm">
            <span className="text-slate-500 font-medium flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              Quick Filters:
            </span>

            {/* Role dropdown */}
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="py-1.5 px-3 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs sm:text-sm focus:ring-brand-500"
            >
              <option value="">All Roles</option>
              <option value="both">Both Teach & Learn</option>
              <option value="teacher">Teachers Primarily</option>
              <option value="learner">Learners Primarily</option>
            </select>

            {/* Location input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Filter by city..."
                value={locationFilter}
                onChange={(e) => {
                  setLocationFilter(e.target.value);
                  setPage(1);
                }}
                className="py-1.5 pl-7 pr-3 rounded-lg border border-slate-200 text-xs sm:text-sm focus:ring-brand-500"
              />
              <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs text-rose-600 hover:text-rose-700 font-medium underline ml-auto"
              >
                Clear all filters
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-600">
          Showing <span className="font-semibold text-slate-900">{users.length}</span> of{' '}
          <span className="font-semibold text-slate-900">{total}</span> community members
        </p>
      </div>

      {/* Error State */}
      {error && (
        <div
          role="alert"
          className="mb-8 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-2.5"
        >
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-500 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading Skeletons */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="bg-white rounded-2xl border border-slate-200 p-6 animate-pulse space-y-4 shadow-xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-slate-200 rounded-full" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-slate-200 rounded w-1/2" />
                  <div className="h-3 bg-slate-100 rounded w-1/3" />
                </div>
              </div>
              <div className="h-12 bg-slate-100 rounded" />
              <div className="h-6 bg-slate-100 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : users.length === 0 ? (
        /* Empty Results State */
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200/80 p-8 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No matching peers found</h3>
          <p className="text-sm text-slate-600 max-w-md mx-auto mt-1 mb-5">
            Try adjusting your search query, clearing filters, or searching for related skill keywords.
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        /* User Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {users.map((peer) => {
            const peerId = peer.id || peer._id;
            return (
              <div
                key={peerId}
                className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  {/* Top user row */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <Link to={`/profile/${peerId}`} className="flex items-center gap-3 group">
                      <Avatar src={peer.avatar} name={peer.name} size="md" />
                      <div>
                        <h3 className="font-bold text-slate-900 group-hover:text-brand-600 transition-colors">
                          {peer.name}
                        </h3>
                        {peer.location && (
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {peer.location}
                          </p>
                        )}
                      </div>
                    </Link>
                    <RoleBadge role={peer.role} />
                  </div>

                  {/* Bio */}
                  {peer.bio && (
                    <p className="text-xs text-slate-600 line-clamp-2 mb-4 leading-relaxed">
                      {peer.bio}
                    </p>
                  )}

                  {/* Skills to Teach */}
                  {peer.skillsToTeach && peer.skillsToTeach.length > 0 && (
                    <div className="mb-3">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-teal-800 block mb-1.5 flex items-center gap-1">
                        <GraduationCap className="w-3.5 h-3.5 text-teal-600" />
                        Can Teach:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {peer.skillsToTeach.map((skill, idx) => (
                          <span
                            key={idx}
                            className="inline-block px-2 py-0.5 rounded-md text-xs font-medium bg-teal-50 text-teal-700 border border-teal-100"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Skills to Learn */}
                  {peer.skillsToLearn && peer.skillsToLearn.length > 0 && (
                    <div className="mb-4">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-800 block mb-1.5 flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                        Wants to Learn:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {peer.skillsToLearn.map((skill, idx) => (
                          <span
                            key={idx}
                            className="inline-block px-2 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Action footer */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2 mt-2">
                  <Link
                    to={`/profile/${peerId}`}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    View Profile
                  </Link>

                  <button
                    onClick={() => openRequestModal(peer)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 shadow-xs transition-colors cursor-pointer"
                  >
                    <Send className="w-3 h-3" />
                    Request Exchange
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {pages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="p-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-medium text-slate-600 px-3">
            Page {page} of {pages}
          </span>
          <button
            disabled={page >= pages}
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            className="p-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Next page"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Request Exchange Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={closeRequestModal}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg absolute top-4 right-4"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <Avatar src={selectedUser.avatar} name={selectedUser.name} size="sm" />
              <div>
                <h3 className="font-bold text-slate-900">Exchange with {selectedUser.name}</h3>
                <p className="text-xs text-slate-500">Propose a skill discussion or exchange</p>
              </div>
            </div>

            {requestSuccess ? (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{requestSuccess}</span>
              </div>
            ) : (
              <form onSubmit={handleSendRequest} className="space-y-4">
                {requestError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <span>{requestError}</span>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="skillWanted"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1"
                  >
                    Skill you want to learn / discuss *
                  </label>
                  <input
                    id="skillWanted"
                    type="text"
                    required
                    value={requestData.skillWanted}
                    onChange={(e) =>
                      setRequestData((prev) => ({ ...prev, skillWanted: e.target.value }))
                    }
                    placeholder="e.g. React, Python, Guitar..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="skillOffered"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1"
                  >
                    Skill you can offer in return (Optional)
                  </label>
                  <input
                    id="skillOffered"
                    type="text"
                    value={requestData.skillOffered}
                    onChange={(e) =>
                      setRequestData((prev) => ({ ...prev, skillOffered: e.target.value }))
                    }
                    placeholder="Leave empty if requesting mentorship only"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    No mandatory barter. You can learn one-way or offer mutual sharing.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="message"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1"
                  >
                    Introductory note (Optional)
                  </label>
                  <textarea
                    id="message"
                    rows="3"
                    value={requestData.message}
                    onChange={(e) =>
                      setRequestData((prev) => ({ ...prev, message: e.target.value }))
                    }
                    placeholder="Say hi and introduce your goals or preferred schedule..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeRequestModal}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingRequest}
                    className="px-4 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 rounded-xl flex items-center gap-1.5 cursor-pointer"
                  >
                    {submittingRequest ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Send Request</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
