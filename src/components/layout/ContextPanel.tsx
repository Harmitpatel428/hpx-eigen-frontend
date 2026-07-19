import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ContextPanelProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  width?: number | string;
}

export function ContextPanel({ isOpen, onClose, children, width = 600 }: ContextPanelProps) {
  // Prevent scrolling on body when panel is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(2px)',
          zIndex: 999,
          animation: 'fadeIn 0.2s ease-out forwards',
        }}
      />
      
      {/* Panel */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width,
          maxWidth: '90vw',
          backgroundColor: 'var(--bg-app)',
          borderLeft: '1px solid var(--border-medium)',
          boxShadow: 'var(--shadow-xl)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        }}
      >
        <button 
          onClick={onClose}
          className="btn-icon"
          style={{
            position: 'absolute',
            top: 'var(--space-4)',
            right: 'var(--space-4)',
            zIndex: 10,
            backgroundColor: 'var(--bg-app)',
            border: '1px solid var(--border-light)'
          }}
        >
          <X size={16} />
        </button>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {children}
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </>
  );
}
