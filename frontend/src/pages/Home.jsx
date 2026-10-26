import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Compass,
  ArrowRight,
  BookOpen,
  Users,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  HeartHandshake,
} from 'lucide-react';

export default function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 sm:py-24 bg-gradient-to-b from-brand-50/70 via-white to-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-100/80 border border-brand-200 text-brand-800 text-xs sm:text-sm font-semibold mb-6 shadow-xs">
            <Sparkles className="w-4 h-4 text-brand-600" />
            Flexible Peer-to-Peer Skill Exchange
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 tracking-tight max-w-3xl mx-auto leading-tight">
            Share what you know. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-teal-500">
              Learn what you love.
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            SkillBridge connects curious minds to exchange knowledge on their own terms.
            Teach coding, learn classical music, or practice languages — without mandatory barter, credits, or rigid pricing.
          </p>

          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <Link
              to="/discover"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-base font-semibold text-white bg-brand-600 hover:bg-brand-700 shadow-md shadow-brand-500/20 hover:shadow-lg transition-all"
            >
              <Compass className="w-5 h-5" />
              Discover Skills & Peers
            </Link>

            {!isAuthenticated && (
              <Link
                to="/register"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-base font-semibold text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 shadow-xs hover:border-slate-300 transition-all"
              >
                Join the Community
                <ArrowRight className="w-4 h-4 text-slate-500" />
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Community Values & Features */}
      <section className="py-16 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Why SkillBridge is different
            </h2>
            <p className="mt-3 text-slate-600">
              Built for real human connection, student collaboration, and mutual growth.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-slate-50/80 rounded-2xl p-6 border border-slate-200/70 shadow-xs hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center mb-5">
                <HeartHandshake className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Teach, Learn, or Both</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                You do not have to pick a rigid lane. Offer your strengths, explore new curiosities,
                or arrange genuine bilateral skill exchanges.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-slate-50/80 rounded-2xl p-6 border border-slate-200/70 shadow-xs hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-5">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Zero Artificial Barriers</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                No credit tokens, forced transactions, or compulsory session booking. Connect with peers
                and agree on schedules that work naturally for both of you.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-slate-50/80 rounded-2xl p-6 border border-slate-200/70 shadow-xs hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-5">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Direct & Safe Messaging</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                When a request is accepted, jump straight into a private conversation to discuss
                session goals, materials, and study plans.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Walkthrough */}
      <section className="py-16 bg-slate-50 border-t border-slate-200/60">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              How SkillBridge Works in 3 Simple Steps
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs">
              <span className="text-2xl font-black text-brand-600">01</span>
              <h4 className="text-base font-bold text-slate-900 mt-2 mb-1">Set Your Skills</h4>
              <p className="text-sm text-slate-600">
                List the skills you can teach and the topics you are curious to learn.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs">
              <span className="text-2xl font-black text-brand-600">02</span>
              <h4 className="text-base font-bold text-slate-900 mt-2 mb-1">Send a Request</h4>
              <p className="text-sm text-slate-600">
                Discover peers by skill or location and propose a session or conversation.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs">
              <span className="text-2xl font-black text-brand-600">03</span>
              <h4 className="text-base font-bold text-slate-900 mt-2 mb-1">Connect & Learn</h4>
              <p className="text-sm text-slate-600">
                Once accepted, chat directly, share resources, and help each other grow.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
