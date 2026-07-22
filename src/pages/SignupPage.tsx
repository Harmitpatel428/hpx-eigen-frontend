import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import axios from 'axios';

const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  companyName: z.string().min(2, 'Company name is required'),
  agreeToTerms: z.boolean().refine(v => v === true, 'You must agree to terms')
});

type SignupFormData = z.infer<typeof signupSchema>;

export function SignupPage() {
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema)
  });

  const onSubmit = async (data: SignupFormData) => {
    try {
      await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/v1/auth/signup`, {
        email: data.email,
        password: data.password,
        companyName: data.companyName
      });

      toast.success('Signup successful! Check your email to verify your account.');
      navigate('/verify-email', { state: { email: data.email } });
    } catch (error: any) {
      const message = error.response?.data?.message || 'Signup failed. Please try again.';
      toast.error(message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900">
          Create Your Account
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Start managing your deals with HPX Eigen CRM
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-slate-100">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">Email Address</label>
              <input
                {...register('email')}
                type="email"
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white text-slate-900"
                placeholder="you@company.com"
              />
              {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email.message}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">Password</label>
              <input
                {...register('password')}
                type="password"
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white text-slate-900"
                placeholder="Min 8 chars, 1 uppercase, 1 number"
              />
              {errors.password && <p className="text-red-600 text-sm mt-1">{errors.password.message}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">Company Name</label>
              <input
                {...register('companyName')}
                type="text"
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white text-slate-900"
                placeholder="Your company"
              />
              {errors.companyName && <p className="text-red-600 text-sm mt-1">{errors.companyName.message}</p>}
            </div>
            
            <div className="flex items-center">
              <input
                {...register('agreeToTerms')}
                type="checkbox"
                id="terms"
                className="w-4 h-4 bg-slate-50 border border-slate-200 rounded focus:ring-2 focus:ring-slate-900"
              />
              <label htmlFor="terms" className="ml-2 text-sm text-slate-600">
                I agree to the <a href="#" className="text-slate-900 font-medium hover:underline">Terms of Service</a>
              </label>
            </div>
            {errors.agreeToTerms && <p className="text-red-600 text-sm">{errors.agreeToTerms.message}</p>}
            
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-slate-900 text-white py-2 rounded-lg font-medium hover:bg-slate-800 disabled:opacity-50 transition"
            >
              {isSubmitting ? 'Creating account...' : 'Sign Up'}
            </button>
          </form>
          
          <p className="text-center text-slate-600 text-sm mt-6">
            Already have an account? <a href="/login" className="text-slate-900 font-medium hover:underline">Login</a>
          </p>
        </div>
      </div>
    </div>
  );
}
