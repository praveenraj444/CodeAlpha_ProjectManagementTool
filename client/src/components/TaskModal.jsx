import { useEffect, useState } from 'react';
import api, { getErrorMessage } from '../api/axios.js';
import { useToast } from '../context/ToastContext.jsx';
import { COLUMNS } from './Column.jsx';
import CommentSection from './CommentSection.jsx';

export default function TaskModal({ task, users, onClose, onSaved, onDeleted, canEdit = true }) {
  const toast = useToast();
  const [form, setForm] = useState({
    title: task.title,
    description: task.description || '',
    status: task.status,
    assigned_to: task.assigned_to || '',
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const dirty =
    form.title !== task.title ||
    form.description !== (task.description || '') ||
    form.status !== task.status ||
    form.assigned_to !== (task.assigned_to || '');

  const save = async (e) => {
    e.preventDefault();
    if (!canEdit) return;
    if (!form.title.trim()) {
      toast.error('Title cannot be empty');
      return;
    }
    setSaving(true);
    try {
      const res = await api.put(`/tasks/${task.id}`, {
        title: form.title,
        description: form.description,
        status: form.status,
        assigned_to: form.assigned_to || null,
      });
      onSaved(res.data.task);
      toast.success('Task saved');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!canEdit) return;
    if (!window.confirm('Delete this task and its comments?')) return;
    setDeleting(true);
    try {
      await api.delete(`/tasks/${task.id}`);
      onDeleted(task.id);
      toast.success('Task deleted');
    } catch (err) {
      toast.error(getErrorMessage(err));
      setDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 px-4 py-8"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            Task details
            {!canEdit && (
              <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                Read-only
              </span>
            )}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-5">
          <form onSubmit={save} className="space-y-4 md:col-span-3">
            <div>
              <label className="label" htmlFor="t-title">Title</label>
              <input
                id="t-title"
                name="title"
                className="input disabled:bg-slate-50 disabled:text-slate-500"
                value={form.title}
                onChange={onChange}
                required
                disabled={!canEdit}
              />
            </div>

            <div>
              <label className="label" htmlFor="t-desc">Description</label>
              <textarea
                id="t-desc"
                name="description"
                rows={5}
                className="input resize-none disabled:bg-slate-50 disabled:text-slate-500"
                placeholder="Add more detail…"
                value={form.description}
                onChange={onChange}
                disabled={!canEdit}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="t-status">Status</label>
                <select
                  id="t-status"
                  name="status"
                  className="input disabled:bg-slate-50 disabled:text-slate-500"
                  value={form.status}
                  onChange={onChange}
                  disabled={!canEdit}
                >
                  {COLUMNS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="t-assign">Assigned to</label>
                <select
                  id="t-assign"
                  name="assigned_to"
                  className="input disabled:bg-slate-50 disabled:text-slate-500"
                  value={form.assigned_to}
                  onChange={onChange}
                  disabled={!canEdit}
                >
                  <option value="">Unassigned</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              {canEdit ? (
                <button type="button" onClick={remove} disabled={deleting} className="btn-danger">
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              ) : (
                <div /> // Empty div for spacing
              )}
              <div className="flex gap-2">
                <button type="button" onClick={onClose} className="btn-secondary">
                  Close
                </button>
                {canEdit && (
                  <button type="submit" disabled={saving || !dirty} className="btn-primary">
                    {saving ? 'Saving…' : 'Save changes'}
                  </button>
                )}
              </div>
            </div>
          </form>

          <div className="md:col-span-2 md:border-l md:border-slate-200 md:pl-6">
            <CommentSection taskId={task.id} canEdit={canEdit} />
          </div>
        </div>
      </div>
    </div>
  );
}