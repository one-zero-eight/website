// import { useState } from "react";
import { buildSheetsUrl, buildDocsUrl } from "./utils";
import { CopyLinkButton } from "./CopyLinkButton";
import { useServiceAccountEmail } from "./hooks";
import { ServiceAccountEmail } from "./Instructions";

interface SetupResultProps {
  result: {
    title: string;
    fileId: string;
    fileType: string;
    guardingMethod: string;
    roleDisplay: string;
    joinLink: string;
  };
  onDismiss?: () => void;
}

export function SetupResult({ result, onDismiss }: SetupResultProps) {
  // const [copied, setCopied] = useState(false);

  // const handleCopy = async () => {
  //   try {
  //     await navigator.clipboard.writeText(result.joinLink);
  //     setCopied(true);
  //     setTimeout(() => setCopied(false), 2000);
  //   } catch (_) {
  //     console.log("Failed to copy to clipboard");
  //   }
  // };
  const { serviceEmail } = useServiceAccountEmail();

  const fileUrl =
    result.fileType === "spreadsheet"
      ? buildSheetsUrl(result.fileId)
      : buildDocsUrl(result.fileId);

  return (
    <div className="rounded-field mt-4 border-2 border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
      {/* <div className="mb-4 text-center text-5xl"></div> */}
      <h3 className="mb-2 text-center text-xl font-semibold text-green-800 dark:text-green-300">
        ✅ Setup Complete!
      </h3>

      <div>
        <p className="text-base-content/80 mb-2 text-center font-medium">
          New file was created under{" "}
          <ServiceAccountEmail email={serviceEmail} /> ownership
          <br />
          You was added to the file with editor role
        </p>
        <p className="text-base-content/60 mt-4">
          You can edit spreadsheet or share join link with the students!
        </p>
      </div>

      <div className="mt-2 flex items-center justify-between dark:border-green-800">
        <div className="flex gap-2">
          <CopyLinkButton text={result.joinLink} variant="primary" />

          <a
            href={fileUrl}
            // disabled={!file?.file_id}
            className="border-base-content/20 hover:border-base-content/40 rounded-field border-2 px-3.5 py-2.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
          >
            Open spreadsheet
          </a>
        </div>

        {onDismiss ? (
          <button
            onClick={onDismiss}
            className="border-base-content/20 hover:border-base-content/40 rounded-field border-2 px-3 py-2 text-sm font-medium"
          >
            Dismiss
          </button>
        ) : null}
      </div>
    </div>
  );
}
