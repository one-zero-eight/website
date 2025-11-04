import {
  calculateColorGPA,
  calculateGPA,
  calculateGPAFromScholarship,
  calculateMarksFromGPA,
  calculateScholarship,
  Courses,
  FORMULA_B_MAX_MAPPING,
  FORMULA_B_MIN,
  Mark,
  MARK_COLORS,
  MARK_MAPPING,
} from "@/lib/scholarship";
import clsx from "clsx";
import { createRef, Fragment, useEffect, useState } from "react";
import { useLocalStorage, useWindowSize } from "usehooks-ts";

export default function ScholarshipCalculator() {
  const [_, setStorageMarks] = useLocalStorage<Mark[]>("scholarship-marks", []);
  const [__, setStorageCourse] = useLocalStorage<Courses>(
    "scholarship-course",
    "B25",
  );
  const [marks, setMarks] = useState<Mark[]>([]);
  const [displayGPA, setDisplayGPA] = useState("");
  const [errorGPA, setErrorGPA] = useState(false);
  const [displayScholarship, setDisplayScholarship] = useState("");
  const [errorScholarship, setErrorScholarship] = useState(false);
  const [course, setCourse] = useState<Courses>("B25");
  const marksTextAreaRef = createRef<HTMLTextAreaElement>();
  const { width: windowWidth } = useWindowSize();

  useEffect(() => {
    const courseStored = window.localStorage.getItem("scholarship-course");
    const course =
      courseStored === '"B23"'
        ? "B23"
        : courseStored === '"B24"'
          ? "B24"
          : courseStored === '"M25"'
            ? "M25"
            : "B25";
    setCourse(course);

    const marks = window.localStorage.getItem("scholarship-marks");
    if (!marks) return;
    try {
      const parsed = JSON.parse(marks);
      if (typeof parsed === "object") {
        const newMarks: Mark[] = [];
        for (const m of parsed) {
          if (m in MARK_MAPPING) {
            newMarks.push(MARK_MAPPING[m]);
          }
        }
        onMarksChange(newMarks.join(""), course);
      }
    } catch {
      // Accept any error
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onMarksChange = (v: string, course: Courses) => {
    setCourse(course);
    setStorageCourse(course);

    const newMarks: Mark[] = [];
    for (const c of v) {
      // Convert characters to marks if there is mapping found
      if (c.toUpperCase() in MARK_MAPPING) {
        newMarks.push(MARK_MAPPING[c.toUpperCase()]);
      }
    }

    // Nothing is entered
    if (newMarks.length === 0) {
      setMarks([]);
      setStorageMarks([]);
      setDisplayGPA("");
      setDisplayScholarship("");
      setErrorGPA(false);
      setErrorScholarship(false);
      return;
    }

    // Calculate new scholarship
    const newGPA = calculateGPA(newMarks);
    const newScholarship = calculateScholarship(
      newGPA,
      FORMULA_B_MIN,
      FORMULA_B_MAX_MAPPING[course],
    );

    // Update state
    setMarks(newMarks);
    setStorageMarks(newMarks);
    setDisplayGPA(newGPA.toFixed(2));
    setDisplayScholarship(newScholarship.toString());
    setErrorGPA(false);
    setErrorScholarship(false);
  };

  // Update text area properties when marks change
  useEffect(() => {
    updateTextAreaContent(marksTextAreaRef.current, marks);
    updateTextAreaHeight(marksTextAreaRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marksTextAreaRef.current, marks, windowWidth]);

  // Update text area height after marks change
  const updateTextAreaHeight = (target?: HTMLTextAreaElement | null) => {
    if (target) {
      target.style.height = "auto";
      target.style.height = `${target.scrollHeight}px`;
    }
  };

  // Update text area content when marks change
  // Keeping caret position
  const updateTextAreaContent = (
    target?: HTMLTextAreaElement | null,
    marks?: Mark[],
  ) => {
    if (target && marks) {
      const selectionStart = target.selectionStart;
      const selectionEnd = target.selectionEnd;
      target.value = marks.join("");
      if (document.activeElement === target) {
        target.selectionStart = selectionStart;
        target.selectionEnd = selectionEnd;
      }
    }
  };

  const onGPAChange = (v: string, course: Courses) => {
    setCourse(course);
    setStorageCourse(course);

    v = v.substring(0, 5);
    setDisplayGPA(v);
    const gpa = Math.round(Number(v) * 100) / 100;
    if (!isNaN(gpa) && gpa >= 2 && gpa <= 5) {
      const newMarks = calculateMarksFromGPA(gpa);
      const newScholarship = calculateScholarship(
        gpa,
        FORMULA_B_MIN,
        FORMULA_B_MAX_MAPPING[course],
      );
      setMarks(newMarks);
      setStorageMarks(newMarks);
      setDisplayScholarship(newScholarship.toString());
      setErrorGPA(false);
      setErrorScholarship(false);
    } else {
      setErrorGPA(v !== "");
    }
  };

  const onScholarshipChange = (v: string, course: Courses) => {
    setCourse(course);
    setStorageCourse(course);

    v = v.substring(0, 5);
    setDisplayScholarship(v);
    const scholarship = Number(v);
    if (
      !isNaN(scholarship) &&
      scholarship >= FORMULA_B_MIN &&
      scholarship <= FORMULA_B_MAX_MAPPING[course]
    ) {
      const newGPA = calculateGPAFromScholarship(
        scholarship,
        FORMULA_B_MIN,
        FORMULA_B_MAX_MAPPING[course],
      );
      const newMarks = calculateMarksFromGPA(newGPA);
      setMarks(newMarks);
      setStorageMarks(newMarks);
      setDisplayGPA(newGPA.toFixed(2));
      setErrorGPA(false);
      setErrorScholarship(false);
    } else {
      setErrorScholarship(true);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="mb-4 text-center text-3xl font-medium">
        Enter your grades or GPA
      </div>
      <div className="relative">
        <textarea
          ref={marksTextAreaRef}
          onChange={(e) => onMarksChange(e.target.value, course)}
          autoComplete="off"
          spellCheck={false}
          className="border-primary bg-base-100 font-handwritten caret-primary rounded-box inset-0 w-full resize-none overflow-hidden border-2 p-3 text-transparent outline-hidden"
          style={{ letterSpacing: "1em", lineHeight: "1.5em" }}
          rows={1}
          maxLength={50}
        />
        <div
          className="font-handwritten pointer-events-none absolute inset-0 flex w-full max-w-full flex-wrap border-2 border-transparent p-3"
          style={{ letterSpacing: "1em", lineHeight: "1.5em" }}
        >
          {marks.map((v, i) => (
            <Fragment key={i}>
              <span style={{ color: MARK_COLORS[v] }}>{v}</span>
              <span className="mr-3 -ml-3 w-0 text-[#414141]">|</span>
            </Fragment>
          ))}
        </div>
        {marks.length !== 0 && (
          <button
            onClick={() => onMarksChange("", course)}
            className="bg-base-100 text-primary rounded-box absolute -top-1 -right-1 h-7 w-7 p-2 align-middle text-lg"
            style={{ lineHeight: 0 }}
          >
            X
          </button>
        )}
      </div>
      <div className="flex flex-row flex-wrap items-center justify-between">
        <div className="text-xl font-medium">Course:</div>
        <div className="border-primary bg-base-100 rounded-box flex w-56 flex-row overflow-clip border-2">
          <button
            onClick={() => onMarksChange(marks.join(""), "B25")}
            className={clsx(
              "font-handwritten hover:bg-primary/20 w-full rounded-l-2xl p-2 text-center text-lg transition-colors",
              course === "B25"
                ? "bg-primary/10 text-primary"
                : "bg-transparent text-gray-500",
            )}
          >
            B25
          </button>
          <button
            onClick={() => onMarksChange(marks.join(""), "B24")}
            className={clsx(
              "font-handwritten hover:bg-primary/20 w-full p-2 text-center text-lg transition-colors",
              course === "B24"
                ? "bg-primary/10 text-primary"
                : "bg-transparent text-gray-500",
            )}
          >
            B24
          </button>
          <button
            onClick={() => onMarksChange(marks.join(""), "B23")}
            className={clsx(
              "font-handwritten hover:bg-primary/20 w-full rounded-r-2xl p-2 text-center text-lg transition-colors",
              course === "B23"
                ? "bg-primary/10 text-primary"
                : "bg-transparent text-gray-500",
            )}
          >
            B23
          </button>
          <button
            onClick={() => onMarksChange(marks.join(""), "M25")}
            className={clsx(
              "font-handwritten hover:bg-primary/20 w-full rounded-r-2xl p-2 text-center text-lg transition-colors",
              course === "M25"
                ? "bg-primary/10 text-primary"
                : "bg-transparent text-gray-500",
            )}
          >
            M25
          </button>
        </div>
      </div>
      <div className="flex flex-row flex-wrap items-center justify-between">
        <div className="text-xl font-medium">Your GPA:</div>
        <input
          value={displayGPA}
          onChange={(e) => onGPAChange(e.target.value, course)}
          type="number"
          step={0.01}
          min={2}
          max={5}
          autoComplete="off"
          spellCheck={false}
          className={clsx(
            "bg-base-100 font-handwritten rounded-box w-56 border-2 p-2 text-center outline-hidden",
            !errorGPA ? "border-primary" : "border-red-500",
          )}
          style={{
            color: !errorGPA ? calculateColorGPA(Number(displayGPA)) : "red",
          }}
        />
      </div>
      <div className="flex flex-row flex-wrap items-center justify-between">
        <div className="text-xl font-medium">Scholarship:</div>
        <input
          value={displayScholarship}
          onChange={(e) => onScholarshipChange(e.target.value, course)}
          type="number"
          step={100}
          max={FORMULA_B_MAX_MAPPING[course]}
          min={FORMULA_B_MIN}
          autoComplete="off"
          spellCheck={false}
          className={clsx(
            "rubles-input bg-base-100 font-handwritten rounded-box w-56 border-2 p-2 text-center outline-hidden",
            !errorScholarship ? "border-primary" : "border-red-500",
          )}
          style={{
            color: !errorScholarship
              ? calculateColorGPA(Number(displayGPA))
              : "red",
          }}
        />
      </div>
    </div>
  );
}
