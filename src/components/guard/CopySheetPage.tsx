import { guardTypes } from "@/api/guard";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import { useEffect, useState } from "react";
import { CopyInstructions } from "./Instructions";
import { RolesSwitch } from "./JoinsList";
import { SetupResult } from "./SetupResult";
import { FileRole, useGuardMutations, useServiceAccountEmail } from "./hooks";
import { extractSpreadsheetId, loadGmail, saveGmail } from "./utils";

export function CopySheetPage() {
  const { serviceEmail, isPending: isEmailPending } = useServiceAccountEmail();
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [gmail, setGmail] = useState("");
  const [respondentRole, setRespondentRole] = useState<FileRole>(
    FileRole.writer,
  );
  const [error, setError] = useState("");
  const [setupResult, setSetupResult] = useState<{
    title: string;
    fileId: string;
    fileType: string;
    guardingMethod: string;
    roleDisplay: string;
    joinLink: string;
  } | null>(null);

  const mutations = useGuardMutations();

  useEffect(() => {
    const savedGmail = loadGmail();
    if (savedGmail) {
      setGmail(savedGmail);
    }
  }, []);

  const validateSpreadsheetId = (input: string): string => {
    if (!input.trim()) return "";

    const extractedId = extractSpreadsheetId(input);

    if (!extractedId) {
      return "Invalid Google Spreadsheet URL";
    }

    if (extractedId.length < 10) {
      return "Spreadsheet ID seems too short";
    }

    return "";
  };

  const handleBlur = () => {
    if (spreadsheetId.trim()) {
      setError(validateSpreadsheetId(spreadsheetId));
    }
  };

  const handleSubmit = () => {
    setError("");

    if (!gmail.trim()) {
      setError("Gmail is required");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(gmail.trim())) {
      setError("Please enter a valid Gmail address");
      return;
    }

    if (!spreadsheetId.trim()) {
      setError("Spreadsheet URL is required");
      return;
    }

    const validationError = validateSpreadsheetId(spreadsheetId);
    if (validationError) {
      setError(validationError);
      return;
    }

    const extractedId = extractSpreadsheetId(spreadsheetId);
    if (!extractedId) {
      setError("Failed to extract Spreadsheet ID");
      return;
    }

    const copyRole =
      respondentRole === FileRole.writer
        ? guardTypes.CopyFileRequestDefault_role.writer
        : guardTypes.CopyFileRequestDefault_role.reader;

    saveGmail(gmail.trim());

    mutations.copyFile.mutate(
      {
        body: {
          file_id: extractedId,
          default_role: copyRole,
          owner_gmail: gmail.trim(),
        },
      },
      {
        onSuccess: (data) => {
          setSetupResult({
            title: data.title,
            fileId: data.file_id,
            fileType: data.file_type,
            guardingMethod: "copy",
            roleDisplay: data.default_role,
            joinLink: data.join_link,
          });
          setSpreadsheetId("");
          mutations.invalidateFiles();
        },
        onError: (err) => {
          setError(formatApiErrorMessage(err));
        },
      },
    );
  };

  const isSubmitting = mutations.copyFile.isPending;

  return (
    <div className="@container/content mx-auto flex w-full max-w-[720px] flex-col gap-4 px-4 py-8">
      {isEmailPending ? (
        <div className="skeleton h-16 w-full" />
      ) : (
        <CopyInstructions serviceEmail={serviceEmail} />
      )}

      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <fieldset className="fieldset">
          <legend className="fieldset-legend">Spreadsheet URL</legend>
          <input
            type="text"
            id="spreadsheet_id"
            value={spreadsheetId}
            onChange={(e) => {
              setSpreadsheetId(e.target.value);
              if (error) setError("");
            }}
            onBlur={handleBlur}
            placeholder="https://docs.google.com/spreadsheets/d/..."
            className="input input-bordered w-full"
          />
        </fieldset>

        <fieldset className="fieldset">
          <legend className="fieldset-legend">Owner Gmail</legend>
          <input
            type="email"
            id="gmail"
            value={gmail}
            onChange={(e) => {
              setGmail(e.target.value);
              if (error) setError("");
            }}
            placeholder="your.email@gmail.com"
            className="input input-bordered w-full"
          />
        </fieldset>

        <fieldset className="fieldset">
          <legend className="fieldset-legend">Guests Role</legend>
          <RolesSwitch
            currentRole={respondentRole}
            onSwitch={setRespondentRole}
          />
        </fieldset>

        {error && (
          <div className="alert alert-error alert-soft">
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || !gmail.trim() || !spreadsheetId.trim()}
          className="btn btn-primary"
        >
          {isSubmitting ? (
            <>
              <span className="loading loading-spinner loading-sm" />
              Copying...
            </>
          ) : (
            "Copy sheet"
          )}
        </button>
      </form>

      {setupResult && (
        <SetupResult
          result={setupResult}
          onDismiss={() => setSetupResult(null)}
        />
      )}
    </div>
  );
}
