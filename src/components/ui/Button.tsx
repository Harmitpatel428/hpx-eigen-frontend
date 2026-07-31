import React, { forwardRef } from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'icon';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`btn btn-${variant} ${className}`}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
