import React from 'react';

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
    <label className="block font-medium mb-1 text-contrast">Enter student name or email</label>
    <input
      type="text"
      className="w-full border-2 border-secondary/50 rounded-lg px-4 py-2 mb-1 focus:border-brand-violet outline-none transition-all"
      placeholder="Start typing..."
      value={studentQuery}
      onChange={e => {
        setStudentQuery(e.target.value);
        setSelectedStudent(null);
      }}
      autoComplete="off"
    />
    {studentSearchLoading && <div className="text-xs text-inactive">Searching...</div>}
    {studentOptions.length > 0 && studentQuery.length > 0 && (
      <ul className="border-2 border-secondary/50 rounded-lg bg-white dark:bg-neutral-900 shadow max-h-40 overflow-y-auto z-10 relative">
        {studentOptions.map(option => (
          <li
            key={option.value}
            className="px-4 py-2 hover:bg-brand-violet/10 cursor-pointer text-contrast dark:text-white"
            onClick={() => {
              setSelectedStudent(option);
              setStudentQuery(''); // clear input after selection
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
