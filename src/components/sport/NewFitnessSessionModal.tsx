import React, { useEffect, useState } from "react";
import { semesterAPI, Semester } from "./services/semesterAPI";
import { createFitnessSessionAPI } from "./services/createFitnessSessionAPI";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreate: (semester: Semester) => void;
}

const NewFitnessSessionModal: React.FC<Props> = ({
  open,
  onClose,
  onCreate,
}) => {
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [selectedSemester, setSelectedSemester] = useState<Semester | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    semesterAPI
      .getSemesters()
      .then(setSemesters)
      .catch((e) => setError(e.message));
  }, [open]);

  const [creating, setCreating] = useState(false);
  const handleCreate = async () => {
    if (!selectedSemester) return;
    setCreating(true);
    try {
      await createFitnessSessionAPI.createSession(selectedSemester.id, false);
      onCreate(selectedSemester);
    } catch (e: any) {
      setError(e.message || "Failed to create session");
    } finally {
      setCreating(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/70">
      <div className="w-full max-w-md rounded-lg border border-neutral-200 bg-white p-6 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
        <h2 className="mb-4 text-lg font-bold text-contrast dark:text-white">
          Conduct a new fitness test session
        </h2>
        {error && (
          <div className="text-error-500 dark:text-error-400 mb-2">{error}</div>
        )}
        <label className="mb-2 block font-medium text-contrast dark:text-white">
          Select semester
        </label>
        <select
          className="mb-4 w-full rounded border border-neutral-300 bg-white px-3 py-2 text-contrast dark:border-neutral-600 dark:bg-neutral-800 dark:text-white"
          value={selectedSemester?.id || ""}
          onChange={(e) => {
            const sem = semesters.find((s) => s.id === Number(e.target.value));
            setSelectedSemester(sem || null);
          }}
        >
          <option value="" disabled>
            Select semester...
          </option>
          {semesters.map((sem) => (
            <option key={sem.id} value={sem.id}>
              {sem.name} ({sem.start} - {sem.end})
            </option>
          ))}
        </select>
        <div className="flex justify-end gap-2">
          <button
            className="innohassle-button-secondary rounded px-4 py-2"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="innohassle-button rounded px-4 py-2 disabled:opacity-50"
            onClick={handleCreate}
            disabled={!selectedSemester || creating}
          >
            {creating ? "Creating..." : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewFitnessSessionModal;
