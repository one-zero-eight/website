import React from 'react';

interface StudentResultsFormProps {
  selectedStudent: any;
  selectedSession: any;
  studentResults: Record<number, string | number>;
  handleResultChange: (exerciseId: number, value: string) => void;
  handleSubmitResults: (e: React.FormEvent) => void;
  submitStatus: 'idle' | 'success' | 'error' | 'loading';
  submitMessage: string;
}

const StudentResultsForm: React.FC<StudentResultsFormProps> = ({
  selectedStudent,
  selectedSession,
  studentResults,
  handleResultChange,
  handleSubmitResults,
  submitStatus,
  submitMessage,
}) => (
  <div className="mb-6">
    <div className="font-semibold mb-2 text-contrast">Enter results for: <span className="text-brand-violet">{selectedStudent.label}</span></div>
    <form className="space-y-4" onSubmit={handleSubmitResults}>
      {selectedSession.exercises.map((ex: any) => (
        <div key={ex.id} className="flex items-center gap-3">
          <label className="w-32 font-medium text-inactive">{ex.name} <span className="text-xs text-contrast">({ex.unit})</span></label>
          <input
            type="text"
            className="border-2 border-secondary/50 rounded-lg px-3 py-2 w-32 focus:border-brand-violet outline-none transition-all"
            value={studentResults[ex.id] ?? ''}
            onChange={e => handleResultChange(ex.id, e.target.value)}
            placeholder="Result"
            required
          />
        </div>
      ))}
      <div className="flex items-center gap-4 mt-4">
        <button
          type="submit"
          className={`innohassle-button-primary px-6 py-3 rounded-xl font-semibold text-base transition-all duration-200 hover:scale-105 ${submitStatus === 'loading' ? 'opacity-60 cursor-not-allowed' : ''}`}
          disabled={submitStatus === 'loading'}
        >
          {submitStatus === 'loading' ? 'Submitting...' : 'Submit Results'}
        </button>
        {submitStatus === 'success' && <span className="flex items-center text-success-500">{submitMessage}</span>}
        {submitStatus === 'error' && <span className="flex items-center text-error-500">{submitMessage}</span>}
      </div>
    </form>
  </div>
);

export default StudentResultsForm;
