import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import axios from 'axios';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'waiting'>('loading');
  const [message, setMessage] = useState('');
  const token = searchParams.get('token');
  const email = location.state?.email;

  useEffect(() => {
    if (!token) {
      if (email) {
        setStatus('waiting');
      } else {
        setStatus('error');
        setMessage('No verification token found. Please check your email link.');
      }
      return;
    }

    const verify = async () => {
      try {
        await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/v1/auth/verify?token=${token}`);
        setStatus('success');
        setMessage('Email verified successfully! Redirecting to login...');
        toast.success('Email verified!');
        
        setTimeout(() => navigate('/login'), 2000);
      } catch (error: any) {
        setStatus('error');
        const errorMsg = error.response?.data?.message || 'Verification failed. Link may be expired.';
        setMessage(errorMsg);
        toast.error(errorMsg);
      }
    };
    
    verify();
  }, [token, navigate]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center bg-white py-12 px-8 shadow sm:rounded-lg border border-slate-100">
        
        {status === 'loading' && (
          <>
            <div className="mb-4 flex justify-center">
              <svg className="animate-spin h-10 w-10 text-slate-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Verifying Email</h2>
            <p className="text-slate-600">Please wait while we verify your email address...</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <div className="mb-4">
              <div className="inline-block bg-green-50 p-3 rounded-full">
                <svg className="w-10 h-10 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Email Verified!</h2>
            <p className="text-slate-600 mb-6">{message}</p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <div className="mb-4">
              <div className="inline-block bg-red-50 p-3 rounded-full">
                <svg className="w-10 h-10 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Verification Failed</h2>
            <p className="text-slate-600 mb-6">{message}</p>
            <a href="/login" className="inline-block bg-slate-900 text-white px-6 py-2 rounded-lg font-medium hover:bg-slate-800 transition">
              Return to Login
            </a>
          </>
        )}

        {status === 'waiting' && (
          <>
            <div className="mb-4">
              <div className="inline-block bg-blue-50 p-3 rounded-full">
                <svg className="w-10 h-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Check your inbox</h2>
            <p className="text-slate-600 mb-6">
              A verification email has been sent to <strong>{email}</strong>. Please check your inbox.
            </p>
            <a href="/login" className="inline-block bg-slate-900 text-white px-6 py-2 rounded-lg font-medium hover:bg-slate-800 transition">
              Return to Login
            </a>
          </>
        )}
      </div>
    </div>
  );
}
