import { guardTypes } from "@/api/guard";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import { useEffect, useState } from "react";
import { RolesSwitch } from "./JoinsList";
import { SetupResult } from "./SetupResult";
import { FileRole, useGuardMutations } from "./hooks";
import { loadGmail, saveGmail } from "./utils";

export function CreateSheetPage() {
  const [title, setTitle] = useState("");
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

    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    saveGmail(gmail.trim());

    mutations.createFile.mutate(
      {
        body: {
          file_type: guardTypes.CreateFileRequestFile_type.spreadsheet,
          title: title.trim(),
          default_role: respondentRole,
          owner_gmail: gmail.trim(),
        },
      },
      {
        onSuccess: (data) => {
          setSetupResult({
            title: data.title,
            fileId: data.file_id,
            fileType: "spreadsheet",
            guardingMethod: "create",
            roleDisplay: data.default_role,
            joinLink: data.join_link,
          });
          setTitle("");
          mutations.invalidateFiles();
        },
        onError: (err) => {
          setError(formatApiErrorMessage(err));
        },
      },
    );
  };

  const isSubmitting = mutations.createFile.isPending;

  return (
    <div className="@container/content mx-auto flex w-full max-w-[720px] flex-col gap-4 px-4 py-8">
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <fieldset className="fieldset">
          <legend className="fieldset-legend">Title</legend>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (error) setError("");
            }}
            placeholder="e.g., CSE electives"
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
          disabled={isSubmitting || !gmail.trim() || !title.trim()}
          className="btn btn-primary"
        >
          {isSubmitting ? (
            <>
              <span className="loading loading-spinner loading-sm" />
              Creating...
            </>
          ) : (
            "Create sheet"
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
