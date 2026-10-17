import { Link } from 'react-router-dom';
import { formatDate } from '../api/axios.js';

export default function ProjectCard({ project, currentUserId, onDelete }) {
  const isOwner = project.owner_id === currentUserId;
  const total = project.task_count || 0;
  const done = project.done_count || 0;
  const percent = total ? Math.round((done / total) * 100) : 0;

  return (
    <div className="group relative flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <Link to={`/board/${project.id}`} className="flex-1">
        <h3 className="truncate text-lg font-semibold group-hover:text-indigo-600">{project.name}</h3>
        <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-sm text-slate-500">
          {project.description || 'No description'}
        </p>

        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs text-slate-500">
            <span>
              {done}/{total} tasks done
            </span>
            <span>{percent}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${percent}%` }} />
          </div>
        </div>
      </Link>

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
        <span>
          {isOwner ? 'You' : project.owner_name} · {formatDate(project.created_at)}
        </span>
        {isOwner && (
          <button
            onClick={() => onDelete(project)}
            className="rounded px-2 py-1 font-medium text-red-600 hover:bg-red-50"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
