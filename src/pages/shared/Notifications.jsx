import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck, Trash2 } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import EmptyState from '../../components/ui/EmptyState';
import { ListSkeleton } from '../../components/ui/Skeleton';
import { useAuth } from '../../hooks/useAuth';
import { useRealtime } from '../../hooks/useRealtime';
import {
  subscribeNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from '../../services/notificationService';
import { friendlyError } from '../../utils/errors';
import { sortByDateDesc, timeAgo } from '../../utils/format';

const ICONS = { pickup: '🚚', reward: '🏆', listing: '🏷️', complaint: '📢', info: '🔔' };

export default function Notifications() {
  const { profile } = useAuth();
  const { data, loading, error } = useRealtime(
    (ok, fail) => subscribeNotifications(profile.uid, ok, fail),
    [profile.uid],
  );
  const [actionError, setActionError] = useState('');
  const [marking, setMarking] = useState(false);
  const notifications = sortByDateDesc(data);
  const unread = notifications.filter((n) => !n.read).length;

  const safe = async (fn) => {
    setActionError('');
    try {
      await fn();
    } catch (err) {
      setActionError(friendlyError(err));
    }
  };

  return (
    <div className="fade-in">
      <PageHeader
        title="Notifications"
        subtitle={unread ? `You have ${unread} unread notification${unread > 1 ? 's' : ''}.` : 'You are all caught up.'}
        actions={
          unread > 0 && (
            <Button
              variant="secondary"
              icon={CheckCheck}
              loading={marking}
              onClick={async () => {
                setMarking(true);
                await safe(() => markAllAsRead(notifications));
                setMarking(false);
              }}
            >
              Mark all as read
            </Button>
          )
        }
      />
      <Alert type="error" className="mb-4">
        {error || actionError}
      </Alert>
      {loading ? (
        <ListSkeleton />
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications."
          message="Updates about your pickups, listings and rewards will appear here."
        />
      ) : (
        <ul className="space-y-2">
          {notifications.map((n) => (
            <li
              key={n.id}
              className={`flex items-start gap-3 rounded-xl border p-4 ${n.read ? 'border-slate-200 bg-white' : 'border-brand-200 bg-brand-50'}`}
            >
              <span className="text-xl" aria-hidden="true">
                {ICONS[n.type] || ICONS.info}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-800">
                  {n.title}
                  {!n.read && (
                    <span className="ml-2 inline-block h-2 w-2 rounded-full bg-brand-600" aria-label="unread" />
                  )}
                </p>
                <p className="text-sm text-slate-600">{n.message}</p>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs">
                  <span className="text-slate-400">{timeAgo(n.createdAt)}</span>
                  {n.link && (
                    <Link
                      to={n.link}
                      onClick={() => !n.read && safe(() => markAsRead(n.id))}
                      className="font-medium text-brand-700 hover:underline"
                    >
                      View
                    </Link>
                  )}
                  {!n.read && (
                    <button
                      onClick={() => safe(() => markAsRead(n.id))}
                      className="font-medium text-slate-600 hover:underline"
                    >
                      Mark as read
                    </button>
                  )}
                </div>
              </div>
              <button
                onClick={() => safe(() => deleteNotification(n.id))}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-red-600"
                aria-label="Delete notification"
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
