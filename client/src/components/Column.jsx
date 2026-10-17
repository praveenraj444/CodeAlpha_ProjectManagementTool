import { useState } from 'react';
import { Droppable } from '@hello-pangea/dnd';
import TaskCard from './TaskCard.jsx';

export const COLUMNS = [
  { id: 'todo', title: 'To Do', accent: 'bg-slate-400' },
  { id: 'in-progress', title: 'In Progress', accent: 'bg-amber-400' },
  { id: 'done', title: 'Done', accent: 'bg-emerald-500' },
];

export default function Column({ column, tasks, onAdd, onOpen, canEdit = true }) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !canEdit) return;
    setSaving(true);
    try {
      await onAdd(title.trim());
      setTitle('');
      setAdding(false);
    } catch {
      /* toast already shown by parent */
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col rounded-2xl bg-slate-200/70 p-3">
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${column.accent}`} />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">{column.title}</h2>
          <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-500">
            {tasks.length}
          </span>
        </div>
      </div>

      <Droppable droppableId={column.id} isDropDisabled={!canEdit}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`min-h-[80px] rounded-xl p-1 transition-colors ${
              snapshot.isDraggingOver ? 'bg-indigo-100/70' : ''
            }`}
          >
            {tasks.map((task, index) => (
              <TaskCard key={task.id} task={task} index={index} onOpen={onOpen} canEdit={canEdit} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      {canEdit && (
        adding ? (
          <form onSubmit={submit} className="mt-2 space-y-2">
            <textarea
              autoFocus
              rows={2}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  submit(e);
                }
                if (e.key === 'Escape') setAdding(false);
              }}
              placeholder="Task title…"
              className="input resize-none"
            />
            <div className="flex gap-2">
              <button type="submit" disabled={saving || !title.trim()} className="btn-primary !px-3 !py-1.5">
                {saving ? 'Adding…' : 'Add task'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAdding(false);
                  setTitle('');
                }}
                className="btn-secondary !px-3 !py-1.5"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="mt-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-600 transition hover:bg-slate-300/60"
          >
            + Add a task
          </button>
        )
      )}
    </div>
  );
}