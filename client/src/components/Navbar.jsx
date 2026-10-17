import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import { useNotifications } from '../context/NotificationContext.jsx';
import NotificationsDropdown from './NotificationsDropdown.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { connected } = useSocket();
  const { unreadCount } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between px-4 sm:px-6">
        <Link to="/dashboard" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 font-bold text-white">
            T
          </span>
          <span className="text-lg font-bold">TaskFlow</span>
        </Link>

        <div className="flex items-center gap-4">
          <span
            className="flex items-center gap-1.5 text-xs text-slate-500"
            title={connected ? 'Live updates connected' : 'Reconnecting…'}
          >
            <span className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-amber-400'}`} />
            <span className="hidden sm:inline">{connected ? 'Live' : 'Offline'}</span>
          </span>

          {/* NOTIFICATION BELL */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications((prev) => !prev)}
              className="relative rounded-full p-2 text-slate-600 transition hover:bg-slate-100 focus:outline-none"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            {showNotifications && <NotificationsDropdown onClose={() => setShowNotifications(false)} />}
          </div>

          <span className="hidden text-sm font-medium sm:inline">{user?.name}</span>
          <button onClick={handleLogout} className="btn-secondary !px-3 !py-1.5">
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}