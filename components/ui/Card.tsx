
import React from 'react';

type CardProps = React.HTMLAttributes<HTMLDivElement>;

export const Card: React.FC<CardProps> = ({ className, children, ...props }) => {
  return (
    <div
      className={`rounded-lg border bg-white text-gray-900 shadow-sm dark:border-gray-800 dark:bg-gray-800 dark:text-gray-50 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
