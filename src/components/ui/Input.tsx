import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hero?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', hero = false, ...props }, ref) => {
    const baseClass = hero ? 'input-hero' : 'input';
    return (
      <input
        ref={ref}
        className={`${baseClass} ${className}`}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';
