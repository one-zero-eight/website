import React, { useState, useRef, useEffect } from 'react';
import { attendanceAPI } from '../services/attendanceAPI';
import StudentSearch from './StudentSearch';

interface AttendanceMarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  trainingId: number;
  groupId?: number;
  groupName?: string;
  start?: string;
}


const AttendanceMarkModal: React.FC<AttendanceMarkModalProps> = ({ isOpen, onClose, trainingId, groupId, groupName, start }) => {
  const [studentQuery, setStudentQuery] = useState('');
  const [studentOptions, setStudentOptions] = useState<any[]>([]);
  const [studentSearchLoading, setStudentSearchLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [hours, setHours] = useState('');

  // For individual hours editing
  const handleStudentHoursChange = (student_id: number, value: string) => {
    setStudents(prev => prev.map(s =>
      s.student_id === student_id ? { ...s, hours: value } : s
    ));
  };
  const [students, setStudents] = useState<any[]>([]);
  const [checked, setChecked] = useState<{[id: number]: boolean}>({});
  const [markedCount, setMarkedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);


  // Load students when modal opens
  useEffect(() => {
    if (!isOpen || !trainingId) return;
    attendanceAPI.getTrainingGrades(trainingId).then(res => {
      let grades = Array.isArray(res?.grades) ? res.grades : [];
      // If grades is empty, but students is present, use students
      if ((!grades || grades.length === 0) && Array.isArray((res as any)?.students)) {
        grades = (res as any).students.map((s: any) => ({
          ...s,
          hours: s.hours || '',
        }));
      }
      setStudents(grades);
      setTotalCount(grades.length);
      setChecked({});
      setMarkedCount(0);
    });
  }, [isOpen, trainingId]);

  // Filter students by search (only if no search term)
  const filteredStudents = Array.isArray(students) ? students : [];



  useEffect(() => {
    if (!studentQuery || !groupId) {
      setStudentOptions([]);
      return;
    }
    setStudentSearchLoading(true);
    attendanceAPI.searchStudents(groupId, studentQuery)
      .then((res) => {
        setStudentOptions(Array.isArray(res) ? res : []);
      })
      .catch(err => {
        console.error('[SEARCH ERROR]', err);
        setStudentOptions([]);
      })
      .finally(() => setStudentSearchLoading(false));
  }, [studentQuery, groupId]);


  // Handle checkbox marking
  const handleCheck = (id: number) => {
    setChecked(prev => {
      const next = { ...prev, [id]: !prev[id] };
      setMarkedCount(Object.values(next).filter(Boolean).length);
      return next;
    });
  };


  // Export CSV from server via API
  const handleExportCsv = async () => {
    if (!trainingId) return;
    try {
      const blob = await attendanceAPI.downloadGradesCsv(trainingId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `grades_${trainingId}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Error downloading CSV');
    }
  };

  // Mark all students in the table
  const handleMarkAll = () => {
    if (!students || students.length === 0) return;
    const allChecked: {[id: number]: boolean} = {};
    students.forEach(s => {
      allChecked[s.student_id] = true;
    });
    setChecked(allChecked);
    setMarkedCount(students.length);
  };

  // Save attendance marking
  const handleSave = async () => {
    if (!trainingId) return;
    const students_hours = students
        .filter(s => checked[s.student_id])
        .map(s => ({
          student_id: s.student_id,
          hours: Number(hours || s.hours || 0),
        }));
    if (students_hours.length === 0) {
      alert('No students selected');
      return;
    }
    try {
      await attendanceAPI.markAttendance({
        training_id: trainingId,
        students_hours,
      });
      alert('Attendance saved!');
      onClose();
    } catch (e: any) {
      alert('Error saving attendance: ' + (e?.message || 'Unknown error'));
    }
  };

  if (!isOpen) return null;

  // Format time for header
  const formatTime = (iso?: string) => iso ? new Date(iso).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' }) : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="innohassle-card bg-white dark:bg-neutral-900 max-w-4xl w-full max-h-[90vh] overflow-y-auto border-2 border-secondary/50 rounded-3xl shadow-2xl relative">
        <div className="flex items-center justify-between px-8 py-6 border-b border-secondary/50 bg-gradient-to-r from-primary/10 to-secondary/10">
          <h2 className="text-2xl font-bold text-contrast">Marking hours for {groupName || ''} <span className="text-inactive font-normal text-lg">{formatTime(start)}</span></h2>
          <button
            className="w-10 h-10 flex items-center justify-center bg-secondary/50 hover:bg-secondary/80 rounded-xl transition-all duration-200 text-inactive hover:text-contrast text-2xl"
            onClick={onClose}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>
        <div className="p-8 space-y-6 bg-gradient-to-b from-floating to-primary/10">
            <div className="flex flex-col sm:flex-row gap-3 relative">
              <div className="flex-1 relative">
                <StudentSearch
                    studentQuery={studentQuery}
                    setStudentQuery={q => {
                      setStudentQuery(q);
                      setSelectedStudent(null);
                    }}
                    studentOptions={studentOptions}
                    studentSearchLoading={studentSearchLoading}
                    selectedStudent={selectedStudent}
                    setSelectedStudent={option => {
                      // Add student to table if not present
                      const [student_id, full_name, email, med_group] = option.value.split('_');
                      if (!students.some(st => String(st.student_id) === student_id)) {
                        setStudents(prev => [
                          {
                            student_id: Number(student_id),
                            full_name,
                            email,
                            med_group,
                            hours: '',
                          },
                          ...prev
                        ]);
                        setTotalCount(prev => prev + 1);
                      }
                      // After selection, only reset selectedStudent to keep dropdown
                      setSelectedStudent(null);
                    }}
                />
              </div>
              <div className="flex flex-1 gap-2">
                <input
                    type="text"
                    className="flex-1 border-2 border-secondary/30 rounded-xl px-3 py-2 bg-secondary/10 cursor-pointer"
                    placeholder="Upload moodle CSV attendance"
                    value={csvFile ? csvFile.name : ''}
                    readOnly
                    onClick={() => fileInputRef.current?.click()}
                />
                <input
                    type="file"
                    accept=".csv"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    onChange={e => {
                      if (e.target.files && e.target.files[0]) setCsvFile(e.target.files[0]);
                    }}
                />
                <button
                    className="px-4 py-2 border-2 border-secondary/30 rounded-xl bg-secondary/10 hover:bg-secondary/20 text-contrast font-medium"
                    onClick={() => fileInputRef.current?.click()}
                >
                  Browse
                </button>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <div className="flex-1">
                <span className="text-base">Marked students: </span>
                <span className="inline-block bg-secondary/20 rounded px-2 py-1 font-mono text-sm align-middle">{markedCount}/{totalCount}</span>
              </div>
              <div className="flex-1 flex items-center gap-2">
                <label htmlFor="hours" className="text-base whitespace-nowrap">Hours per training:</label>
                <input
                    id="hours"
                    type="number"
                    min="0"
                    step="0.5"
                    className="border-2 border-secondary/30 rounded-xl px-3 py-2 w-24 focus:border-brand-violet outline-none transition-colors"
                    placeholder="Hours"
                    value={hours}
                    onChange={e => setHours(e.target.value)}
                />
              </div>
            </div>
            {/* Modern student list */}
            <div className="rounded-2xl border-2 border-secondary/30 bg-gray-100 dark:bg-neutral-800 divide-y divide-secondary/20 shadow-sm">
              <div className="grid grid-cols-12 gap-4 px-8 py-4 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-t-2xl text-contrast font-semibold text-base">
                <div className="col-span-1 text-center">#</div>
                <div className="col-span-3">Name</div>
                <div className="col-span-3">Email</div>
                <div className="col-span-2 text-center">Hours</div>
                <div className="col-span-3 text-center">Mark</div>
              </div>
              {filteredStudents.length > 0 ? (
                filteredStudents.map((s, i) => (
                  <div key={s.student_id} className={`grid grid-cols-12 gap-4 items-center px-8 py-4 ${i % 2 ? 'bg-secondary/10' : ''}`} style={{ minHeight: 56 }}>
                    <div className="col-span-1 text-center text-inactive">{i + 1}</div>
                    <div className="col-span-3 font-medium truncate">{s.full_name || `${s.first_name} ${s.last_name}`}</div>
                    <div className="col-span-3 text-inactive truncate">{s.email}</div>
                    <div className="col-span-2 flex justify-center">
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        className="border-2 border-secondary/30 rounded-xl px-3 py-2 w-24 text-center focus:border-brand-violet outline-none transition-colors"
                        value={s.hours ?? ''}
                        onChange={e => handleStudentHoursChange(s.student_id, e.target.value)}
                      />
                    </div>
                    <div className="col-span-3 flex justify-center">
                      <input
                        type="checkbox"
                        checked={!!checked[s.student_id]}
                        onChange={() => handleCheck(s.student_id)}
                        className="w-5 h-5 accent-brand-violet"
                      />
                    </div>
                  </div>
                ))
              ) : Array.isArray(students) && students.length > 0 ? (
                students.map((s, i) => (
                  <div key={s.student_id} className={`grid grid-cols-12 gap-4 items-center px-8 py-4 ${i % 2 ? 'bg-secondary/10' : ''}`} style={{ minHeight: 56 }}>
                    <div className="col-span-1 text-center text-inactive">{i + 1}</div>
                    <div className="col-span-3 font-medium truncate">{s.full_name || `${s.first_name} ${s.last_name}`}</div>
                    <div className="col-span-3 text-inactive truncate">{s.email}</div>
                    <div className="col-span-2 flex justify-center">
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        className="border-2 border-secondary/30 rounded-xl px-3 py-2 w-24 text-center focus:border-brand-violet outline-none transition-colors"
                        value={s.hours ?? ''}
                        onChange={e => handleStudentHoursChange(s.student_id, e.target.value)}
                      />
                    </div>
                    <div className="col-span-3 flex justify-center">
                      <input
                        type="checkbox"
                        checked={!!checked[s.student_id]}
                        onChange={() => handleCheck(s.student_id)}
                        className="w-5 h-5 accent-brand-violet"
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-8 py-12 text-center text-inactive">No students found</div>
              )}
            </div>
           
            <div className="flex flex-wrap gap-3 mt-8 justify-end">
              <button
                className="px-6 py-3 rounded-2xl bg-brand-violet text-white font-semibold hover:bg-brand-violet/80 shadow transition-all"
                onClick={onClose}
              >
                Close
              </button>
              <button
                className="px-6 py-3 rounded-2xl bg-brand-violet text-white font-semibold hover:bg-brand-violet/80 shadow transition-all"
                onClick={handleExportCsv}
              >
                Export csv
              </button>
              <button
                className="px-6 py-3 rounded-2xl bg-brand-violet text-white font-semibold hover:bg-brand-violet/80 shadow transition-all"
                onClick={handleMarkAll}
              >
                Mark all ( h.)
              </button>
              <button
                className="px-6 py-3 rounded-2xl bg-brand-violet text-white font-semibold hover:bg-brand-violet/80 shadow transition-all"
                onClick={handleSave}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
  );
};

export default AttendanceMarkModal;
