import React, { useEffect, useState } from 'react';
import { Mail, ArrowRight, RotateCcw } from 'lucide-react';
import { api } from '../services/api';

interface VerificationModalProps {
  email: string;
  isOpen: boolean;
  onClose: () => void;
}

export const VerificationModal: React.FC<VerificationModalProps> = ({ email, isOpen, onClose }) => {
  const [resending, setResending] = React.useState(false);
  const [resendSuccess, setResendSuccess] = React.useState(false);
  const [error, setError] = React.useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
    }
  }, [isOpen]);

  const handleResend = async () => {
    setResending(true);
    setError('');
    setResendSuccess(false);
    try {
      await api.post('/api/v1/auth/resend-verification', { email });
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to resend verification email.');
    } finally {
      setResending(false);
    }
  };

  if (!mounted) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black z-40 transition-opacity duration-300 ease-out ${
          isOpen ? 'opacity-30' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        style={{ backdropFilter: isOpen ? 'blur(8px)' : 'blur(0px)' }}
      />

      {/* Modal Container - Centered in viewport */}
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ease-out ${
          isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
        }`}
      >
        {/* Modal Card */}
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
          {/* Header Section */}
          <div className="pt-12 px-8 pb-8 text-center">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6 mx-auto shadow-sm">
              <Mail size={32} strokeWidth={1.5} />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3 tracking-tight">
              Verify your email
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              We've sent a verification link to{' '}
              <span className="font-semibold text-gray-900">{email}</span>. Check your inbox to activate your account.
            </p>
          </div>

          {/* Messages Section */}
          <div className="px-8 min-h-12">
            {error && (
              <div className="text-red-600 text-sm bg-red-50 py-3 px-4 rounded-lg border border-red-200 animate-in fade-in duration-200">
                {error}
              </div>
            )}
            {resendSuccess && (
              <div className="text-green-600 text-sm bg-green-50 py-3 px-4 rounded-lg border border-green-200 animate-in fade-in duration-200">
                ✓ Verification email sent successfully!
              </div>
            )}
          </div>

          {/* Actions Section */}
          <div className="px-8 py-8 space-y-3 border-t border-gray-100">
            <button
              onClick={handleResend}
              disabled={resending}
              className="relative w-full py-3 px-4 bg-gray-900 hover:bg-gray-800 active:bg-gray-950 text-white font-medium rounded-xl transition-all duration-150 ease-out disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {resending ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <RotateCcw size={18} strokeWidth={2} />
                  Resend Email
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="w-full py-3 px-4 text-gray-700 hover:text-gray-900 hover:bg-gray-50 active:bg-gray-100 font-medium rounded-xl transition-all duration-150 ease-out flex items-center justify-center gap-2"
            >
              <ArrowRight size={18} strokeWidth={2} className="rotate-180" />
              Back to Login
            </button>
          </div>

          {/* Footer Hint */}
          <div className="px-8 py-4 bg-gray-50 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-500">
              Didn't receive it? Check spam folder or resend after 1 minute.
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .animate-in {
          animation: fadeIn 0.2s ease-out forwards;
        }
      `}</style>
    </>
  );
};
