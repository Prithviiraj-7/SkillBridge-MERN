import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { getErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/common/Avatar';
import { RoleBadge } from '../components/common/Badge';
import {
  MapPin,
  Clock,
  BookOpen,
  GraduationCap,
  Edit3,
  Save,
  X,
  Send,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Plus,
} from 'lucide-react';

export default function Profile() {
  const { id } = useParams();
  const { user: currentUser, updateUser, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Determine if viewing own profile
  const isOwnProfile = !id || (currentUser && (currentUser.id === id || currentUser._id === id));

  const [profileUser, setProfileUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Edit form state
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    location: '',
    avatar: '',
    role: 'both',
    availability: '',
    skillsToTeach: [],
    skillsToLearn: [],
  });

  const [newTeachSkill, setNewTeachSkill] = useState('');
  const [newLearnSkill, setNewLearnSkill] = useState('');
  const [saving, setSaving] = useState(false);

  // Exchange modal state (when viewing other user)
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestSkillWanted, setRequestSkillWanted] = useState('');
  const [requestSkillOffered, setRequestSkillOffered] = useState('');
  const [requestMessage, setRequestMessage] = useState('');
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [requestFeedback, setRequestFeedback] = useState({ error: '', success: '' });

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (isOwnProfile) {
        const res = await api.get('/users/me');
        if (res.data && res.data.success) {
          setProfileUser(res.data.user);
          populateFormData(res.data.user);
        }
      } else {
        const res = await api.get(`/users/${id}`);
        if (res.data && res.data.success) {
          setProfileUser(res.data.user);
        }
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load user profile'));
    } finally {
      setLoading(false);
    }
  }, [id, isOwnProfile]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const populateFormData = (u) => {
    setFormData({
      name: u.name || '',
      bio: u.bio || '',
      location: u.location || '',
      avatar: u.avatar || '',
      role: u.role || 'both',
      availability: u.availability || 'Flexible',
      skillsToTeach: u.skillsToTeach ? [...u.skillsToTeach] : [],
      skillsToLearn: u.skillsToLearn ? [...u.skillsToLearn] : [],
    });
  };

  const handleAddTeachSkill = (e) => {
    e.preventDefault();
    const trimmed = newTeachSkill.trim();
    if (trimmed && !formData.skillsToTeach.includes(trimmed)) {
      setFormData((prev) => ({
        ...prev,
        skillsToTeach: [...prev.skillsToTeach, trimmed],
      }));
      setNewTeachSkill('');
    }
  };

  const handleRemoveTeachSkill = (skillToRemove) => {
    setFormData((prev) => ({
      ...prev,
      skillsToTeach: prev.skillsToTeach.filter((s) => s !== skillToRemove),
    }));
  };

  const handleAddLearnSkill = (e) => {
    e.preventDefault();
    const trimmed = newLearnSkill.trim();
    if (trimmed && !formData.skillsToLearn.includes(trimmed)) {
      setFormData((prev) => ({
        ...prev,
        skillsToLearn: [...prev.skillsToLearn, trimmed],
      }));
      setNewLearnSkill('');
    }
  };

  const handleRemoveLearnSkill = (skillToRemove) => {
    setFormData((prev) => ({
      ...prev,
      skillsToLearn: prev.skillsToLearn.filter((s) => s !== skillToRemove),
    }));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setSaving(true);

    try {
      const res = await api.put('/users/me', {
        name: formData.name.trim(),
        bio: formData.bio.trim(),
        location: formData.location.trim(),
        avatar: formData.avatar.trim() || '',
        role: formData.role,
        availability: formData.availability.trim(),
        skillsToTeach: formData.skillsToTeach,
        skillsToLearn: formData.skillsToLearn,
      });

      if (res.data && res.data.success) {
        setProfileUser(res.data.user);
        updateUser(res.data.user);
        setIsEditing(false);
        setSuccessMessage('Your profile was updated successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update profile'));
    } finally {
      setSaving(false);
    }
  };

  const handleSendRequest = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    setRequestFeedback({ error: '', success: '' });

    if (!requestSkillWanted.trim()) {
      setRequestFeedback({ error: 'Please enter the skill you want to learn', success: '' });
      return;
    }

    setRequestSubmitting(true);
    try {
      const res = await api.post('/requests', {
        recipient: profileUser.id || profileUser._id,
        skillWanted: requestSkillWanted.trim(),
        skillOffered: requestSkillOffered.trim(),
        message: requestMessage.trim(),
      });

      if (res.data && res.data.success) {
        setRequestFeedback({ error: '', success: 'Skill exchange request sent successfully!' });
        setTimeout(() => {
          setShowRequestModal(false);
          setRequestFeedback({ error: '', success: '' });
        }, 1500);
      }
    } catch (err) {
      setRequestFeedback({
        error: getErrorMessage(err, 'Failed to send request'),
        success: '',
      });
    } finally {
      setRequestSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600 mb-2" />
        <p className="text-sm">Loading profile...</p>
      </div>
    );
  }

  if (error && !profileUser) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm mb-4 inline-flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
        <div>
          <button
            onClick={() => navigate('/discover')}
            className="px-4 py-2 bg-brand-600 text-white rounded-xl text-sm font-semibold"
          >
            Back to Discover
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Success banner */}
      {successMessage && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Profile Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Banner strip */}
        <div className="h-32 bg-gradient-to-r from-brand-600 via-teal-500 to-amber-500" />

        <div className="px-6 sm:px-10 pb-8">
          {/* Avatar and Action Header */}
          <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between -mt-16 mb-6 gap-4 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Avatar
                src={isEditing ? formData.avatar : profileUser?.avatar}
                name={profileUser?.name}
                size="xl"
                className="ring-4 ring-white"
              />
              <div className="mt-2 sm:mt-12">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h1 className="text-2xl font-bold text-slate-900">{profileUser?.name}</h1>
                  <RoleBadge role={isEditing ? formData.role : profileUser?.role} />
                </div>
                {profileUser?.location && (
                  <p className="text-sm text-slate-500 flex items-center justify-center sm:justify-start gap-1 mt-1">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    {profileUser?.location}
                  </p>
                )}
              </div>
            </div>

            {/* Top CTA */}
            <div className="mt-4 sm:mt-12">
              {isOwnProfile ? (
                isEditing ? (
                  <button
                    type="button"
                    onClick={() => {
                      populateFormData(profileUser);
                      setIsEditing(false);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200"
                  >
                    Cancel
                  </button>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 shadow-sm"
                  >
                    <Edit3 className="w-4 h-4" />
                    Edit Profile
                  </button>
                )
              ) : (
                <button
                  onClick={() => setShowRequestModal(true)}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 shadow-md shadow-brand-500/20"
                >
                  <Send className="w-4 h-4" />
                  Request Skill Exchange
                </button>
              )}
            </div>
          </div>

          {/* EDIT MODE */}
          {isEditing ? (
            <form onSubmit={handleSaveProfile} className="space-y-6 pt-4 border-t border-slate-100">
              {error && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="displayName" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Display Name *
                  </label>
                  <input
                    id="displayName"
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label htmlFor="location" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    City / Location
                  </label>
                  <input
                    id="location"
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g. Pune, India"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="bio" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Bio / About Me
                </label>
                <textarea
                  id="bio"
                  rows="3"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Share a brief overview of your background and learning goals..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="role" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Community Role
                  </label>
                  <select
                    id="role"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm bg-white"
                  >
                    <option value="both">Both Teach & Learn</option>
                    <option value="teacher">Teach Primarily</option>
                    <option value="learner">Learn Primarily</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="availability" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Availability
                  </label>
                  <input
                    id="availability"
                    type="text"
                    value={formData.availability}
                    onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
                    placeholder="e.g. Weekends, Flexible evenings"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="avatar" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Avatar Image URL
                </label>
                <input
                  id="avatar"
                  type="url"
                  value={formData.avatar}
                  onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                  placeholder="https://example.com/photo.jpg"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:ring-brand-500"
                />
              </div>

              {/* Skills to Teach Tag Editor */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-teal-800 mb-2">
                  Skills you can teach
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.skillsToTeach.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-teal-50 text-teal-700 border border-teal-200"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => handleRemoveTeachSkill(skill)}
                        className="text-teal-500 hover:text-teal-800"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add a skill you can teach..."
                    value={newTeachSkill}
                    onChange={(e) => setNewTeachSkill(e.target.value)}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs sm:text-sm flex-1"
                  />
                  <button
                    type="button"
                    onClick={handleAddTeachSkill}
                    className="px-3 py-1.5 bg-teal-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add
                  </button>
                </div>
              </div>

              {/* Skills to Learn Tag Editor */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-amber-800 mb-2">
                  Skills you want to learn
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.skillsToLearn.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => handleRemoveLearnSkill(skill)}
                        className="text-amber-500 hover:text-amber-800"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add a skill you want to learn..."
                    value={newLearnSkill}
                    onChange={(e) => setNewLearnSkill(e.target.value)}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs sm:text-sm flex-1"
                  />
                  <button
                    type="button"
                    onClick={handleAddLearnSkill}
                    className="px-3 py-1.5 bg-amber-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Profile</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* VIEW MODE */
            <div className="space-y-6 pt-4 border-t border-slate-100">
              {/* Bio & Availability */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  About
                </h3>
                <p className="text-slate-700 text-sm leading-relaxed">
                  {profileUser?.bio || 'No bio shared yet.'}
                </p>
                {profileUser?.availability && (
                  <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-medium text-slate-600">Availability:</span>{' '}
                    {profileUser.availability}
                  </p>
                )}
              </div>

              {/* Skills to Teach */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-teal-800 mb-2 flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-teal-600" />
                  Skills to Teach
                </h3>
                {profileUser?.skillsToTeach && profileUser.skillsToTeach.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {profileUser.skillsToTeach.map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 rounded-lg text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200/80"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">None listed yet.</p>
                )}
              </div>

              {/* Skills to Learn */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-800 mb-2 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-amber-600" />
                  Skills to Learn
                </h3>
                {profileUser?.skillsToLearn && profileUser.skillsToLearn.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {profileUser.skillsToLearn.map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200/80"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">None listed yet.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Exchange Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setShowRequestModal(false)}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg absolute top-4 right-4"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <Avatar src={profileUser?.avatar} name={profileUser?.name} size="sm" />
              <div>
                <h3 className="font-bold text-slate-900">Exchange with {profileUser?.name}</h3>
                <p className="text-xs text-slate-500">Propose a skill exchange or learning session</p>
              </div>
            </div>

            {requestFeedback.success ? (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{requestFeedback.success}</span>
              </div>
            ) : (
              <form onSubmit={handleSendRequest} className="space-y-4">
                {requestFeedback.error && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <span>{requestFeedback.error}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Skill you want to learn *
                  </label>
                  <input
                    type="text"
                    required
                    value={requestSkillWanted}
                    onChange={(e) => setRequestSkillWanted(e.target.value)}
                    placeholder="e.g. React, Python..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Skill you can offer in return (Optional)
                  </label>
                  <input
                    type="text"
                    value={requestSkillOffered}
                    onChange={(e) => setRequestSkillOffered(e.target.value)}
                    placeholder="Leave empty for mentorship only"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Introductory note (Optional)
                  </label>
                  <textarea
                    rows="3"
                    value={requestMessage}
                    onChange={(e) => setRequestMessage(e.target.value)}
                    placeholder="Say hello and describe your availability..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:ring-brand-500"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowRequestModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={requestSubmitting}
                    className="px-4 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 rounded-xl flex items-center gap-1.5"
                  >
                    {requestSubmitting ? (
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
