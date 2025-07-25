import React from "react";

interface StudentResultsFormProps {
  selectedStudent: any;
  selectedSession: any;
  studentResults: Record<number, string | number>;
  handleResultChange: (exerciseId: number, value: string) => void;
  handleSubmitResults: (e: React.FormEvent) => void;
  submitStatus: "idle" | "success" | "error" | "loading";
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
    <div className="mb-2 font-semibold text-contrast">
      Enter results for:{" "}
      <span className="text-brand-violet">{selectedStudent.label}</span>
    </div>
    <form className="space-y-4" onSubmit={handleSubmitResults}>
      {selectedSession.exercises.map((ex: any) => (
        <div key={ex.id} className="flex items-center gap-3">
          <label className="w-32 font-medium text-inactive">
            {ex.name} <span className="text-xs text-contrast">({ex.unit})</span>
          </label>
          <input
            type="text"
            className="w-32 rounded-lg border-2 border-secondary/50 px-3 py-2 outline-none transition-all focus:border-brand-violet"
            value={studentResults[ex.id] ?? ""}
            onChange={(e) => handleResultChange(ex.id, e.target.value)}
            placeholder="Result"
            required
          />
        </div>
      ))}
      <div className="mt-4 flex items-center gap-4">
        <button
          type="submit"
          className={`innohassle-button-primary rounded-xl px-6 py-3 text-base font-semibold transition-all duration-200 hover:scale-105 ${submitStatus === "loading" ? "cursor-not-allowed opacity-60" : ""}`}
          disabled={submitStatus === "loading"}
        >
          {submitStatus === "loading" ? "Submitting..." : "Submit Results"}
        </button>
        {submitStatus === "success" && (
          <span className="text-success-500 flex items-center">
            {submitMessage}
          </span>
        )}
        {submitStatus === "error" && (
          <span className="text-error-500 flex items-center">
            {submitMessage}
          </span>
        )}
      </div>
    </form>
  </div>
);

export default StudentResultsForm;
