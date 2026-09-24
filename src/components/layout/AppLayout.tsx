import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { AntiIdlePresence } from '@/components/shared/AntiIdlePresence';

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      <Navbar />
      <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        <Outlet />
      </main>
      <AntiIdlePresence />
    </div>
  );
}
