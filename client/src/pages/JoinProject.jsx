import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api, { getErrorMessage } from '../api/axios.js';
import { useToast } from '../context/ToastContext.jsx';

export default function JoinProject() {
  const { token } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [error, setError] = useState('');

  useEffect(() => {
    const accept = async () => {
      try {
        const res = await api.post(`/auth/invite/${token}/accept`);
        toast.success(res.data.message);
        navigate(`/board/${res.data.projectId}`, { replace: true });
      } catch (err) {
        setError(getErrorMessage(err));
        toast.error(getErrorMessage(err));
      }
    };
    accept();
  }, [token, navigate, toast]);

  return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="text-center">
        {error ? (
          <div className="rounded-xl bg-white p-8 shadow-md">
            <h2 className="text-xl font-bold text-red-600 mb-2">Failed to Join</h2>
            <p className="text-slate-600 mb-4">{error}</p>
            <button onClick={() => navigate('/dashboard')} className="btn-primary">Go to Dashboard</button>
          </div>
        ) : (
          <>
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
            <h2 className="text-lg font-medium text-slate-700">Joining project...</h2>
          </>
        )}
      </div>
    </div>
  );
}