
import React from 'react';
import { Card } from './Card';
import { Button } from './Button';
import { X } from 'lucide-react';

interface ModalProps {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
  size?: 'sm' | 'lg' | '2xl' | '4xl' | '6xl' | 'full';
  className?: string;
  footer?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  children,
  onClose,
  title,
  size = '2xl',
  className,
  footer,
}) => {
  const sizeClasses = {
    sm: 'max-w-sm',
    lg: 'max-w-lg',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
    '6xl': 'max-w-6xl',
    full: 'max-w-full h-full rounded-none',
  };

  return (
    <div
      className={`fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4 ${className ?? ''}`}
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <Card
        className={`w-full ${sizeClasses[size]} max-h-[90vh] flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center flex-shrink-0">
          <h3 className="text-lg font-bold">{title}</h3>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Cerrar modal">
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="p-4 overflow-y-auto flex-grow">{children}</div>
        {footer && (
          <div className="p-4 border-t dark:border-gray-700 flex-shrink-0">
            {footer}
          </div>
        )}
      </Card>
    </div>
  );
};
