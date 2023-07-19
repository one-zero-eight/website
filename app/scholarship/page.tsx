import { Navbar } from "@/components/Navbar";
import ScholarshipCalculator from "@/components/ScholarshipCalculator";
import React from "react";

export default function Page() {
  return (
    <main className="p-16 items-center lg:[align-items:normal]">
      <h1 className="lgw-smh:hidden lgw-smh:invisible text-3xl text-center lg:text-left xl:text-4xl font-bold">
        Scholarship calculator
      </h1>
      <p className="lgw-smh:hidden lgw-smh:invisible text-text-secondary/75 text-center text-base py-2 xl:text-lg lg:text-left">
        Calculate your scholarship easily. Type your marks, GPA or expected
        scholarship.
      </p>
      <Navbar>
        <h1 className="text-text-main text-3xl text-center lg:text-left xl:text-4xl font-bold">
          Scholarship calculator
        </h1>
        <p className="text-text-secondary/75 text-center text-base py-2 xl:text-lg lg:text-left">
          Calculate your scholarship easily. Type your marks, GPA or expected
          scholarship.
        </p>
      </Navbar>
      <ScholarshipCalculator />
    </main>
  );
}
