import { ScholarshipBmax } from "@/components/icons/ScholarshipBmax.tsx";
import { ScholarshipBmin } from "@/components/icons/ScholarshipBmin.tsx";
import { ScholarshipFormula } from "@/components/icons/ScholarshipFormula.tsx";
import { ScholarshipGPA } from "@/components/icons/ScholarshipGPA.tsx";
import { ScholarshipS } from "@/components/icons/ScholarshipS.tsx";
import ScholarshipCalculator from "@/components/scholarship/ScholarshipCalculator.tsx";

export function ScholarshipPage() {
  return (
    <>
      <div className="max-w-2xl self-center p-4">
        <ScholarshipCalculator />
      </div>

      <div className="flex max-w-2xl flex-col self-center p-4 text-lg">
        <h2 className="text-center text-3xl">Information</h2>

        <h3 className="mt-4 text-2xl">Academic scholarships:</h3>
        <p>
          For the first semester &mdash; scholarship from the admissions
          department.
        </p>
        <p>For the next semesters &mdash; using the following formula:</p>
        <ScholarshipFormula className="my-4 w-full fill-contrast stroke-none" />

        <p>
          <ScholarshipS className="-mt-1 inline fill-contrast" /> &mdash;
          scholarship amount
        </p>
        <p>
          <ScholarshipBmin className="-mt-1 inline fill-contrast" /> &mdash;
          minimum scholarship amount (3,000₽)
        </p>
        <p>
          <ScholarshipBmax className="-mt-1 inline fill-contrast" /> &mdash;
          maximum scholarship amount (10,000₽ )
        </p>
        <p>
          <ScholarshipGPA className="inline fill-contrast" /> &mdash;
          student&apos;s average grade for the last semester
        </p>

        <h3 className="mt-4 text-2xl">Increased scholarship:</h3>
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

        <h3 className="mt-4 text-2xl">Financial support:</h3>
        <p>
          <i>reimbursement</i> &mdash; if you participate in events, you can
          apply for travel and accommodation cost reimbursement.
        </p>
        <p>
          <i>support</i> &mdash; if you require financial assistance due to
          personal or unexpected reasons, you can submit a financial support
          application to 319.
        </p>

        <h3 className="mt-4 text-2xl">Official sources:</h3>
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
            href="https://my.innopolis.university/education"
            target="_blank"
            className="italic underline"
          >
            My University
          </a>{" "}
          portal.
        </p>
        <p>
          See the official documents about scholarship on the{" "}
          <a
            href="https://innopolis.university/sveden/grants"
            target="_blank"
            className="italic underline"
          >
            Innopolis University
          </a>{" "}
          website.
        </p>
      </div>
    </>
  );
}
