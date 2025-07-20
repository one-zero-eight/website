import React, { useState, useRef } from 'react';
import { FitnessTestSessionDetails, FitnessTestStudentSuggestion, fitnessTestAPI } from '../services/fitnessTestAPI';
import StudentSearch from '../components/StudentSearch';
import StudentResultsForm from '../components/StudentResultsForm';
import ResultsTable from '../components/ResultsTable';

const FitnessSessionPage: React.FC<{ session: FitnessTestSessionDetails }> = ({ session }) => {
  const [studentQuery, setStudentQuery] = useState('');
  const [studentOptions, setStudentOptions] = useState<FitnessTestStudentSuggestion[]>([]);
  const [studentSearchLoading, setStudentSearchLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<FitnessTestStudentSuggestion | null>(null);
  // studentResults: { [studentId: string]: { [exerciseId: number]: string | number } }
  const [studentResults, setStudentResults] = useState<Record<string, Record<number, string | number>>>({});
  // DEBUG: separate button for testing result submission
  const debugSubmitResults = async () => {
    if (!selectedStudent) {
      return;
    }
    const studentId = selectedStudent.value.split('_')[0];
    const results = Object.entries(studentResults).map(([exercise_id, value]) => ({
      student_id: studentId,
      exercise_id: Number(exercise_id),
      value: String(value)
    }));
    try {
      await fitnessTestAPI.uploadResults(session.session.id, {
        semester_id: session.session.semester.id,
        retake: session.session.retake,
        results
      });
    } catch (e) {
    }
  };

  // Automatically populate results for the selected student
  React.useEffect(() => {
    if (!selectedStudent) return;
    const studentId = selectedStudent.value.split('_')[0];
    const result = session.results?.[studentId];
    let exerciseResults: any[] = [];
    if (Array.isArray(result)) {
      exerciseResults = result;
    } else if (result && Array.isArray((result as any).exercise_results)) {
      exerciseResults = (result as any).exercise_results;
    }
    if (exerciseResults.length > 0) {
      setStudentResults(prev => ({
        ...prev,
        [studentId]: exerciseResults.reduce((acc, ex) => {
          if (ex.exercise_id !== undefined && ex.value !== undefined) {
            acc[ex.exercise_id] = ex.value;
          }
          return acc;
        }, {} as Record<number, string | number>)
      }));
    }
  }, [selectedStudent, session.results]);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error' | 'loading'>('idle');
  const [submitMessage, setSubmitMessage] = useState('');
  const [editing, setEditing] = useState<{studentId: string, exerciseId: number} | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [editStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const editInputRef = useRef<HTMLInputElement | null>(null);

  // Search students on input
  React.useEffect(() => {
    if (!studentQuery) {
      setStudentOptions([]);
      return;
    }
    setStudentSearchLoading(true);
    const timeout = setTimeout(() => {
      fitnessTestAPI.searchStudents(studentQuery)
        .then(setStudentOptions)
        .catch(() => setStudentOptions([]))
        .finally(() => setStudentSearchLoading(false));
    }, 300);
    return () => clearTimeout(timeout);
  }, [studentQuery]);

  return (
    <div className="max-w-5xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Fitness Test Session: {session.session.semester.name}</h1>
      <div className="mb-4 text-sm text-inactive">{new Date(session.session.date).toLocaleString()} | Teacher: {session.session.teacher}</div>
      <StudentSearch
        studentQuery={studentQuery}
        setStudentQuery={setStudentQuery}
        studentOptions={studentOptions}
        studentSearchLoading={studentSearchLoading}
        selectedStudent={selectedStudent}
        setSelectedStudent={setSelectedStudent}
      />
      {selectedStudent && (
        <StudentResultsForm
          selectedStudent={selectedStudent}
          selectedSession={session}
          studentResults={studentResults[selectedStudent.value.split('_')[0]] || {}}
          handleResultChange={(exerciseId, value) => {
            if (!selectedStudent) return;
            const studentId = selectedStudent.value.split('_')[0];
            setStudentResults(prev => ({
              ...prev,
              [studentId]: {
                ...(prev[studentId] || {}),
                [exerciseId]: value
              }
            }));
          }}
          handleSubmitResults={async (e) => {
            e.preventDefault();
            setSubmitStatus('loading');
            setSubmitMessage('');
            try {
              if (!selectedStudent) return;
              const studentId = selectedStudent.value.split('_')[0];
              const results = Object.entries(studentResults[studentId] || {}).map(([exercise_id, value]) => ({
                student_id: studentId,
                exercise_id: Number(exercise_id),
                value: String(value)
              }));
              await fitnessTestAPI.uploadResults(session.session.id, {
                semester_id: session.session.semester.id,
                retake: session.session.retake,
                results
              });
              // Immediately add the new student to session.results for instant table update
              if (!session.results[studentId]) {
                session.results[studentId] = results.map(r => ({
                  exercise_id: r.exercise_id,
                  value: Number(r.value),
                  student: {
                    user_id: studentId,
                    name: selectedStudent.label,
                    student_info: { name: selectedStudent.label }
                  }
                }));
              }
              setSubmitStatus('success');
              setSubmitMessage('Results submitted!');
            } catch (e) {
              setSubmitStatus('error');
              setSubmitMessage('Failed to submit results');
            } finally {
              setTimeout(() => setSubmitStatus('idle'), 2000);
            }
          }}
          submitStatus={submitStatus}
          submitMessage={submitMessage}
        />
      )}
      <ResultsTable
        selectedSession={session}
        editing={editing}
        editValue={editValue}
        setEditValue={setEditValue}
        editStatus={editStatus}
        handleEdit={(studentId, exerciseId, currentValue) => {
          setEditing({ studentId, exerciseId });
          setEditValue(currentValue);
          setTimeout(() => editInputRef.current?.focus(), 100);
        }}
        handleEditSave={(studentId, exerciseId) => {
          setStudentResults(prev => ({
            ...prev,
            [studentId]: {
              ...(prev[studentId] || {}),
              [exerciseId]: editValue
            }
          }));
          setEditing(null);
          setEditValue('');
        }}
        editInputRef={editInputRef}
        selectedStudent={selectedStudent}
        studentResults={studentResults}
        handleResultChange={(studentId, exerciseId, value) => {
          setStudentResults(prev => ({
            ...prev,
            [studentId]: {
              ...(prev[studentId] || {}),
              [exerciseId]: value
            }
          }));
        }}
      />
      <div className="flex justify-end mt-6">
        <button
          className="innohassle-button px-6 py-2 rounded text-base"
          disabled={Object.keys(studentResults).length === 0}
          onClick={async () => {
            setSubmitStatus('loading');
            setSubmitMessage('');
            try {
            // Collect all results for all students
              const results: Array<{student_id: string, exercise_id: number, value: string}> = [];
              Object.entries(studentResults).forEach(([student_id, exercises]) => {
                Object.entries(exercises).forEach(([exercise_id, value]) => {
                  results.push({
                    student_id,
                    exercise_id: Number(exercise_id),
                    value: String(value)
                  });
                });
              });
              await fitnessTestAPI.uploadResults(session.session.id, {
                semester_id: session.session.semester.id,
                retake: session.session.retake,
                results
              });
              setSubmitStatus('success');
              setSubmitMessage('Results submitted!');
            } catch (e) {
              setSubmitStatus('error');
              setSubmitMessage('Failed to submit results');
            } finally {
              setTimeout(() => setSubmitStatus('idle'), 2000);
            }
          }}
        >
          Submit results
        </button>
        {/* DEBUG: separate button for testing POST submission */}
        <button
          className="innohassle-button px-4 py-1 rounded text-xs bg-red-200 ml-4"
          onClick={debugSubmitResults}
        >DEBUG SUBMIT</button>
      </div>
    </div>
  );
};

export default FitnessSessionPage;
