import { ScholarshipBmax } from "@/components/icons/ScholarshipBmax.tsx";
import { ScholarshipBmin } from "@/components/icons/ScholarshipBmin.tsx";
import { ScholarshipFormula } from "@/components/icons/ScholarshipFormula.tsx";
import { ScholarshipGPA } from "@/components/icons/ScholarshipGPA.tsx";
import { ScholarshipS } from "@/components/icons/ScholarshipS.tsx";
import ScholarshipCalculator from "@/components/scholarship/ScholarshipCalculator.tsx";
import { Link } from "@tanstack/react-router";

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
        <ScholarshipFormula className="fill-base-content my-4 w-full stroke-none" />

        <p>
          <ScholarshipS className="fill-base-content -mt-1 inline" /> &mdash;
          scholarship amount
        </p>
        <p>
          <ScholarshipBmin className="fill-base-content -mt-1 inline" /> &mdash;
          minimum scholarship amount (3,000₽)
        </p>
        <p>
          <ScholarshipBmax className="fill-base-content -mt-1 inline" /> &mdash;
          maximum scholarship amount (10,000₽ for Bachelors or 20,000₽ for
          Masters)
        </p>
        <p>
          <ScholarshipGPA className="fill-base-content inline" /> &mdash;
          student&apos;s average grade for the last semester
        </p>

        <p>
          State Academic Scholarship for bachelor&apos;s and master&apos;s
          students &mdash; <i>3,500₽</i>.
        </p>
        <p>
          State Academic Scholarship for PhD students &mdash; <i>11,000₽</i>.
        </p>
        <p>
          Increased State Academic Scholarship for bachelor&apos;s and
          master&apos;s students &mdash; <i>12,000₽</i>.
        </p>

        <h3 className="mt-4 text-2xl">Social scholarships:</h3>
        <p>
          State Social Scholarship for bachelor&apos;s and master&apos;s
          students &mdash; <i>4,000₽</i>.
        </p>
        <p>
          Increased State Social Scholarship for bachelor&apos;s and
          master&apos;s students &mdash; <i>15,500₽</i>.
        </p>

        <h3 className="mt-4 text-2xl">Special payouts:</h3>
        <p>
          Special payouts are financial support granted by decision of the
          Scholarship Committee based on a student&apos;s application. They are
          available only for serious circumstances, such as the death of a close
          relative, disability, or maternity leave. Special payouts are not
          regular scholarships.
        </p>

        <h3 className="mt-4 text-2xl">Financial support:</h3>
        <p>
          <i>reimbursement</i> &mdash; if you participate in events, you can
          apply for travel and accommodation cost reimbursement.
        </p>
        <p>
          <i>support</i> &mdash; if you require financial assistance due to
          personal or unexpected reasons, you can{" "}
          <Link to="/student-affairs" className="italic underline">
            submit a financial support application
          </Link>{" "}
          to 319.
        </p>

        <h3 className="mt-4 text-2xl">Official sources:</h3>
        <p>
          See more information about scholarships in{" "}
          <a
            href="https://campuslife.innopolis.ru/handbook2023#scholarship"
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
            href="https://my.innopolis.university/education/scholarship"
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
