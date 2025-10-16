import { useState } from "react";
import { guardTypes } from "@/api/guard";
import { useGuardMutations, FileRole } from "./hooks";
import { extractSpreadsheetId, parseSlugFromJoinLink } from "./utils";
import { ModeToggle } from "./ModeToggle";
import { CleanupAlert } from "./CleanupAlert";
import { CreateInstructions, TransferInstructions } from "./Instructions";
import { SetupResult } from "./SetupResult";
import { ROLE_LABELS, DEFAULT_MODE } from "./consts";

interface SetupContainerProps {
  serviceEmail: string;
}

export function SetupContainer({ serviceEmail }: SetupContainerProps) {
  const [mode, setMode] = useState<"create" | "transfer">(DEFAULT_MODE);
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
  const [cleanupSlug, setCleanupSlug] = useState<string | null>(null);

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
            user_role: respondentRole,
          },
        },
        {
          onSuccess: (data) => {
            setSetupResult({
              title: data.title,
              fileId: data.file_id,
              fileType: "spreadsheet",
              roleDisplay: data.user_role,
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

    // Transfer mode
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

    const transferRole =
      respondentRole === FileRole.writer
        ? guardTypes.TransferFileRequestUser_role.writer
        : guardTypes.TransferFileRequestUser_role.reader;

    mutations.transferFile.mutate(
      {
        body: {
          file_id: extractedId,
          user_role: transferRole,
        },
      },
      {
        onSuccess: (data) => {
          setSetupResult({
            title: data.title,
            fileId: data.file_id,
            fileType: "spreadsheet",
            roleDisplay: data.user_role,
            joinLink: data.join_link,
          });
          setSpreadsheetId("");
          mutations.invalidateFiles();

          if ((data as any).cleanup_recommended) {
            const slug = parseSlugFromJoinLink(data.join_link || "");
            if (slug) setCleanupSlug(slug);
          }
        },
        onError: () => {
          setError("Failed to transfer spreadsheet.");
        },
      },
    );
  };

  const handleCleanup = () => {
    if (!cleanupSlug) return;

    mutations.cleanupFile.mutate(
      { params: { path: { slug: cleanupSlug } } },
      {
        onSuccess: () => {
          setCleanupSlug(null);
          mutations.invalidateFile(cleanupSlug);
        },
      },
    );
  };

  const handleBlur = () => {
    if (mode === "transfer" && spreadsheetId.trim()) {
      const validationError = validateSpreadsheetId(spreadsheetId);
      setError(validationError);
    }
  };

  const isSubmitting =
    mode === "create"
      ? mutations.createFile.isPending
      : mutations.transferFile.isPending;

  return (
    <div>
      <ModeToggle mode={mode} onChange={setMode} />

      {mode === "create" ? (
        <CreateInstructions serviceEmail={serviceEmail} />
      ) : (
        <TransferInstructions serviceEmail={serviceEmail} />
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
            <label htmlFor="title" className="font-medium text-contrast/80">
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
              className="w-full rounded-lg border-2 border-contrast/20 bg-primary/5 px-4 py-2 outline-none transition-colors focus:border-primary focus:bg-primary/10"
            />
          </div>
        )}

        {mode === "transfer" && (
          <div className="flex flex-col gap-2">
            <label
              htmlFor="spreadsheet_id"
              className="font-medium text-contrast/80"
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
              className="w-full rounded-lg border-2 border-contrast/20 bg-primary/5 px-4 py-2 outline-none transition-colors focus:border-primary focus:bg-primary/10"
            />
          </div>
        )}

        <div className="flex flex-col gap-2">
          <label className="font-medium text-contrast/80">
            Respondent Role:
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setRespondentRole(FileRole.writer)}
              className={`rounded-lg border-2 px-3 py-2 text-sm font-medium ${
                respondentRole === FileRole.writer
                  ? "border-brand-violet bg-brand-violet/10"
                  : "border-contrast/20 hover:border-contrast/40"
              }`}
            >
              {ROLE_LABELS.writer}
            </button>
            <button
              type="button"
              onClick={() => setRespondentRole(FileRole.reader)}
              className={`rounded-lg border-2 px-3 py-2 text-sm font-medium ${
                respondentRole === FileRole.reader
                  ? "border-brand-violet bg-brand-violet/10"
                  : "border-contrast/20 hover:border-contrast/40"
              }`}
            >
              {ROLE_LABELS.reader}
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded border-2 border-red-400 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-600 dark:bg-red-900/20 dark:text-red-200">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={
            isSubmitting ||
            (mode === "create" ? !title.trim() : !spreadsheetId.trim())
          }
          className="rounded-lg bg-brand-violet px-4 py-3 font-medium text-white transition-colors hover:bg-[#6600CC] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting
            ? mode === "create"
              ? "Creating..."
              : "Transferring..."
            : mode === "create"
              ? "Create InNoHassle Guard Sheet"
              : "Protect Existing Sheet"}
        </button>
      </form>

      {setupResult && (
        <SetupResult
          result={setupResult}
          onDismiss={() => setSetupResult(null)}
        />
      )}

      {cleanupSlug && (
        <CleanupAlert
          onCleanup={handleCleanup}
          isPending={mutations.cleanupFile.isPending}
        />
      )}
    </div>
  );
}
