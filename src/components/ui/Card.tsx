import React, { forwardRef } from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', elevated = false, ...props }, ref) => {
    const baseClass = elevated ? 'surface-elevated' : 'surface';
    return (
      <div
        ref={ref}
        className={`${baseClass} ${className}`}
        {...props}
      />
    );
  }
);
Card.displayName = 'Card';
