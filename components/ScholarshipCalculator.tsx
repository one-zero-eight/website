"use client";

import {
  calculateColorGPA,
  calculateGPA,
  calculateGPAFromScholarship,
  calculateMarksFromGPA,
  calculateScholarship,
  FORMULA_B_MAX,
  FORMULA_B_MIN,
  Mark,
  MARK_COLORS,
  MARK_MAPPING,
} from "@/lib/scholarship";
import { createRef, Fragment, useEffect, useState } from "react";
import { useLocalStorage, useWindowSize } from "usehooks-ts";

export default function ScholarshipCalculator() {
  const [_, setStorageMarks] = useLocalStorage<Mark[]>("scholarship-marks", []);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [displayGPA, setDisplayGPA] = useState("");
  const [errorGPA, setErrorGPA] = useState(false);
  const [displayScholarship, setDisplayScholarship] = useState("");
  const [errorScholarship, setErrorScholarship] = useState(false);
  const marksTextAreaRef = createRef<HTMLTextAreaElement>();
  const { width: windowWidth } = useWindowSize();

  useEffect(() => {
    const marks = window.localStorage.getItem("scholarship-marks");
    if (!marks) return;
    try {
      const parsed = JSON.parse(marks);
      if (typeof parsed === "object") {
        const newMarks: Mark[] = [];
        for (let m of parsed) {
          if (m in MARK_MAPPING) {
            newMarks.push(MARK_MAPPING[m]);
          }
        }
        onMarksChange(newMarks.join(""));
      }
    } catch (e) {
      // Accept any error
    }
  }, []);

  const onMarksChange = (v: string) => {
    const newMarks: Mark[] = [];
    for (let c of v) {
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
      FORMULA_B_MAX
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
    marks?: Mark[]
  ) => {
    if (target && marks) {
      const selectionStart = target.selectionStart;
      const selectionEnd = target.selectionEnd;
      target.value = marks.join("");
      target.selectionStart = selectionStart;
      target.selectionEnd = selectionEnd;
    }
  };

  const onGPAChange = (v: string) => {
    setDisplayGPA(v);
    const gpa = Math.round(Number(v) * 100) / 100;
    if (!isNaN(gpa) && gpa >= 2 && gpa <= 5) {
      const newMarks = calculateMarksFromGPA(gpa);
      const newScholarship = calculateScholarship(
        gpa,
        FORMULA_B_MIN,
        FORMULA_B_MAX
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

  const onScholarshipChange = (v: string) => {
    setDisplayScholarship(v);
    const scholarship = Number(v);
    if (
      !isNaN(scholarship) &&
      scholarship >= FORMULA_B_MIN &&
      scholarship <= FORMULA_B_MAX
    ) {
      const newGPA = calculateGPAFromScholarship(
        scholarship,
        FORMULA_B_MIN,
        FORMULA_B_MAX
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
      <div className="text-text text-3xl xl:text-4xl font-medium mt-8 mb-4 text-center">
        Enter your grades or GPA
      </div>
      <div className="relative">
        <textarea
          ref={marksTextAreaRef}
          onChange={(e) => onMarksChange(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          className="resize-none text-transparent caret-section_g_start inset-0 w-full p-2 font-handwritten rounded-2xl bg-transparent outline-none border-2 border-section_g_start overflow-hidden"
          style={{ letterSpacing: "1em", lineHeight: "1.5em" }}
          rows={1}
        />
        <div
          className="absolute flex flex-wrap w-full max-w-full inset-0 pointer-events-none p-2 font-handwritten border-2 border-transparent"
          style={{ letterSpacing: "1em", lineHeight: "1.5em" }}
        >
          {marks.map((v, i) => (
            <Fragment key={i}>
              <span style={{ color: MARK_COLORS[v] }}>{v}</span>
              <span className="w-0 -ml-3 mr-3 text-[#414141]">|</span>
            </Fragment>
          ))}
        </div>
      </div>
      <div className="flex flex-row flex-wrap justify-between items-center">
        <div className="text-text text-xl font-medium">Your GPA:</div>
        <input
          value={displayGPA}
          onChange={(e) => onGPAChange(e.target.value)}
          type="number"
          step={0.01}
          min={2}
          max={5}
          autoComplete="off"
          spellCheck={false}
          className={`w-32 text-center font-handwritten rounded-2xl bg-transparent p-2 outline-none border-2 ${
            !errorGPA ? "border-section_g_start" : "border-red-500"
          }`}
          style={{
            color: !errorGPA ? calculateColorGPA(Number(displayGPA)) : "red",
          }}
        />
      </div>
      <div className="flex flex-row flex-wrap justify-between items-center">
        <div className="text-text text-xl font-medium">Scholarship:</div>
        <input
          value={displayScholarship}
          onChange={(e) => onScholarshipChange(e.target.value)}
          type="number"
          step={100}
          max={FORMULA_B_MAX}
          min={FORMULA_B_MIN}
          autoComplete="off"
          spellCheck={false}
          className={`rubles-input w-32 text-center font-handwritten rounded-2xl bg-transparent p-2 outline-none border-2 ${
            !errorScholarship ? "border-section_g_start" : "border-red-500"
          }`}
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
