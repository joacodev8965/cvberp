
import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'ghost';
  size?: 'default' | 'sm';
}

export const Button: React.FC<ButtonProps> = ({ className, variant = 'default', size = 'default', children, ...props }) => {
  const baseClasses = 'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';
  
  const variantClasses = {
    default: 'bg-indigo-600 text-white hover:bg-indigo-700',
    ghost: 'bg-transparent hover:bg-gray-200 dark:hover:bg-gray-700',
  }[variant];

  const sizeClasses = {
    default: 'h-10 px-4 py-2',
    sm: 'h-9 rounded-md px-3',
  }[size];

  return (
    <button
      className={[baseClasses, variantClasses, sizeClasses, className].filter(Boolean).join(' ')}
      {...props}
    >
      {children}
    </button>
  );
};
