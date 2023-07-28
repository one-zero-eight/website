import { ScholarshipBmax } from "@/components/icons/ScholarshipBmax";
import { ScholarshipBmin } from "@/components/icons/ScholarshipBmin";
import { ScholarshipFormula } from "@/components/icons/ScholarshipFormula";
import { ScholarshipGPA } from "@/components/icons/ScholarshipGPA";
import { ScholarshipS } from "@/components/icons/ScholarshipS";
import { Navbar } from "@/components/Navbar";
import ScholarshipCalculator from "@/components/ScholarshipCalculator";
import React from "react";

export default function Page() {
  return (
    <main className="px-4 lg:px-12 py-16 items-center lg:[align-items:normal]">
      <h1 className="lgw-smh:hidden lgw-smh:invisible text-3xl text-center lg:text-left xl:text-4xl font-bold">
        Scholarship calculator
      </h1>
      <p className="lgw-smh:hidden lgw-smh:invisible text-text-secondary/75 text-center text-base py-2 xl:text-lg lg:text-left">
        Calculate your scholarship easily. Just type your marks, GPA or expected
        scholarship.
      </p>
      <Navbar>
        <h1 className="text-text-main text-3xl text-center lg:text-left xl:text-4xl font-bold">
          Scholarship calculator
        </h1>
        <p className="text-text-secondary/75 text-center text-base py-2 xl:text-lg lg:text-left">
          Calculate your scholarship easily. Just type your marks, GPA or
          expected scholarship.
        </p>
      </Navbar>

      <div className="flex flex-col items-center">
        <div className="max-w-2xl w-full my-12">
          <ScholarshipCalculator />
        </div>

        <div className="max-w-2xl">
          <h2 className="text-3xl text-center">Information</h2>

          <h3 className="text-2xl mt-4">Academic scholarships:</h3>
          <p>
            For the first semester &mdash; scholarship from the admissions
            department.
          </p>
          <p>For the next semesters &mdash; using the following formula:</p>
          <ScholarshipFormula className="fill-text-main my-4 w-full" />

          <p>
            <ScholarshipS className="inline fill-text-main -mt-1" /> &mdash;
            scholarship amount
          </p>
          <p>
            <ScholarshipBmin className="inline fill-text-main -mt-1" /> &mdash;
            minimum scholarship amount (3,000₽)
          </p>
          <p>
            <ScholarshipBmax className="inline fill-text-main -mt-1" /> &mdash;
            maximum scholarship amount (20,000₽)
          </p>
          <p>
            <ScholarshipGPA className="inline fill-text-main" /> &mdash;
            student&apos;s average grade for the last semester
          </p>

          <h3 className="text-2xl mt-4">Increased scholarship:</h3>
          <p>
            + <i>10,000₽</i> &mdash; if you get all A grades in all subjects for
            two consecutive semesters.
          </p>
          <p>
            + <i>6,000₽</i> &mdash; if you win a competition for a{" "}
            <a
              href="https://my.university.innopolis.ru/profile/student-achievements"
              target="_blank"
              className="italic underline"
            >
              higher scholarship
            </a>{" "}
            (+<i>12,000₽</i> for{" "}
            <a
              href="https://innopolis.university/upload/iblock/0f7/d9batvrsu87higzhdr3ulkuzfmtakzzl/Об_утверждении_размеров_государственных_стипендий.pdf"
              target="_blank"
              className="italic underline"
            >
              state-funded students
            </a>
            ).
          </p>

          <h3 className="text-2xl mt-4">Financial support:</h3>
          <p>
            <i>reimbursement</i> &mdash; if you participate in events, you can
            apply for travel and accommodation cost reimbursement.
          </p>
          <p>
            <i>support</i> &mdash; if you require financial assistance due to
            personal or unexpected reasons, you can submit a financial support
            application to 319.
          </p>

          <h3 className="text-2xl mt-4">Official sources:</h3>
          <p>
            See more information about scholarships in{" "}
            <a
              href="http://campuslife.innopolis.ru/handbook2023#scholarship"
              target="_blank"
              className="italic underline"
            >
              Student&apos;s Handbook
            </a>
            .
          </p>
          <p>
            See your scholarship for the current semester on the{" "}
            <a
              href="https://my.university.innopolis.ru/profile/personal-form/index?tab=scholarship"
              target="_blank"
              className="italic underline"
            >
              My University
            </a>{" "}
            portal.
          </p>
          <p>
            See your marks on the{" "}
            <a
              href="https://my.university.innopolis.ru/profile/personal-form/index?tab=validations"
              target="_blank"
              className="italic underline"
            >
              My University
            </a>{" "}
            portal.
          </p>
        </div>
      </div>
    </main>
  );
}
