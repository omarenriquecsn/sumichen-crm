import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { UserData } from '../../context/types';

interface LayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  userDataProp?: UserData;
}

export const Layout: React.FC<LayoutProps> = ({ children, title, subtitle, userDataProp }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} userDataProp={userDataProp} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title={title} subtitle={subtitle} onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
};