import React, { useEffect, useState } from 'react';
import { Dumbbell, Loader2, PlusCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import NewFitnessSessionModal from '../components/NewFitnessSessionModal';
import { fitnessTestAPI, FitnessTestSession } from '../services/fitnessTestAPI';

const FitnessTestPage: React.FC = () => {
  const [newSessionModalOpen, setNewSessionModalOpen] = useState(false);
  const [sessions, setSessions] = useState<FitnessTestSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchSessions = () => {
    setLoading(true);
    fitnessTestAPI.getSessions()
      .then(setSessions)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    fetchSessions();
  }, []); // Fixed: now called only on mount
  const handleCreateNewSession = () => {

    setNewSessionModalOpen(false);
    fetchSessions();
  };

  const openSession = (id: number) => {
    navigate(`/fitness-session/${id}`);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 mobile-content-bottom-padding">
      <NewFitnessSessionModal
        open={newSessionModalOpen}
        onClose={() => setNewSessionModalOpen(false)}
        onCreate={handleCreateNewSession}
      />
      <div className="flex items-center gap-3 mb-8">
        <Dumbbell size={32} className="text-blue-500" />
        <h1 className="text-2xl sm:text-3xl font-bold text-contrast">Fitness Test Sessions</h1>
        <button
          className="innohassle-button flex items-center gap-2 px-4 py-2 rounded-lg ml-auto"
          onClick={() => setNewSessionModalOpen(true)}
        >
          <PlusCircle size={20} /> Conduct a new fitness test session
        </button>
      </div>
      {error && <div className="innohassle-card p-4 bg-gradient-to-r from-error-500/10 to-error-500/5 border-2 border-error-500/30 animate-in slide-in-from-top duration-300 text-error-500">{error}</div>}
      {loading ? (
        <div className="flex items-center gap-2 text-inactive"><Loader2 className="animate-spin" /> Loading sessions...</div>
      ) : (
        <div className="innohassle-card p-6 bg-gradient-to-br from-brand-violet/5 via-transparent to-brand-violet/10 border-2 border-brand-violet/20 hover:border-brand-violet/30 transition-all duration-300 shadow-lg shadow-brand-violet/5">
          <h2 className="text-lg font-semibold mb-4 text-contrast">All Fitness Test Sessions</h2>
          {sessions.length === 0 && <div className="text-inactive">No sessions found.</div>}
          <ul className="divide-y">
            {[...sessions].reverse().map(session => (
              <li key={session.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-medium text-contrast">
                    {typeof session.semester === 'object' && session.semester !== null && 'name' in session.semester
                      ? `${session.semester.name} — ${new Date(session.date).toLocaleDateString()}`
                      : `${session.semester || 'Unknown Semester'} — ${new Date(session.date).toLocaleDateString()}`}
                  </div>
                  <div className="text-xs text-inactive">Teacher: {session.teacher} | Retake: {session.retake ? 'Yes' : 'No'}</div>
                </div>
                <button onClick={() => openSession(session.id)} className="innohassle-button-secondary px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 hover:scale-105">View</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default FitnessTestPage;