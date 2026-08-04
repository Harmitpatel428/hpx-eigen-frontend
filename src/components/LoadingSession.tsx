import React from 'react';

export function LoadingSessionScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
      <div className="text-center space-y-8">
        {/* Animated logo fallback since LogoIcon isn't provided here */}
        <div className="animate-pulse flex justify-center">
          <div className="w-12 h-12 rounded-full border-4 border-blue-400 border-t-transparent animate-spin mx-auto"></div>
        </div>
        
        {/* Skeleton dashboard preview */}
        <div className="space-y-4 max-w-md mx-auto w-64">
          <div className="h-4 bg-slate-700 rounded animate-pulse" />
          <div className="h-4 bg-slate-700 rounded animate-pulse w-5/6 mx-auto" />
          <div className="h-4 bg-slate-700 rounded animate-pulse w-4/6 mx-auto" />
        </div>
        
        {/* Status text */}
        <p className="text-slate-400 animate-pulse">Restoring your session...</p>
      </div>
    </div>
  );
}
