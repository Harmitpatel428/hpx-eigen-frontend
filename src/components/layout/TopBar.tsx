import React from 'react';
import { DepartmentSwitcher } from '../ui/DepartmentSwitcher';
import { Bell, Moon, User } from 'lucide-react';

export const TopBar: React.FC = () => {
  return (
    <header className="flex h-16 items-center border-b border-gray-100 bg-white/80 px-6 backdrop-blur-xl">
      <DepartmentSwitcher />

      <div className="ml-auto flex items-center gap-2">
        <button className="rounded-full p-2.5 text-gray-400 transition-all hover:bg-gray-100 hover:text-gray-700">
          <Moon className="h-[18px] w-[18px]" strokeWidth={1.5} />
        </button>
        <button className="relative rounded-full p-2.5 text-gray-400 transition-all hover:bg-gray-100 hover:text-gray-700">
          <Bell className="h-[18px] w-[18px]" strokeWidth={1.5} />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
        </button>
        <button className="ml-1 flex h-9 w-9 items-center justify-center rounded-full bg-purple-600 text-[13px] font-semibold text-white shadow-sm transition-transform hover:scale-105">
          AU
        </button>
      </div>
    </header>
  );
};
