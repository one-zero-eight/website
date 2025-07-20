import React, { useEffect, useState } from 'react';
import { semesterAPI, Semester } from '../services/semesterAPI';
import { createFitnessSessionAPI } from '../services/createFitnessSessionAPI';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreate: (semester: Semester) => void;
}

const NewFitnessSessionModal: React.FC<Props> = ({ open, onClose, onCreate }) => {
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [selectedSemester, setSelectedSemester] = useState<Semester | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    semesterAPI.getSemesters()
      .then(setSemesters)
      .catch(e => setError(e.message))
  }, [open]);

  const [creating, setCreating] = useState(false);
  const handleCreate = async () => {
    if (!selectedSemester) return;
    setCreating(true);
    try {
      await createFitnessSessionAPI.createSession(selectedSemester.id, false);
      onCreate(selectedSemester);
    } catch (e: any) {
      setError(e.message || 'Failed to create session');
    } finally {
      setCreating(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/70">
      <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-lg p-6 w-full max-w-md border border-neutral-200 dark:border-neutral-700">
        <h2 className="text-lg font-bold mb-4 text-contrast dark:text-white">Conduct a new fitness test session</h2>
        {error && <div className="text-error-500 dark:text-error-400 mb-2">{error}</div>}
        <label className="block mb-2 font-medium text-contrast dark:text-white">Select semester</label>
        <select
          className="w-full border rounded px-3 py-2 mb-4 bg-white dark:bg-neutral-800 text-contrast dark:text-white border-neutral-300 dark:border-neutral-600"
          value={selectedSemester?.id || ''}
          onChange={e => {
            const sem = semesters.find(s => s.id === Number(e.target.value));
            setSelectedSemester(sem || null);
          }}
        >
          <option value="" disabled>Select semester...</option>
          {semesters.map(sem => (
            <option key={sem.id} value={sem.id}>{sem.name} ({sem.start} - {sem.end})</option>
          ))}
        </select>
        <div className="flex gap-2 justify-end">
          <button className="innohassle-button-secondary px-4 py-2 rounded" onClick={onClose}>Cancel</button>
          <button
            className="innohassle-button px-4 py-2 rounded disabled:opacity-50"
            onClick={handleCreate}
            disabled={!selectedSemester || creating}
          >
            {creating ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewFitnessSessionModal;
