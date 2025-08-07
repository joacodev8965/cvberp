

import React from 'react';
import { Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

interface HeaderProps {
  title: string;
  onMenuClick: () => void;
  isDesktopSidebarVisible: boolean;
  toggleDesktopSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title, onMenuClick, isDesktopSidebarVisible, toggleDesktopSidebar }) => {
  return (
    <header className="bg-white dark:bg-gray-800 shadow-md p-4 flex items-center flex-shrink-0">
       <button
        onClick={toggleDesktopSidebar}
        className="hidden md:block text-gray-500 dark:text-gray-400 mr-4"
        aria-label="Toggle sidebar"
      >
        {isDesktopSidebarVisible ? <PanelLeftClose className="h-6 w-6" /> : <PanelLeftOpen className="h-6 w-6" />}
      </button>
      <button 
        onClick={onMenuClick} 
        className="text-gray-500 dark:text-gray-400 mr-4 md:hidden"
        aria-label="Open sidebar"
      >
        <Menu className="h-6 w-6" />
      </button>
      <h1 className="text-xl sm:text-2xl font-semibold text-gray-800 dark:text-gray-100">{title}</h1>
    </header>
  );
};