import { buildDocsUrl, buildSheetsUrl } from "./utils";
import { CopyLinkButton } from "./CopyLinkButton";
import { useServiceAccountEmail } from "./hooks";
import { ServiceAccountEmail } from "./Instructions";

export function SetupResult({
  result,
  onDismiss,
}: {
  result: {
    title: string;
    fileId: string;
    fileType: string;
    guardingMethod: string;
    roleDisplay: string;
    joinLink: string;
  };
  onDismiss?: () => void;
}) {
  const { serviceEmail } = useServiceAccountEmail();

  const fileUrl =
    result.fileType === "spreadsheet"
      ? buildSheetsUrl(result.fileId)
      : buildDocsUrl(result.fileId);

  return (
    <div className="alert alert-success alert-soft flex-col items-stretch gap-3">
      <div>
        <h3 className="text-lg font-semibold">Setup complete</h3>
        <p className="mt-1 text-sm">
          New file was created under{" "}
          <ServiceAccountEmail email={serviceEmail} /> ownership. You were added
          with editor role.
        </p>
        <p className="text-base-content/70 mt-2 text-sm">
          Edit the spreadsheet or share the join link with students.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <CopyLinkButton text={result.joinLink} />
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-outline btn-sm"
        >
          Open spreadsheet
        </a>
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className="btn btn-ghost btn-sm ml-auto"
          >
            Dismiss
          </button>
        ) : null}
      </div>
    </div>
  );
}
