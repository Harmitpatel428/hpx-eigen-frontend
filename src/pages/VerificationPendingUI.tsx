import React from 'react';
import { Mail, ArrowRight, RotateCcw } from 'lucide-react';
import { api } from '../services/api';

interface VerificationPendingUIProps {
  email: string;
  onBackToLogin: () => void;
}

export const VerificationPendingUI: React.FC<VerificationPendingUIProps> = ({ email, onBackToLogin }) => {
  const [resending, setResending] = React.useState(false);
  const [resendSuccess, setResendSuccess] = React.useState(false);
  const [error, setError] = React.useState('');

  const handleResend = async () => {
    setResending(true);
    setError('');
    setResendSuccess(false);
    try {
      await api.post('/api/auth/resend-verification', { email });
      setResendSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to resend verification email.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] w-full text-center p-8">
      <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6 shadow-sm">
        <Mail size={32} />
      </div>
      <h2 className="text-2xl font-semibold text-gray-900 mb-3">Verify your email address</h2>
      <p className="text-gray-600 mb-8 max-w-sm leading-relaxed">
        We've sent a verification link to <span className="font-medium text-gray-900">{email}</span>. 
        Please check your inbox to activate your account.
      </p>

      {error && (
        <div className="text-red-600 text-sm mb-4 bg-red-50 py-2 px-4 rounded-md w-full max-w-sm">
          {error}
        </div>
      )}

      {resendSuccess && (
        <div className="text-green-600 text-sm mb-4 bg-green-50 py-2 px-4 rounded-md w-full max-w-sm">
          Verification email sent successfully!
        </div>
      )}

      <div className="flex flex-col gap-4 w-full max-w-xs">
        <button
          onClick={handleResend}
          disabled={resending}
          className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          {resending ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <RotateCcw size={18} />
              Resend Email
            </>
          )}
        </button>
        <button
          onClick={onBackToLogin}
          className="flex items-center justify-center gap-2 w-full py-2.5 px-4 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
        >
          <ArrowRight size={18} className="rotate-180" />
          Back to Login
        </button>
      </div>
    </div>
  );
};
