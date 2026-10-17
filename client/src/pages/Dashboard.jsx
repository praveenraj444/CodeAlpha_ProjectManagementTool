import { useEffect, useState } from 'react';
import api, { getErrorMessage } from '../api/axios.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import ProjectCard from '../components/ProjectCard.jsx';

export default function Dashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    api
      .get('/projects')
      .then((res) => setProjects(res.data.projects))
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const closeModal = () => {
    setShowModal(false);
    setForm({ name: '', description: '' });
  };

  const createProject = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await api.post('/projects', form);
      setProjects((p) => [res.data.project, ...p]);
      toast.success('Project created');
      closeModal();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setCreating(false);
    }
  };

  const deleteProject = async (project) => {
    if (!window.confirm(`Delete "${project.name}" and all its tasks? This cannot be undone.`)) return;
    try {
      await api.delete(`/projects/${project.id}`);
      setProjects((p) => p.filter((x) => x.id !== project.id));
      toast.success('Project deleted');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-sm text-slate-500">Hi {user?.name}, pick a project or start a new one.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          + New project
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white py-16 text-center">
          <p className="text-lg font-medium">No projects yet</p>
          <p className="mb-4 mt-1 text-sm text-slate-500">Create your first project to start adding tasks.</p>
          <button onClick={() => setShowModal(true)} className="btn-primary">
            Create project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} currentUserId={user.id} onDelete={deleteProject} />
          ))}
        </div>
      )}

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4"
          onMouseDown={(e) => e.target === e.currentTarget && closeModal()}
        >
          <form onSubmit={createProject} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="mb-4 text-lg font-semibold">New project</h2>
            <div className="space-y-4">
              <div>
                <label className="label" htmlFor="pname">Name</label>
                <input
                  id="pname"
                  autoFocus
                  required
                  className="input"
                  placeholder="Website redesign"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="label" htmlFor="pdesc">Description</label>
                <textarea
                  id="pdesc"
                  rows={3}
                  className="input resize-none"
                  placeholder="What is this project about?"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={closeModal} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={creating} className="btn-primary">
                {creating ? 'Creating…' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
