import { useEffect, useState } from 'react';
import api, { getErrorMessage } from '../api/axios.js';
import { useToast } from '../context/ToastContext.jsx';

export default function MembersModal({ projectId, currentRole, onClose }) {
  const toast = useToast();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Add Member states
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('editor');
  const [inviting, setInviting] = useState(false);

  // Invite Link states
  const [inviteLink, setInviteLink] = useState('');
  const [generatingLink, setGeneratingLink] = useState(false);

  const fetchMembers = async () => {
    try {
      const res = await api.get(`/projects/${projectId}/members`);
      setMembers(res.data.members);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setInviting(true);
    try {
      await api.post(`/projects/${projectId}/members`, { email: email.trim(), role });
      toast.success('Member added successfully');
      setEmail('');
      fetchMembers();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (userId) => {
    if (!window.confirm('Remove this member from the project?')) return;
    try {
      await api.delete(`/projects/${projectId}/members/${userId}`);
      toast.success('Member removed');
      fetchMembers();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const generateLink = async () => {
    setGeneratingLink(true);
    try {
      const res = await api.post(`/projects/${projectId}/invite-link`);
      const link = `${window.location.origin}/join/${res.data.token}`;
      setInviteLink(link);
      
      // Auto copy to clipboard
      await navigator.clipboard.writeText(link);
      toast.success('Invite link copied to clipboard!');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setGeneratingLink(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-semibold">Project Members</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        <div className="p-5 max-h-[80vh] overflow-y-auto">
          
          {/* SHARE INVITE LINK SECTION */}
          {currentRole !== 'viewer' && (
            <div className="mb-6 flex flex-col gap-2 rounded-xl border border-indigo-100 bg-indigo-50 p-3">
              <p className="text-xs font-semibold text-indigo-800 uppercase tracking-wide">Invite via Link</p>
              <p className="text-xs text-indigo-600 mb-1">Anyone with this link can join as Editor.</p>
              <button 
                onClick={generateLink} 
                disabled={generatingLink}
                className="btn-primary w-full !bg-indigo-600 hover:!bg-indigo-700 disabled:opacity-50"
              >
                {generatingLink ? 'Generating…' : '🔗 Generate & Copy Link'}
              </button>
              
              {inviteLink && (
                <input 
                  readOnly 
                  value={inviteLink} 
                  className="input !text-xs mt-2 bg-white" 
                  onClick={(e) => e.target.select()} 
                  title="Click to select and copy"
                />
              )}
            </div>
          )}

          {/* ADD MEMBER DIRECTLY (Email) */}
          {currentRole === 'owner' && (
            <form onSubmit={handleAdd} className="mb-6 flex flex-col gap-2 rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Add member by email</p>
              <input
                type="email"
                placeholder="User email address"
                required
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <div className="flex gap-2">
                <select className="input !py-1.5" value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="editor">Editor (Can add/edit tasks)</option>
                  <option value="viewer">Viewer (Read only)</option>
                </select>
                <button type="submit" disabled={inviting || !email.trim()} className="btn-primary shrink-0">
                  {inviting ? 'Adding…' : 'Add'}
                </button>
              </div>
            </form>
          )}

          {/* MEMBERS LIST */}
          <div className="space-y-2">
            {loading ? (
               <p className="text-center text-sm text-slate-500">Loading…</p>
            ) : members.map((m) => (
              <div key={m.user_id} className="flex items-center justify-between rounded-lg border border-slate-100 p-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{m.name} {m.role === 'owner' && '(You)'}</p>
                  <p className="truncate text-xs text-slate-500">{m.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                    m.role === 'owner' ? 'bg-indigo-100 text-indigo-700' :
                    m.role === 'editor' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {m.role}
                  </span>
                  {currentRole === 'owner' && m.role !== 'owner' && (
                    <button onClick={() => handleRemove(m.user_id)} className="text-xs text-red-500 hover:underline">
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}