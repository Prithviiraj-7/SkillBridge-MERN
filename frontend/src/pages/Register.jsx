import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Sparkles,
  Mail,
  Lock,
  User,
  MapPin,
  Image,
  Loader2,
  AlertCircle,
  BookOpen,
} from 'lucide-react';

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'both',
    bio: '',
    location: '',
    avatar: '',
    skillsToTeachInput: '',
    skillsToLearnInput: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!formData.name.trim() || !formData.email.trim() || !formData.password) {
      setErrorMessage('Please fill in your name, email, and password');
      return;
    }

    if (formData.password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long');
      return;
    }

    // Split comma-separated skills into clean arrays
    const skillsToTeach = formData.skillsToTeachInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const skillsToLearn = formData.skillsToLearnInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    setSubmitting(true);
    const result = await register({
      name: formData.name.trim(),
      email: formData.email.trim(),
      password: formData.password,
      role: formData.role,
      bio: formData.bio.trim(),
      location: formData.location.trim(),
      avatar: formData.avatar.trim() || undefined,
      skillsToTeach,
      skillsToLearn,
    });
    setSubmitting(false);

    if (result.success) {
      navigate('/discover', { replace: true });
    } else {
      setErrorMessage(result.error || 'Failed to register account');
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] py-10 px-4 bg-slate-50 flex items-center justify-center">
      <div className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200/80 shadow-md p-6 sm:p-10">
        <div className="text-center mb-8">
          <div className="w-12 h-12 mx-auto rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center mb-3">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Join the SkillBridge Community
          </h2>
          <p className="text-sm text-slate-600 mt-1.5">
            Share knowledge freely, learn new skills, and connect with peers
          </p>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-2.5"
          >
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-500 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Account Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="name"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1"
              >
                Full Name *
              </label>
              <div className="relative">
                <User className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Priya Patel"
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-900 text-sm"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1"
              >
                Email Address *
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-900 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1"
              >
                Password * (min 6 characters)
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-900 text-sm"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="location"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1"
              >
                City / Location
              </label>
              <div className="relative">
                <MapPin className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="location"
                  name="location"
                  type="text"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="e.g. Bengaluru, India"
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-900 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Role Choice */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
              How do you want to participate?
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  id: 'both',
                  title: 'Both Teach & Learn',
                  desc: 'Share my skills and learn from others',
                },
                {
                  id: 'learner',
                  title: 'Learn Primarily',
                  desc: 'Discover mentors and acquire new skills',
                },
                {
                  id: 'teacher',
                  title: 'Teach Primarily',
                  desc: 'Share expertise and mentor peers',
                },
              ].map((item) => (
                <label
                  key={item.id}
                  className={`flex flex-col p-3 rounded-xl border cursor-pointer transition-all ${
                    formData.role === item.id
                      ? 'border-brand-500 bg-brand-50/50 ring-2 ring-brand-500/10'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="role"
                      value={item.id}
                      checked={formData.role === item.id}
                      onChange={handleChange}
                      className="text-brand-600 focus:ring-brand-500"
                    />
                    <span className="text-sm font-semibold text-slate-900">{item.title}</span>
                  </div>
                  <span className="text-xs text-slate-500 mt-1 pl-5">{item.desc}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Skills Setup */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="skillsToTeachInput"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1"
              >
                Skills you can teach (comma-separated)
              </label>
              <input
                id="skillsToTeachInput"
                name="skillsToTeachInput"
                type="text"
                value={formData.skillsToTeachInput}
                onChange={handleChange}
                placeholder="e.g. React, JavaScript, Python"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-900 text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="skillsToLearnInput"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1"
              >
                Skills you want to learn (comma-separated)
              </label>
              <input
                id="skillsToLearnInput"
                name="skillsToLearnInput"
                type="text"
                value={formData.skillsToLearnInput}
                onChange={handleChange}
                placeholder="e.g. Classical Flute, Data Science"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-900 text-sm"
              />
            </div>
          </div>

          {/* Optional Bio and Avatar */}
          <div>
            <label
              htmlFor="bio"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1"
            >
              Short Bio (Optional)
            </label>
            <textarea
              id="bio"
              name="bio"
              rows="2"
              value={formData.bio}
              onChange={handleChange}
              placeholder="Tell others a little about your learning interests and experience..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-900 text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="avatar"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1"
            >
              Avatar Image URL (Optional)
            </label>
            <div className="relative">
              <Image className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="avatar"
                name="avatar"
                type="url"
                value={formData.avatar}
                onChange={handleChange}
                placeholder="https://example.com/avatar.jpg"
                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-900 text-sm"
              />
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Leave blank to automatically use your initials-based avatar.
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 px-4 rounded-xl font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 shadow-md shadow-brand-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer mt-4"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Creating your account...</span>
              </>
            ) : (
              'Create My SkillBridge Account'
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-100 text-center text-sm text-slate-600">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">
            Log in here
          </Link>
        </div>
      </div>
    </div>
  );
}
