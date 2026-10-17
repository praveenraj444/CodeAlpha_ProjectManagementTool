import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { DragDropContext } from '@hello-pangea/dnd';
import api, { getErrorMessage } from '../api/axios.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import Column, { COLUMNS } from '../components/Column.jsx';
import TaskModal from '../components/TaskModal.jsx';
import MembersModal from '../components/MembersModal.jsx';

const byPosition = (a, b) => a.position - b.position;

// Moves a task to (status, index) and renumbers every column — mirrors the server logic
function applyMove(tasks, taskId, status, index) {
  const moving = tasks.find((t) => t.id === taskId);
  if (!moving) return tasks;

  const others = tasks.filter((t) => t.id !== taskId);
  const result = [];

  for (const col of COLUMNS) {
    const list = others.filter((t) => t.status === col.id).sort(byPosition);
    if (col.id === status) list.splice(index, 0, { ...moving, status });
    list.forEach((t, i) => result.push({ ...t, status: col.id, position: i }));
  }
  return result;
}

export default function Board() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const { socket } = useSocket();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [online, setOnline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [showMembers, setShowMembers] = useState(false);

  // Initial load
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      api.get(`/projects/${projectId}`),
      api.get(`/tasks/project/${projectId}`),
      api.get('/auth/users'),
    ])
      .then(([p, t, u]) => {
        if (cancelled) return;
        setProject(p.data.project);
        setTasks(t.data.tasks);
        setUsers(u.data.users);
      })
      .catch((err) => {
        if (cancelled) return;
        toast.error(getErrorMessage(err));
        navigate('/dashboard', { replace: true });
      })
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Realtime: join room + listen for events
  useEffect(() => {
    if (!socket) return undefined;

    const join = () => socket.emit('project:join', projectId);
    if (socket.connected) join();
    socket.on('connect', join); 

    const onCreated = ({ task }) => {
      if (task.project_id !== projectId) return;
      setTasks((prev) => (prev.some((t) => t.id === task.id) ? prev : [...prev, task]));
    };

    const onUpdated = ({ task }) => {
      if (task.project_id !== projectId) return;
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, ...task } : t)));
    };

    const onMoved = ({ projectId: pid, task, updates }) => {
      if (pid !== projectId) return;
      const map = new Map(updates.map((u) => [u.id, u]));
      setTasks((prev) => {
        const exists = prev.some((t) => t.id === task.id);
        const base = exists ? prev : [...prev, task];
        return base.map((t) => (map.has(t.id) ? { ...t, ...map.get(t.id) } : t));
      });
    };

    const onDeleted = ({ id, project_id }) => {
      if (project_id !== projectId) return;
      setTasks((prev) => prev.filter((t) => t.id !== id));
    };

    const onCommentCreated = ({ comment, projectId: pid }) => {
      if (pid !== projectId) return;
      setTasks((prev) =>
        prev.map((t) => (t.id === comment.task_id ? { ...t, comment_count: t.comment_count + 1 } : t))
      );
    };

    const onCommentDeleted = ({ task_id, projectId: pid }) => {
      if (pid !== projectId) return;
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task_id ? { ...t, comment_count: Math.max(0, t.comment_count - 1) } : t
        )
      );
    };

    const onPresence = ({ projectId: pid, users: list }) => {
      if (pid === projectId) setOnline(list);
    };

    socket.on('task:created', onCreated);
    socket.on('task:updated', onUpdated);
    socket.on('task:moved', onMoved);
    socket.on('task:deleted', onDeleted);
    socket.on('comment:created', onCommentCreated);
    socket.on('comment:deleted', onCommentDeleted);
    socket.on('presence:update', onPresence);

    return () => {
      socket.emit('project:leave', projectId);
      socket.off('connect', join);
      socket.off('task:created', onCreated);
      socket.off('task:updated', onUpdated);
      socket.off('task:moved', onMoved);
      socket.off('task:deleted', onDeleted);
      socket.off('comment:created', onCommentCreated);
      socket.off('comment:deleted', onCommentDeleted);
      socket.off('presence:update', onPresence);
      setOnline([]);
    };
  }, [socket, projectId]);

  const columns = useMemo(() => {
    const map = { todo: [], 'in-progress': [], done: [] };
    tasks.forEach((t) => map[t.status]?.push(t));
    Object.values(map).forEach((list) => list.sort(byPosition));
    return map;
  }, [tasks]);

  const selectedTask = useMemo(() => tasks.find((t) => t.id === selectedId) || null, [tasks, selectedId]);

  const myRole = project?.my_role || 'viewer';
  const canEdit = myRole === 'owner' || myRole === 'editor';

  const onDragEnd = async ({ destination, source, draggableId }) => {
    if (!canEdit) return toast.error('Viewers cannot move tasks');
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const previous = tasks;
    setTasks(applyMove(previous, draggableId, destination.droppableId, destination.index)); // optimistic

    try {
      await api.put(`/tasks/${draggableId}/move`, {
        status: destination.droppableId,
        position: destination.index,
      });
    } catch (err) {
      setTasks(previous);
      toast.error(getErrorMessage(err));
    }
  };

  const addTask = useCallback(
    async (status, title) => {
      if (!canEdit) {
        toast.error('Viewers cannot add tasks');
        return;
      }
      try {
        const res = await api.post('/tasks', { project_id: projectId, title, status });
        setTasks((prev) => (prev.some((t) => t.id === res.data.task.id) ? prev : [...prev, res.data.task]));
      } catch (err) {
        toast.error(getErrorMessage(err));
        throw err;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [projectId, canEdit]
  );

  const handleTaskSaved = (task) =>
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, ...task } : t)));

  const handleTaskDeleted = (id) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setSelectedId(null);
  };

  useEffect(() => {
    if (selectedId && !loading && !tasks.some((t) => t.id === selectedId)) setSelectedId(null);
  }, [tasks, selectedId, loading]);

  if (loading) {
    return (
      <div className="flex justify-center py-32">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <Link to="/dashboard" className="text-sm text-indigo-600 hover:underline">
            ← All projects
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="truncate text-2xl font-bold">{project?.name}</h1>
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide 
              ${myRole === 'owner' ? 'bg-indigo-100 text-indigo-700' : 
                myRole === 'editor' ? 'bg-emerald-100 text-emerald-700' : 
                'bg-slate-200 text-slate-700'}`}>
              {myRole}
            </span>
          </div>
          {project?.description && <p className="text-sm text-slate-500">{project.description}</p>}
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={() => setShowMembers(true)}
            className="btn-secondary flex items-center gap-2 !px-3 !py-1.5"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            Members
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Online</span>
            <div className="flex -space-x-2">
              {online.map((u) => (
                <div
                  key={u.id}
                  title={u.id === user.id ? `${u.name} (you)` : u.name}
                  className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-emerald-500 text-xs font-semibold uppercase text-white shadow"
                >
                  {u.name.charAt(0)}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-3">
          {COLUMNS.map((col) => (
            <Column
              key={col.id}
              column={col}
              tasks={columns[col.id]}
              onAdd={(title) => addTask(col.id, title)}
              onOpen={(task) => setSelectedId(task.id)}
              canEdit={canEdit}
            />
          ))}
        </div>
      </DragDropContext>

      {selectedTask && (
        <TaskModal
          key={selectedTask.id}
          task={selectedTask}
          users={users}
          onClose={() => setSelectedId(null)}
          onSaved={handleTaskSaved}
          onDeleted={handleTaskDeleted}
          canEdit={canEdit}
        />
      )}

      {showMembers && (
        <MembersModal
          projectId={projectId}
          currentRole={myRole}
          onClose={() => setShowMembers(false)}
        />
      )}
    </div>
  );
}