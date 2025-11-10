import { useState } from "react";
import { guardTypes } from "@/api/guard";
import { useGuardMutations, FileRole } from "./hooks";
import { extractSpreadsheetId } from "./utils";
import { ModeToggle } from "./ModeToggle";
import { CreateInstructions, CopyInstructions } from "./Instructions";
import { SetupResult } from "./SetupResult";
import { ROLE_LABELS, DEFAULT_MODE } from "./consts";

interface SetupContainerProps {
  serviceEmail: string;
}

export function SetupContainer({ serviceEmail }: SetupContainerProps) {
  const [mode, setMode] = useState<"create" | "copy">(DEFAULT_MODE);
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [title, setTitle] = useState("");
  const [respondentRole, setRespondentRole] = useState<FileRole>(
    FileRole.writer,
  );
  const [error, setError] = useState("");
  const [setupResult, setSetupResult] = useState<{
    title: string;
    fileId: string;
    fileType: string;
    roleDisplay: string;
    joinLink: string;
  } | null>(null);

  const mutations = useGuardMutations();

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

  const handleSubmit = async () => {
    setError("");

    if (mode === "create") {
      if (!title.trim()) {
        setError("Title is required");
        return;
      }

      mutations.createFile.mutate(
        {
          body: {
            file_type: guardTypes.CreateFileRequestFile_type.spreadsheet,
            title: title.trim(),
            default_role: respondentRole,
            owner_gmail: "",
          },
        },
        {
          onSuccess: (data) => {
            setSetupResult({
              title: data.title,
              fileId: data.file_id,
              fileType: "spreadsheet",
              roleDisplay: data.default_role,
              joinLink: data.join_link,
            });
            setTitle("");
            mutations.invalidateFiles();
          },
          onError: () => {
            setError("Failed to create spreadsheet.");
          },
        },
      );
      return;
    }

    // Copy mode
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

    mutations.copyFile.mutate(
      {
        body: {
          file_id: extractedId,
          default_role: copyRole,
          owner_gmail: "",
        },
      },
      {
        onSuccess: (data) => {
          setSetupResult({
            title: data.title,
            fileId: data.file_id,
            fileType: data.file_type,
            roleDisplay: data.default_role,
            joinLink: data.join_link,
          });
          setSpreadsheetId("");
          mutations.invalidateFiles();
        },
        onError: () => {
          setError("Failed to copy spreadsheet.");
        },
      },
    );
  };

  const handleBlur = () => {
    if (mode === "copy" && spreadsheetId.trim()) {
      const validationError = validateSpreadsheetId(spreadsheetId);
      setError(validationError);
    }
  };

  const isSubmitting =
    mode === "create"
      ? mutations.createFile.isPending
      : mutations.copyFile.isPending;

  return (
    <div>
      <ModeToggle mode={mode} onChange={setMode} />

      {mode === "create" ? (
        <CreateInstructions serviceEmail={serviceEmail} />
      ) : (
        <CopyInstructions serviceEmail={serviceEmail} />
      )}

      <form
        className="mt-4 flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        {mode === "create" && (
          <div className="flex flex-col gap-2">
            <label htmlFor="title" className="text-base-content/80 font-medium">
              Title:
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (error) setError("");
              }}
              placeholder="e.g., CSE electives"
              className="border-base-content/20 bg-inh-primary/5 focus:border-inh-primary focus:bg-inh-primary/10 rounded-field w-full border-2 px-4 py-2 outline-hidden transition-colors"
            />
          </div>
        )}

        {mode === "copy" && (
          <div className="flex flex-col gap-2">
            <label
              htmlFor="spreadsheet_id"
              className="text-base-content/80 font-medium"
            >
              Spreadsheet URL:
            </label>
            <input
              type="text"
              id="spreadsheet_id"
              value={spreadsheetId}
              onChange={(e) => {
                setSpreadsheetId(e.target.value);
                if (error) setError("");
              }}
              onBlur={handleBlur}
              placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
              className="border-base-content/20 bg-inh-primary/5 focus:border-inh-primary focus:bg-inh-primary/10 rounded-field w-full border-2 px-4 py-2 outline-hidden transition-colors"
            />
          </div>
        )}

        <div className="flex flex-col gap-2">
          <label className="text-base-content/80 font-medium">
            Respondent Role:
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setRespondentRole(FileRole.writer)}
              className={`rounded-field border-2 px-3 py-2 text-sm font-medium ${
                respondentRole === FileRole.writer
                  ? "border-primary bg-primary/10"
                  : "border-base-content/20 hover:border-base-content/40"
              }`}
            >
              {ROLE_LABELS.writer}
            </button>
            <button
              type="button"
              onClick={() => setRespondentRole(FileRole.reader)}
              className={`rounded-field border-2 px-3 py-2 text-sm font-medium ${
                respondentRole === FileRole.reader
                  ? "border-primary bg-primary/10"
                  : "border-base-content/20 hover:border-base-content/40"
              }`}
            >
              {ROLE_LABELS.reader}
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-sm border-2 border-red-400 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-600 dark:bg-red-900/20 dark:text-red-200">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={
            isSubmitting ||
            (mode === "create" ? !title.trim() : !spreadsheetId.trim())
          }
          className="bg-primary rounded-field px-4 py-3 font-medium text-white transition-colors hover:bg-[#6600CC] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting
            ? mode === "create"
              ? "Creating..."
              : "Copying..."
            : mode === "create"
              ? "Create InNoHassle Guard Sheet"
              : "Copy Existing Sheet"}
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
