import React from "react";

interface StudentSearchProps {
  studentQuery: string;
  setStudentQuery: (q: string) => void;
  studentOptions: any[];
  studentSearchLoading: boolean;
  selectedStudent: any;
  setSelectedStudent: (s: any) => void;
}

const StudentSearch: React.FC<StudentSearchProps> = ({
  studentQuery,
  setStudentQuery,
  studentOptions,
  studentSearchLoading,
  setSelectedStudent,
}) => (
  <div className="mb-6">
    <label className="mb-1 block font-medium text-contrast">
      Enter student name or email
    </label>
    <input
      type="text"
      className="mb-1 w-full rounded-lg border-2 border-secondary/50 px-4 py-2 outline-none transition-all focus:border-brand-violet"
      placeholder="Start typing..."
      value={studentQuery}
      onChange={(e) => {
        setStudentQuery(e.target.value);
        setSelectedStudent(null);
      }}
      autoComplete="off"
    />
    {studentSearchLoading && (
      <div className="text-xs text-inactive">Searching...</div>
    )}
    {studentOptions.length > 0 && studentQuery.length > 0 && (
      <ul className="relative z-10 max-h-40 overflow-y-auto rounded-lg border-2 border-secondary/50 bg-white shadow dark:bg-neutral-900">
        {studentOptions.map((option) => (
          <li
            key={option.value}
            className="cursor-pointer px-4 py-2 text-contrast hover:bg-brand-violet/10 dark:text-white"
            onClick={() => {
              setSelectedStudent(option);
              setStudentQuery(""); // clear input after selection
            }}
          >
            {option.label}
          </li>
        ))}
      </ul>
    )}
  </div>
);
export default StudentSearch;
