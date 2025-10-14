import { useMe } from "@/api/accounts/user.ts";
import { $guard } from "@/api/guard";
import { AuthWall } from "@/components/common/AuthWall.tsx";
import { useMemo, useState } from "react";
import { GuardInstructions } from "./GuardInstructions.tsx";
import { ServiceAccountInfo } from "./ServiceAccountInfo.tsx";
import { SetupForm } from "./SetupForm.tsx";
import { SetupResult } from "./SetupResult.tsx";
import { guardTypes } from "@/api/guard";

export function GuardPage() {
  const { me } = useMe();
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [title, setTitle] = useState("");
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
  const [search, setSearch] = useState("");
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [joinsSearch, setJoinsSearch] = useState("");

  const { data: serviceAccountData, isLoading: isLoadingEmail } =
    $guard.useQuery("get", "/google/service-account-email");

  const { data: documentsData, isLoading: isLoadingDocs } = $guard.useQuery(
    "get",
    "/google/documents",
  );

  const { data: selectedDocument, isLoading: isLoadingSelected } =
    $guard.useQuery(
      "get",
      "/google/documents/{slug}",
      selectedSlug
        ? {
            params: { path: { slug: selectedSlug } },
          }
        : ({} as any),
      { enabled: !!selectedSlug },
    );

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
        title: title.trim() || undefined,
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
            title={title}
            error={error}
            isSubmitting={isSubmitting}
            onSpreadsheetIdChange={handleSpreadsheetIdChange}
            onRoleChange={setRespondentRole}
            onTitleChange={(e) => setTitle(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyPress}
            onClear={handleClear}
            onSubmit={handleSetup}
          />
        </form>

        {setupResult && <SetupResult result={setupResult} />}

        <hr className="my-6 border-contrast/20" />

        {selectedSlug ? (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div className="min-w-0">
                <h2 className="text-xl font-semibold">Joins list</h2>
                <h3 className="truncate text-base">
                  {selectedDocument?.title || "Untitled"}
                </h3>
                <p className="text-sm font-normal text-contrast/60">
                  {selectedDocument?.user_role}, created at{" "}
                  {new Date(selectedDocument?.created_at).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedSlug(null);
                  setJoinsSearch("");
                }}
                className="ml-4 shrink-0 rounded-lg border-2 border-contrast/20 px-3 py-2 text-sm font-medium hover:bg-primary/10"
              >
                Back to documents
              </button>
            </div>

            <div className="mb-4">
              <input
                type="text"
                value={joinsSearch}
                onChange={(e) => setJoinsSearch(e.target.value)}
                placeholder="Search by gmail or innomail"
                className="w-full rounded-lg border-2 border-contrast/20 bg-primary/5 px-4 py-3 outline-none transition-colors focus:border-primary focus:bg-primary/10"
              />
            </div>

            {isLoadingSelected ? (
              <div className="text-contrast/70">Loading joins...</div>
            ) : (
              <JoinsList
                joins={(selectedDocument?.joins || []) as any}
                search={joinsSearch}
              />
            )}
          </div>
        ) : (
          <div>
            <h2 className="mb-3 text-xl font-semibold">Your Documents</h2>

            <div className="mb-4">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by title or paste full join link or slug"
                className="w-full rounded-lg border-2 border-contrast/20 bg-primary/5 px-4 py-3 outline-none transition-colors focus:border-primary focus:bg-primary/10"
              />
            </div>

            {isLoadingDocs ? (
              <div className="text-contrast/70">Loading...</div>
            ) : null}

            {documentsData && documentsData.length > 0 ? (
              <DocumentsList
                documents={documentsData}
                search={search}
                onShowJoins={(slug) => setSelectedSlug(slug)}
              />
            ) : (
              !isLoadingDocs && (
                <div className="text-contrast/60">No documents found.</div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}

type DocumentItem = {
  slug: string;
  title?: string | null;
  created_at: string;
  joins_count: number;
  user_role: string;
};

function DocumentsList({
  documents,
  search,
  onShowJoins,
}: {
  documents: DocumentItem[];
  search: string;
  onShowJoins: (slug: string) => void;
}) {
  const normalizedSearch = search.trim().toLowerCase();
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const searchSlug = useMemo(() => {
    if (!normalizedSearch) return "";
    // Accept either raw slug or full URL like innohassle.ru/guard/google/documents/{slug}/join/
    const urlMatch = normalizedSearch.match(
      /\/guard\/google\/documents\/([a-z0-9-_.~]+)/,
    );
    if (urlMatch && urlMatch[1]) return urlMatch[1];
    return normalizedSearch;
  }, [normalizedSearch]);

  const filtered = useMemo(() => {
    if (!normalizedSearch) return documents;
    return documents.filter((d) => {
      const title = (d.title || "").toLowerCase();
      const slug = d.slug.toLowerCase();
      return title.includes(normalizedSearch) || slug.includes(searchSlug);
    });
  }, [documents, normalizedSearch, searchSlug]);

  const handleCopy = async (slug: string) => {
    const link = `${window.location.origin}/guard/google/documents/${slug}/join`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedSlug(slug);
      setTimeout(() => setCopiedSlug(null), 2000);
    } catch (_) {
      // ignore
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {filtered.map((doc) => (
        <div
          key={doc.slug}
          className="flex items-center justify-between rounded-lg border-2 border-contrast/20 bg-primary/5 px-4 py-3"
        >
          <div className="min-w-0">
            <div className="truncate font-medium">
              {doc.title || "Untitled"}
            </div>
            <div className="flex items-center gap-2 truncate text-sm text-contrast/60">
              {doc.user_role}, {doc.joins_count}{" "}
              {doc.joins_count === 1 ? "join" : "joins"}, created at{" "}
              {new Date(doc.created_at).toLocaleString()}
            </div>
            <div className="text-sm text-contrast/60"></div>
          </div>
          <div className="ml-4 flex shrink-0 items-center gap-2">
            <button
              onClick={() => onShowJoins(doc.slug)}
              className="rounded-lg border-2 border-contrast/20 px-3 py-2 text-sm font-medium hover:bg-primary/10"
            >
              Show joins
            </button>
            <button
              onClick={() => handleCopy(doc.slug)}
              className={`rounded-lg px-3 py-2 text-sm font-medium text-white ${
                copiedSlug === doc.slug
                  ? "bg-green-600 hover:bg-green-600"
                  : "bg-brand-violet hover:bg-[#6600CC]"
              }`}
              title={copiedSlug === doc.slug ? "Copied!" : "Copy join link"}
            >
              {copiedSlug === doc.slug ? "Copied!" : "Copy Link"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

type JoinItem = {
  gmail: string;
  innomail: string;
  joined_at: string;
};

function Email({ email }: { email: string }) {
  return (
    <span>
      {email.split("@")[0]}
      <span className="text-contrast/50">@{email.split("@")[1]}</span>
    </span>
  );
}

function JoinsList({ joins, search }: { joins: JoinItem[]; search: string }) {
  const q = search.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!q) return joins;
    return joins.filter(
      (j) =>
        (j.gmail || "").toLowerCase().includes(q) ||
        (j.innomail || "").toLowerCase().includes(q),
    );
  }, [joins, q]);

  if (!joins || joins.length === 0) {
    return <div className="text-contrast/60">No joins yet.</div>;
  }

  return (
    <div className="flex flex-col gap-3">
      {filtered.map((j) => (
        <div
          key={`${j.gmail}-${j.innomail}`}
          className="rounded-lg border-2 border-contrast/20 bg-primary/5 px-4 py-3"
        >
          <div className="flex items-center gap-2">
            <Email email={j.gmail} />
            <Email email={j.innomail} />
          </div>
          <div className="text-xs text-contrast/50">
            joined at {new Date(j.joined_at).toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  );
}
