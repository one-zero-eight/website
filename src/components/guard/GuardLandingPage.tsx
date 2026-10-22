import { Link } from "@tanstack/react-router";
import { Trans } from "@lingui/react/macro";

export function GuardLandingPage() {
  return (
    <div className="@container/content mx-auto flex w-full max-w-[720px] flex-col gap-8 px-4 py-8">
      <section className="flex flex-col gap-3">
        <p className="text-base leading-relaxed">
          <Trans>
            Guard protects Google Spreadsheets with SSO join links — only
            signed-in university users get access, and you stay in control of
            who can edit.
          </Trans>
        </p>
        <ul className="text-base-content/70 flex flex-col gap-2 text-base leading-relaxed">
          <li className="flex gap-2">
            <span className="icon-[material-symbols--shield-locked-outline-rounded] text-primary mt-0.5 shrink-0 text-xl" />
            <Trans>
              Spreadsheets owned by a service account so only Guard can grant
              access
            </Trans>
          </li>
          <li className="flex gap-2">
            <span className="icon-[material-symbols--link-rounded] text-primary mt-0.5 shrink-0 text-xl" />
            <Trans>
              Share a join link; respondents sign in via SSO and get the role
              you choose
            </Trans>
          </li>
          <li className="flex gap-2">
            <span className="icon-[material-symbols--manage-accounts-outline-rounded] text-primary mt-0.5 shrink-0 text-xl" />
            <Trans>Manage joins, roles, and bans from one place</Trans>
          </li>
        </ul>
      </section>

      <div className="flex flex-col gap-3">
        <Link
          to="/guard/create"
          className="bg-base-200 hover:bg-base-300 rounded-field flex items-center gap-3 px-4 py-3.5 transition-colors"
        >
          <span className="icon-[material-symbols--add-notes-outline-rounded] text-primary shrink-0 text-3xl" />
          <div className="min-w-0">
            <p className="text-base font-medium">
              <Trans>Create sheet</Trans>
            </p>
            <p className="text-base-content/60 text-base">
              <Trans>Create a new protected spreadsheet from scratch</Trans>
            </p>
          </div>
        </Link>

        <Link
          to="/guard/copy"
          className="bg-base-200 hover:bg-base-300 rounded-field flex items-center gap-3 px-4 py-3.5 transition-colors"
        >
          <span className="icon-[material-symbols--content-copy-outline-rounded] text-primary shrink-0 text-3xl" />
          <div className="min-w-0">
            <p className="text-base font-medium">
              <Trans>Copy sheet</Trans>
            </p>
            <p className="text-base-content/60 text-base">
              <Trans>Make a protected copy of an existing spreadsheet</Trans>
            </p>
          </div>
        </Link>

        <Link
          to="/guard/files"
          className="bg-base-200 hover:bg-base-300 rounded-field flex items-center gap-3 px-4 py-3.5 transition-colors"
        >
          <span className="icon-[material-symbols--folder-outline-rounded] text-primary shrink-0 text-3xl" />
          <div className="min-w-0">
            <p className="text-base font-medium">
              <Trans>Your sheets</Trans>
            </p>
            <p className="text-base-content/60 text-base">
              <Trans>View join links, roles, and access for your sheets</Trans>
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
