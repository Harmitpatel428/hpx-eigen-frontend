import React, { ReactNode } from 'react';
import { ChevronDown, X } from 'lucide-react';

interface FilterOption {
  value: string;
  label: string;
}

interface FilterSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: () => void;
  onReset: () => void;
  children: ReactNode;
  title?: string;
}

export function FilterSidebar({ isOpen, onClose, onApply, onReset, children, title = 'Filters' }: FilterSidebarProps) {
  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={onClose} />
      )}

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-screen bg-[#0a0e27] border-r border-[#16213e] z-40 transition-transform duration-300 w-64 ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } md:static md:w-64`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#16213e] md:hidden">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Hidden on mobile */}
        <div className="hidden md:block p-4 border-b border-[#16213e]">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
        </div>

        {/* Filters */}
        <div className="p-4 space-y-6 overflow-y-auto h-[calc(100vh-140px)]">
          {children}
        </div>

        {/* Footer buttons */}
        <div className="absolute bottom-0 left-0 right-0 bg-[#0a0e27] border-t border-[#16213e] p-4 space-y-2 md:static md:flex md:gap-2">
          <button
            onClick={onReset}
            className="w-full px-4 py-2 text-sm text-gray-300 bg-transparent border border-[#16213e] rounded-lg hover:bg-[#16213e] transition-colors"
          >
            Reset
          </button>
          <button
            onClick={onApply}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Apply
          </button>
        </div>
      </div>
    </>
  );
}

// Filter input components

export function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
}) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div>
      <label className="block text-xs font-medium text-gray-300 mb-2">{label}</label>
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-3 py-2 bg-[#16213e] border border-[#16213e] rounded-lg text-sm text-white text-left flex items-center justify-between hover:border-blue-500/50 transition-colors"
        >
          {options.find((o) => o.value === value)?.label || 'Select...'}
          <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a2e] border border-[#16213e] rounded-lg shadow-lg z-50">
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                  value === opt.value ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-[#16213e]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function FilterCheckbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 bg-[#16213e] border border-[#16213e] rounded cursor-pointer accent-blue-600"
      />
      <span className="text-sm text-gray-300">{label}</span>
    </label>
  );
}

export function FilterDateRange({
  label,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}: {
  label: string;
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-300 mb-2">{label}</label>
      <div className="space-y-2">
        <input
          type="date"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          className="w-full px-3 py-2 bg-[#16213e] border border-[#16213e] rounded-lg text-sm text-white placeholder-gray-500"
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
          className="w-full px-3 py-2 bg-[#16213e] border border-[#16213e] rounded-lg text-sm text-white placeholder-gray-500"
        />
      </div>
    </div>
  );
}

export function FilterSlider({
  label,
  min,
  max,
  value,
  onChange,
  step = 1,
  formatValue,
}: {
  label: string;
  min: number;
  max: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  step?: number;
  formatValue?: (v: number) => string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-300 mb-2">{label}</label>
      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            type="number"
            value={value[0]}
            onChange={(e) => onChange([Number(e.target.value), value[1]])}
            className="flex-1 px-3 py-2 bg-[#16213e] border border-[#16213e] rounded-lg text-sm text-white"
          />
          <span className="text-gray-400">—</span>
          <input
            type="number"
            value={value[1]}
            onChange={(e) => onChange([value[0], Number(e.target.value)])}
            className="flex-1 px-3 py-2 bg-[#16213e] border border-[#16213e] rounded-lg text-sm text-white"
          />
        </div>
        {formatValue && (
          <div className="text-xs text-gray-400">
            {formatValue(value[0])} — {formatValue(value[1])}
          </div>
        )}
      </div>
    </div>
  );
}
