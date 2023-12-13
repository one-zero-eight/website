"use client";

import {
  calculateColorGPA,
  calculateGPA,
  calculateGPAFromScholarship,
  calculateMarksFromGPA,
  calculateScholarship,
  FORMULA_B_MAX_B22,
  FORMULA_B_MAX_B23,
  FORMULA_B_MIN,
  Mark,
  MARK_COLORS,
  MARK_MAPPING,
} from "@/lib/scholarship";
import { createRef, Fragment, useEffect, useState } from "react";
import { useLocalStorage, useWindowSize } from "usehooks-ts";

export default function ScholarshipCalculator() {
  const [_, setStorageMarks] = useLocalStorage<Mark[]>("scholarship-marks", []);
  const [__, setStorageIsB23] = useLocalStorage<boolean>(
    "scholarship-isB23",
    true,
  );
  const [marks, setMarks] = useState<Mark[]>([]);
  const [displayGPA, setDisplayGPA] = useState("");
  const [errorGPA, setErrorGPA] = useState(false);
  const [displayScholarship, setDisplayScholarship] = useState("");
  const [errorScholarship, setErrorScholarship] = useState(false);
  const [isB23, setIsB23] = useState(true);
  const marksTextAreaRef = createRef<HTMLTextAreaElement>();
  const { width: windowWidth } = useWindowSize();

  useEffect(() => {
    const isB23 = window.localStorage.getItem("scholarship-isB23") !== "false";
    setIsB23(isB23);

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
        onMarksChange(newMarks.join(""), isB23);
      }
    } catch (e) {
      // Accept any error
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onMarksChange = (v: string, isB23: boolean) => {
    setIsB23(isB23);
    setStorageIsB23(isB23);

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
      isB23 ? FORMULA_B_MAX_B23 : FORMULA_B_MAX_B22,
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

  const onGPAChange = (v: string, isB23: boolean) => {
    setIsB23(isB23);
    setStorageIsB23(isB23);

    v = v.substring(0, 5);
    setDisplayGPA(v);
    const gpa = Math.round(Number(v) * 100) / 100;
    if (!isNaN(gpa) && gpa >= 2 && gpa <= 5) {
      const newMarks = calculateMarksFromGPA(gpa);
      const newScholarship = calculateScholarship(
        gpa,
        FORMULA_B_MIN,
        isB23 ? FORMULA_B_MAX_B23 : FORMULA_B_MAX_B22,
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

  const onScholarshipChange = (v: string, isB23: boolean) => {
    setIsB23(isB23);
    setStorageIsB23(isB23);

    v = v.substring(0, 5);
    setDisplayScholarship(v);
    const scholarship = Number(v);
    if (
      !isNaN(scholarship) &&
      scholarship >= FORMULA_B_MIN &&
      scholarship <= (isB23 ? FORMULA_B_MAX_B23 : FORMULA_B_MAX_B22)
    ) {
      const newGPA = calculateGPAFromScholarship(
        scholarship,
        FORMULA_B_MIN,
        isB23 ? FORMULA_B_MAX_B23 : FORMULA_B_MAX_B22,
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
          onChange={(e) => onMarksChange(e.target.value, isB23)}
          autoComplete="off"
          spellCheck={false}
          className="inset-0 w-full resize-none overflow-hidden rounded-2xl border-2 border-section_g_start bg-transparent p-3 font-handwritten text-transparent caret-section_g_start outline-none"
          style={{ letterSpacing: "1em", lineHeight: "1.5em" }}
          rows={1}
          maxLength={50}
        />
        <div
          className="pointer-events-none absolute inset-0 flex w-full max-w-full flex-wrap border-2 border-transparent p-3 font-handwritten"
          style={{ letterSpacing: "1em", lineHeight: "1.5em" }}
        >
          {marks.map((v, i) => (
            <Fragment key={i}>
              <span style={{ color: MARK_COLORS[v] }}>{v}</span>
              <span className="-ml-3 mr-3 w-0 text-[#414141]">|</span>
            </Fragment>
          ))}
        </div>
        {marks.length !== 0 && (
          <button
            onClick={() => onMarksChange("", isB23)}
            className="absolute -right-1 -top-1 h-7 w-7 rounded-2xl bg-base p-2 align-middle text-lg text-section_g_start"
            style={{ lineHeight: 0 }}
          >
            X
          </button>
        )}
      </div>
      <div className="flex flex-row flex-wrap items-center justify-between">
        <div className="text-xl font-medium">Course:</div>
        <div className="flex w-32 flex-row overflow-clip rounded-2xl border-2 border-section_g_start">
          <button
            onClick={() => onMarksChange(marks.join(""), true)}
            className={`w-full rounded-l-2xl p-2 text-center font-handwritten transition-colors hover:bg-section_g_start/20 ${
              isB23
                ? "bg-section_g_start/10 text-section_g_start"
                : "bg-transparent text-gray-500"
            }`}
          >
            B23
          </button>
          <button
            onClick={() => onMarksChange(marks.join(""), false)}
            className={`w-full rounded-r-2xl p-2 text-center font-handwritten transition-colors hover:bg-section_g_start/20 ${
              !isB23
                ? "bg-section_g_start/10 text-section_g_start"
                : "bg-transparent text-gray-500"
            }`}
          >
            B22+
          </button>
        </div>
      </div>
      <div className="flex flex-row flex-wrap items-center justify-between">
        <div className="text-xl font-medium">Your GPA:</div>
        <input
          value={displayGPA}
          onChange={(e) => onGPAChange(e.target.value, isB23)}
          type="number"
          step={0.01}
          min={2}
          max={5}
          autoComplete="off"
          spellCheck={false}
          className={`w-32 rounded-2xl border-2 bg-transparent p-2 text-center font-handwritten outline-none ${
            !errorGPA ? "border-section_g_start" : "border-red-500"
          }`}
          style={{
            color: !errorGPA ? calculateColorGPA(Number(displayGPA)) : "red",
          }}
        />
      </div>
      <div className="flex flex-row flex-wrap items-center justify-between">
        <div className="text-xl font-medium">Scholarship:</div>
        <input
          value={displayScholarship}
          onChange={(e) => onScholarshipChange(e.target.value, isB23)}
          type="number"
          step={100}
          max={isB23 ? FORMULA_B_MAX_B23 : FORMULA_B_MAX_B22}
          min={FORMULA_B_MIN}
          autoComplete="off"
          spellCheck={false}
          className={`rubles-input w-32 rounded-2xl border-2 bg-transparent p-2 text-center font-handwritten outline-none ${
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
