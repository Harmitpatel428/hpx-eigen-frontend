import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { tokenStorage } from '../auth/storage/tokenStorage';

type InviteInfo = {
  email: string;
  roleName: string;
  expiresAt: string;
  userExists: boolean;
};

type PageState =
  | 'loading'
  | 'invalid'
  | 'expired'
  | 'revoked'
  | 'already_accepted'
  | 'form'
  | 'submitting'
  | 'success';

const API = import.meta.env.VITE_API_URL || '';

export function AcceptInvitePage() {
  // Token stays in React state only — never written to localStorage/sessionStorage
  const [token] = useState<string>(() => new URLSearchParams(window.location.search).get('token') ?? '');

  const [pageState, setPageState] = useState<PageState>('loading');
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Form fields
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setPageState('invalid');
      return;
    }

    axios.get(`${API}/api/v1/auth/invite/${token}`)
      .then((res) => {
        setInviteInfo(res.data);
        setPageState('form');
      })
      .catch((err) => {
        const code = err.response?.data?.code;
        if (code === 'INVITATION_EXPIRED') {
          setPageState('expired');
        } else if (code === 'INVITATION_REVOKED') {
          setPageState('revoked');
        } else if (code === 'INVITATION_ALREADY_ACCEPTED') {
          setPageState('already_accepted');
        } else {
          setPageState('invalid');
          setErrorMessage(err.response?.data?.message || 'This invitation link is invalid.');
        }
      });
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    setFormError('');

    if (!inviteInfo?.userExists) {
      if (password.length < 8) { setFormError('Password must be at least 8 characters.'); return; }
      if (password !== confirmPassword) { setFormError('Passwords do not match.'); return; }
    }

    setSubmitting(true);
    setPageState('submitting');

    try {
      const body: Record<string, string> = { token };
      if (!inviteInfo?.userExists) {
        body.password = password;
      }

      const res = await axios.post(`${API}/api/v1/auth/accept-invite`, body);
      const { accessToken, refreshToken, sessionId, user } = res.data?.data ?? {};

      if (accessToken) {
        tokenStorage.set({ accessToken, refreshToken, sessionId: sessionId ?? '', userId: user?.id ?? '' });
      }

      setPageState('success');
      // Brief pause so the success message renders before navigation
      setTimeout(() => { window.location.href = '/overview'; }, 1200);
    } catch (err: any) {
      setSubmitting(false);
      setPageState('form');
      const code = err.response?.data?.code;
      if (code === 'INVITATION_ALREADY_ACCEPTED') {
        setPageState('already_accepted');
      } else if (code === 'INVITATION_EXPIRED') {
        setPageState('expired');
      } else {
        setFormError(err.response?.data?.message || 'Something went wrong. Please try again.');
      }
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white py-12 px-8 shadow-lg rounded-2xl border border-slate-100">

        {pageState === 'loading' && (
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <svg className="animate-spin h-10 w-10 text-slate-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Loading invitation…</h2>
          </div>
        )}

        {pageState === 'submitting' && (
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <svg className="animate-spin h-10 w-10 text-slate-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Accepting invitation…</h2>
          </div>
        )}

        {pageState === 'success' && (
          <div className="text-center">
            <div className="mb-4 flex justify-center">
              <div className="inline-block bg-green-50 p-3 rounded-full">
                <svg className="w-10 h-10 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Welcome!</h2>
            <p className="text-slate-600">Invitation accepted. Taking you to your workspace…</p>
          </div>
        )}

        {(pageState === 'invalid' || pageState === 'expired' || pageState === 'revoked' || pageState === 'already_accepted') && (
          <div className="text-center">
            <div className="mb-4 flex justify-center">
              <div className="inline-block bg-red-50 p-3 rounded-full">
                <svg className="w-10 h-10 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              {pageState === 'expired' ? 'Invitation Expired' :
               pageState === 'revoked' ? 'Invitation Revoked' :
               pageState === 'already_accepted' ? 'Already Accepted' :
               'Invalid Invitation'}
            </h2>
            <p className="text-slate-600 mb-6">
              {pageState === 'expired'
                ? 'This invitation has expired. Contact your organization administrator for a new invitation.'
                : pageState === 'revoked'
                ? 'This invitation has been revoked. Contact your organization administrator.'
                : pageState === 'already_accepted'
                ? 'This invitation has already been accepted. Sign in to access your account.'
                : errorMessage || 'This invitation link is invalid or has already been used.'}
            </p>
            <a href="/login" className="inline-block bg-slate-900 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-slate-800 transition">
              Go to Login
            </a>
          </div>
        )}

        {pageState === 'form' && inviteInfo && (
          <>
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-bold text-slate-900 mb-1">You're invited</h2>
              <p className="text-slate-600 text-sm">
                Join as <strong>{inviteInfo.roleName}</strong> — invitation for <strong>{inviteInfo.email}</strong>
              </p>
            </div>

            {inviteInfo.userExists ? (
              // Existing user — just confirm
              <div>
                <div className="bg-slate-50 rounded-xl p-4 mb-6 text-sm text-slate-700">
                  Your existing account will receive the <strong>{inviteInfo.roleName}</strong> role.
                  No password change required.
                </div>
                {formError && <p className="text-red-600 text-sm mb-4">{formError}</p>}
                <button
                  onClick={handleSubmit as any}
                  disabled={submitting}
                  className="w-full bg-slate-900 text-white py-2.5 rounded-lg font-semibold hover:bg-slate-800 transition disabled:opacity-60"
                >
                  Accept Invitation
                </button>
              </div>
            ) : (
              // New user — name + password
              <form onSubmit={handleSubmit} noValidate>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                    autoComplete="new-password"
                    autoFocus
                  />
                </div>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                    autoComplete="new-password"
                  />
                </div>
                {formError && <p className="text-red-600 text-sm mb-4">{formError}</p>}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-slate-900 text-white py-2.5 rounded-lg font-semibold hover:bg-slate-800 transition disabled:opacity-60"
                >
                  Create Account & Accept
                </button>
              </form>
            )}

            <p className="text-xs text-slate-400 text-center mt-6">
              Invitation expires {new Date(inviteInfo.expiresAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
