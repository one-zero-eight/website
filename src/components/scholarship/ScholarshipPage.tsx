import { ScholarshipBmax } from "@/components/icons/ScholarshipBmax.tsx";
import { Trans } from "@lingui/react/macro";
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
        <h2 className="text-center text-3xl">
          <Trans>Information</Trans>
        </h2>

        <h3 className="mt-4 text-2xl">
          <Trans>Academic scholarships:</Trans>
        </h3>
        <p>
          <Trans>
            For the first semester — scholarship from the admissions department.
          </Trans>
        </p>
        <p>
          <Trans>For the next semesters — using the following formula:</Trans>
        </p>
        <ScholarshipFormula className="fill-base-content my-4 w-full stroke-none" />

        <p>
          <Trans>
            <ScholarshipS className="fill-base-content -mt-1 inline" /> —
            scholarship amount
          </Trans>
        </p>
        <p>
          <Trans>
            <ScholarshipBmin className="fill-base-content -mt-1 inline" /> —
            minimum scholarship amount (3,000₽)
          </Trans>
        </p>
        <p>
          <Trans>
            <ScholarshipBmax className="fill-base-content -mt-1 inline" /> —
            maximum scholarship amount (10,000₽ for Bachelors or 20,000₽ for
            Masters)
          </Trans>
        </p>
        <p>
          <Trans>
            <ScholarshipGPA className="fill-base-content inline" /> — student's
            average grade for the last semester
          </Trans>
        </p>

        <p>
          <Trans>
            State Academic Scholarship for bachelor's and master's students —{" "}
            <i>3,500₽</i>.
          </Trans>
        </p>
        <p>
          <Trans>
            State Academic Scholarship for PhD students — <i>11,000₽</i>.
          </Trans>
        </p>
        <p>
          <Trans>
            Increased State Academic Scholarship for bachelor's and master's
            students — <i>12,000₽</i>.
          </Trans>
        </p>

        <h3 className="mt-4 text-2xl">
          <Trans>Social scholarships:</Trans>
        </h3>
        <p>
          <Trans>
            State Social Scholarship for bachelor's and master's students —{" "}
            <i>4,000₽</i>.
          </Trans>
        </p>
        <p>
          <Trans>
            Increased State Social Scholarship for bachelor's and master's
            students — <i>15,500₽</i>.
          </Trans>
        </p>

        <h3 className="mt-4 text-2xl">
          <Trans>Special payouts:</Trans>
        </h3>
        <p>
          <Trans>
            Special payouts are financial support granted by decision of the
            Scholarship Committee based on a student's application. They are
            available only for serious circumstances, such as the death of a
            close relative, disability, or maternity leave. Special payouts are
            not regular scholarships.
          </Trans>
        </p>

        <h3 className="mt-4 text-2xl">
          <Trans>Financial support:</Trans>
        </h3>
        <p>
          <Trans>
            <i>reimbursement</i> — if you participate in events, you can apply
            for travel and accommodation cost reimbursement.
          </Trans>
        </p>
        <p>
          <Trans>
            <i>support</i> — if you require financial assistance due to personal
            or unexpected reasons, you can{" "}
            <Link to="/student-affairs" className="italic underline">
              submit a financial support application
            </Link>{" "}
            to 319.
          </Trans>
        </p>

        <h3 className="mt-4 text-2xl">
          <Trans>Official sources:</Trans>
        </h3>
        <p>
          <Trans>
            See more information about scholarships in{" "}
            <a
              href="https://campuslife.innopolis.ru/handbook2023#scholarship"
              target="_blank"
              className="italic underline"
            >
              Student's Handbook
            </a>
            .
          </Trans>
        </p>
        <p>
          <Trans>
            See your scholarship for the current semester on the{" "}
            <a
              href="https://my.innopolis.university/education/scholarship"
              target="_blank"
              className="italic underline"
            >
              My University
            </a>{" "}
            portal.
          </Trans>
        </p>
        <p>
          <Trans>
            See your marks on the{" "}
            <a
              href="https://my.innopolis.university/education"
              target="_blank"
              className="italic underline"
            >
              My University
            </a>{" "}
            portal.
          </Trans>
        </p>
        <p>
          <Trans>
            See the official documents about scholarship on the{" "}
            <a
              href="https://innopolis.university/sveden/grants"
              target="_blank"
              className="italic underline"
            >
              Innopolis University
            </a>{" "}
            website.
          </Trans>
        </p>
      </div>
    </>
  );
}
