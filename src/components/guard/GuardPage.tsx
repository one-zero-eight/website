import { useMe } from "@/api/accounts/user.ts";
import { $guard } from "@/api/guard";
import { AuthWall } from "@/components/common/AuthWall.tsx";
import { useState } from "react";
import { GuardInstructions } from "./GuardInstructions.tsx";
import { ServiceAccountInfo } from "./ServiceAccountInfo.tsx";
import { SetupForm } from "./SetupForm.tsx";
import { SetupResult } from "./SetupResult.tsx";
import { guardTypes } from "@/api/guard";

export function GuardPage() {
  const { me } = useMe();
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [respondentRole, setRespondentRole] =
    useState<guardTypes.SetupSpreadsheetRequestRespondent_role>(
      guardTypes.SetupSpreadsheetRequestRespondent_role.writer,
    );
  const [error, setError] = useState("");
  const [setupResult, setSetupResult] = useState<{
    sheetTitle: string;
    spreadsheetId: string;
    roleDisplay: string;
    joinLink: string;
  } | null>(null);

  const { data: serviceAccountData, isLoading: isLoadingEmail } =
    $guard.useQuery("get", "/google/service-account-email");

  const { mutate: setupSpreadsheet, isPending: isSubmitting } =
    $guard.useMutation("post", "/google/documents", {
      onSuccess: (data) => {
        setSetupResult({
          sheetTitle: data.sheet_title,
          spreadsheetId: data.spreadsheet_id,
          roleDisplay: data.role_display,
          joinLink: data.join_link,
        });
        setSpreadsheetId("");
        setError("");
      },
      onError: () => {
        setError(
          "Failed to setup spreadsheet. Make sure the service account has editor access.",
        );
      },
    });

  const extractSpreadsheetId = (input: string): string | null => {
    const match = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
  };

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

  const handleSpreadsheetIdChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = e.target.value;
    setSpreadsheetId(value);

    if (error) {
      setError("");
    }
  };

  const handleBlur = () => {
    if (spreadsheetId.trim()) {
      const validationError = validateSpreadsheetId(spreadsheetId);
      setError(validationError);
    }
  };

  const handleSetup = () => {
    if (!spreadsheetId.trim()) return;

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

    setError("");

    setupSpreadsheet({
      body: {
        spreadsheet_id: extractedId,
        respondent_role: respondentRole,
      },
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSetup();
    }
  };

  const handleClear = () => {
    setSpreadsheetId("");
    setError("");
  };

  if (!me) {
    return <AuthWall />;
  }

  return (
    <div className="flex grow flex-col gap-4 p-4">
      <div className="w-full max-w-2xl self-center">
        <GuardInstructions serviceEmail={serviceAccountData?.email || ""} />

        <ServiceAccountInfo
          email={serviceAccountData?.email || ""}
          isLoading={isLoadingEmail}
        />

        <form
          className="mt-6 flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleSetup();
          }}
        >
          <SetupForm
            spreadsheetId={spreadsheetId}
            respondentRole={respondentRole}
            error={error}
            isSubmitting={isSubmitting}
            onSpreadsheetIdChange={handleSpreadsheetIdChange}
            onRoleChange={setRespondentRole}
            onBlur={handleBlur}
            onKeyDown={handleKeyPress}
            onClear={handleClear}
            onSubmit={handleSetup}
          />
        </form>

        {setupResult && <SetupResult result={setupResult} />}
      </div>
    </div>
  );
}
