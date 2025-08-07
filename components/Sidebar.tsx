
import React, { useState } from 'react';
import { Page } from '../types';
import type { LucideIcon } from 'lucide-react';
import { ChevronDown } from 'lucide-react';

interface PageItem {
  id: Page;
  title: string;
  icon: LucideIcon;
}

interface PageConfigItem {
  id: string | Page;
  title: string;
  icon: LucideIcon;
  isCategory: boolean;
  pages?: PageItem[];
}

interface SidebarProps {
  activePage: Page;
  setActivePage: (page: Page) => void;
  pageConfig: PageConfigItem[];
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  isDesktopSidebarVisible: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ activePage, setActivePage, pageConfig, isOpen, setIsOpen, isDesktopSidebarVisible }) => {
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    'PRODUCCION': true,
    'VENTAS': true,
    'ADMINISTRACION': true,
    'SOCIOS/GERENTE': true,
  });

  const toggleCategory = (categoryId: string) => {
    setOpenCategories(prev => ({ ...prev, [categoryId]: !prev[categoryId] }));
  };

  const handlePageClick = (page: Page) => {
    setActivePage(page);
    setIsOpen(false);
  };

  const renderPageButton = (page: Page, title: string, Icon: LucideIcon, isSubItem: boolean = false) => {
    const isActive = activePage === page;
    return (
      <li key={page}>
        <button
          onClick={() => handlePageClick(page)}
          className={`flex items-center w-full px-4 py-3 my-1 text-left rounded-lg transition-colors duration-200 ${
            isSubItem ? 'pl-8' : ''
          } ${
            isActive
              ? 'bg-indigo-500 text-white'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          <Icon className={`h-5 w-5 mr-3 flex-shrink-0 ${isSubItem ? 'h-4 w-4' : ''}`} />
          <span className="font-medium truncate">{title}</span>
        </button>
      </li>
    );
  };
  
  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={() => setIsOpen(false)}
        ></div>
      )}

      <nav className={`flex flex-col bg-white dark:bg-gray-800 shadow-lg fixed md:relative h-full z-30 transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full'} md:translate-x-0 ${isDesktopSidebarVisible ? 'md:w-64' : 'md:w-0'}`}>
        <div className="flex items-center justify-center h-20 border-b dark:border-gray-700 flex-shrink-0 px-4">
           <span style={{ fontFamily: "'Oswald', sans-serif" }} className="text-xl font-bold tracking-wider text-gray-800 dark:text-gray-100 text-center leading-tight">
            CRAFT VEGAN BAKERY <br/> ERP
          </span>
        </div>
        <ul className="flex-1 px-2 py-4 overflow-y-auto">
          {pageConfig.map((item) => {
            if (!item.isCategory) {
              return renderPageButton(item.id as Page, item.title, item.icon);
            }
            
            const isCategoryActive = item.pages?.some(p => p.id === activePage);
            const isCategoryOpen = openCategories[item.id] ?? false;

            return (
              <li key={item.id}>
                <button
                  onClick={() => toggleCategory(item.id)}
                  className={`flex items-center justify-between w-full px-4 py-3 my-1 text-left rounded-lg transition-colors duration-200 ${
                    isCategoryActive ? 'text-indigo-500 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-200'
                  } hover:bg-gray-200 dark:hover:bg-gray-700`}
                >
                  <div className="flex items-center flex-1 min-w-0">
                    <item.icon className="h-5 w-5 mr-3 flex-shrink-0" />
                    <span className="font-semibold truncate">{item.title}</span>
                  </div>
                  <ChevronDown className={`h-5 w-5 transform transition-transform flex-shrink-0 ${isCategoryOpen ? 'rotate-180' : ''}`} />
                </button>
                {isCategoryOpen && (
                  <ul className="pl-4 border-l-2 border-gray-200 dark:border-gray-600 ml-5">
                    {item.pages?.map(page => renderPageButton(page.id, page.title, page.icon, true))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
        <div className="p-4 border-t dark:border-gray-700 flex-shrink-0">
          <p className="text-xs text-center text-gray-500 dark:text-gray-400 whitespace-nowrap">© 2024 CVB ERP</p>
        </div>
      </nav>
    </>
  );
};