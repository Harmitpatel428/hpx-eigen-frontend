import React from 'react';
import { DepartmentSwitcher } from '../ui/DepartmentSwitcher';
import { BellDot, Search } from 'lucide-react';

export const TopBar: React.FC = () => {
  return (
    <header className="flex h-14 items-center border-b border-gray-100/80 bg-white/90 px-6 backdrop-blur-xl">
      <DepartmentSwitcher />

      <div className="ml-auto flex items-center gap-1.5">

        {/* ⌘K Quick Search */}
        <button className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-[13px] text-gray-400 ring-1 ring-gray-200 transition-all hover:bg-gray-50 hover:text-gray-600 hover:ring-gray-300">
          <Search size={13} strokeWidth={2} />
          <span className="hidden sm:inline font-medium">Search</span>
          <kbd className="hidden sm:inline rounded bg-gray-100 px-1 py-0.5 text-[10px] font-medium text-gray-400">⌘K</kbd>
        </button>

        {/* Notifications */}
        <button className="relative rounded-lg p-2 text-gray-400 transition-all hover:bg-gray-50 hover:text-gray-700">
          <BellDot size={17} strokeWidth={1.5} />
          <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-violet-500" />
          </span>
        </button>

        {/* User Avatar */}
        <button className="ml-1 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-[12px] font-semibold text-white transition-all duration-200 hover:scale-105"
          style={{ boxShadow: '0 0 0 2px #fff, 0 0 0 3.5px rgba(139,92,246,0.35)' }}>
          AU
        </button>

      </div>
    </header>
  );
};
