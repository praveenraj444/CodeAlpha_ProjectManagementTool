import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext.jsx';
import { formatDate } from '../api/axios.js';

export default function NotificationsDropdown({ onClose }) {
  const { notifications, unreadCount, markAllAsRead, markAsRead } = useNotifications();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleNotificationClick = async (notif) => {
    if (notif.is_read === 0) {
      await markAsRead(notif.id);
    }
    if (notif.link) {
      navigate(notif.link);
    }
    onClose();
  };

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
    >
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h3 className="font-semibold text-slate-800">Notifications</h3>
        {unreadCount > 0 && (
          <button onClick={markAllAsRead} className="text-xs font-medium text-indigo-600 hover:underline">
            Mark all as read
          </button>
        )}
      </div>

      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-500">No notifications yet.</div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => handleNotificationClick(notif)}
              className={`cursor-pointer border-b border-slate-50 px-4 py-3 transition hover:bg-slate-50 ${
                notif.is_read === 0 ? 'bg-indigo-50/50' : ''
              }`}
            >
              <p className={`text-sm ${notif.is_read === 0 ? 'font-medium text-slate-800' : 'text-slate-600'}`}>
                {notif.message}
              </p>
              <span className="mt-1 block text-xs text-slate-400">{formatDate(notif.created_at)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}