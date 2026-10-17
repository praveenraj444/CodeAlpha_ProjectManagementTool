import { Draggable } from '@hello-pangea/dnd';

export default function TaskCard({ task, index, onOpen, canEdit = true }) {
  return (
    <Draggable draggableId={task.id} index={index} isDragDisabled={!canEdit}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onOpen(task)}
          className={`mb-2 cursor-pointer rounded-xl border bg-white p-3 shadow-sm transition hover:shadow-md ${
            snapshot.isDragging
              ? 'rotate-1 border-indigo-400 shadow-xl ring-2 ring-indigo-300'
              : 'border-slate-200 hover:border-indigo-300'
          }`}
        >
          <p className="break-words text-sm font-medium">{task.title}</p>
          {task.description && (
            <p className="mt-1 line-clamp-2 break-words text-xs text-slate-500">{task.description}</p>
          )}

          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 10h8M8 14h5m-9 6l2.6-3.9A8 8 0 1112 20H4z"
                />
              </svg>
              {task.comment_count || 0}
            </div>

            {task.assignee_name ? (
              <div
                title={`Assigned to ${task.assignee_name}`}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500 text-xs font-semibold uppercase text-white"
              >
                {task.assignee_name.charAt(0)}
              </div>
            ) : (
              <span className="text-xs text-slate-400">Unassigned</span>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
}