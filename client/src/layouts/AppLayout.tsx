import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';

export default function AppLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  if (!user) return null;
  return (
    <div className="flex min-h-screen flex-col bg-mesh-soft">
      <Navbar onMenu={() => setOpen(true)} />
      <div className="flex flex-1">
        <Sidebar role={user.role} open={open} onClose={() => setOpen(false)} />
        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          <div key={location.pathname} className="animate-fade-up">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}