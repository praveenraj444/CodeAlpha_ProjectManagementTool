import { useEffect, useRef, useState } from 'react';
import api, { formatDate, getErrorMessage } from '../api/axios.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function CommentSection({ taskId, canEdit = true }) {
  const { user } = useAuth();
  const { socket } = useSocket();
  const toast = useToast();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);

  // Load existing comments
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get(`/comments/task/${taskId}`)
      .then((res) => !cancelled && setComments(res.data.comments))
      .catch((err) => !cancelled && toast.error(getErrorMessage(err)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  // Live updates
  useEffect(() => {
    if (!socket) return undefined;

    const onCreated = ({ comment }) => {
      if (comment.task_id !== taskId) return;
      setComments((prev) => (prev.some((c) => c.id === comment.id) ? prev : [...prev, comment]));
    };
    const onDeleted = ({ id, task_id }) => {
      if (task_id !== taskId) return;
      setComments((prev) => prev.filter((c) => c.id !== id));
    };

    socket.on('comment:created', onCreated);
    socket.on('comment:deleted', onDeleted);
    return () => {
      socket.off('comment:created', onCreated);
      socket.off('comment:deleted', onDeleted);
    };
  }, [socket, taskId]);

  // Keep the newest comment in view
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [comments]);

  const submit = async (e) => {
    e.preventDefault();
    if (!content.trim() || !canEdit) return;
    setSending(true);
    try {
      const res = await api.post('/comments', { task_id: taskId, content });
      setComments((prev) => (prev.some((c) => c.id === res.data.comment.id) ? prev : [...prev, res.data.comment]));
      setContent('');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  const remove = async (id) => {
    if (!canEdit) return;
    try {
      await api.delete(`/comments/${id}`);
      setComments((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="flex h-full flex-col">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
        Comments ({comments.length})
      </h3>

      <div ref={listRef} className="mb-3 max-h-72 flex-1 space-y-3 overflow-y-auto pr-1">
        {loading ? (
          <div className="flex justify-center py-6">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
          </div>
        ) : comments.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">No comments yet. Start the conversation!</p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="rounded-lg bg-slate-50 p-3">
              <div className="mb-1 flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-xs font-semibold uppercase text-white">
                    {c.user_name.charAt(0)}
                  </span>
                  <span className="truncate text-sm font-medium">{c.user_name}</span>
                </div>
                <span className="shrink-0 text-xs text-slate-400">{formatDate(c.created_at)}</span>
              </div>
              <p className="whitespace-pre-wrap break-words text-sm text-slate-700">{c.content}</p>
              {c.user_id === user.id && canEdit && (
                <button onClick={() => remove(c.id)} className="mt-1 text-xs text-red-500 hover:underline">
                  Delete
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {canEdit ? (
        <form onSubmit={submit} className="space-y-2">
          <textarea
            rows={2}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) submit(e);
            }}
            placeholder="Write a comment… (Enter to send)"
            className="input resize-none"
          />
          <button type="submit" disabled={sending || !content.trim()} className="btn-primary w-full">
            {sending ? 'Posting…' : 'Post comment'}
          </button>
        </form>
      ) : (
        <p className="text-center text-sm text-slate-500 italic py-2 bg-slate-50 rounded-lg">
          Viewers cannot post comments.
        </p>
      )}
    </div>
  );
}