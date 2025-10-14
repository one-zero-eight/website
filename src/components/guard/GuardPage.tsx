import { useMe } from "@/api/accounts/user.ts";
import { $guard } from "@/api/guard";
import { AuthWall } from "@/components/common/AuthWall.tsx";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
  const queryClient = useQueryClient();
  const [slugCopied, setSlugCopied] = useState<boolean>(false);

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

  const { mutate: deleteDocument, isPending: isDeleting } = $guard.useMutation(
    "delete",
    "/google/documents/{slug}",
  );

  const { mutate: banUser, isPending: _isBanning } = $guard.useMutation(
    "post",
    "/google/documents/{slug}/bans",
  );

  const { mutate: unbanUser, isPending: _isUnbanning } = $guard.useMutation(
    "delete",
    "/google/documents/{slug}/bans/{user_id}",
  );

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

  const handleCopy = async (slug: string) => {
    const link = `${window.location.origin}/guard/google/documents/${slug}/join`;
    try {
      await navigator.clipboard.writeText(link);
      setSlugCopied(true);
      setTimeout(() => setSlugCopied(false), 2000);
    } catch (_) {
      // ignore
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
                <h3 className="truncate text-lg">
                  {selectedDocument?.title || "Untitled"}
                </h3>
                <p className="text-sm font-normal text-contrast/60">
                  {selectedDocument?.user_role}, created at{" "}
                  {new Date(selectedDocument?.created_at).toLocaleString()}
                </p>
              </div>
              <div className="ml-4 flex shrink-0 items-center gap-2">
                <button
                  onClick={() => {
                    setSelectedSlug(null);
                    setJoinsSearch("");
                  }}
                  className="rounded-lg border-2 border-contrast/20 px-3 py-2 text-sm font-medium hover:border-contrast/40"
                >
                  Back to documents
                </button>
              </div>
            </div>

            <div className="mb-4 flex items-center gap-2">
              <button
                onClick={() => {
                  if (!selectedSlug) return;
                  handleCopy(selectedSlug);
                }}
                className={`rounded-lg px-3.5 py-2.5 text-sm font-medium ${
                  slugCopied
                    ? "bg-green-500 text-white"
                    : "bg-brand-violet text-white hover:bg-[#6600CC]"
                }`}
              >
                {slugCopied ? "Copied!" : "Copy link"}
              </button>

              <button
                onClick={() => {
                  if (!selectedDocument?.spreadsheet_id) return;
                  const url = `https://docs.google.com/spreadsheets/d/${selectedDocument.spreadsheet_id}/edit`;
                  window.location.href = url;
                }}
                disabled={!selectedDocument?.spreadsheet_id}
                className="rounded-lg border-2 border-contrast/20 px-3 py-2 text-sm font-medium hover:border-contrast/40 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Open spreadsheet
              </button>
              <button
                onClick={() => {
                  if (!selectedSlug) return;
                  if (!confirm("Delete this document link?")) return;
                  deleteDocument(
                    { params: { path: { slug: selectedSlug } } },
                    {
                      onSuccess: async () => {
                        setSelectedSlug(null);
                        setJoinsSearch("");
                        await queryClient.invalidateQueries({
                          queryKey: ["guard", "get", "/google/documents", {}],
                        });
                      },
                    },
                  );
                }}
                disabled={isDeleting}
                className="rounded-lg border-2 border-red-500 px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isDeleting
                  ? "Deleting document link..."
                  : "Delete document link"}
              </button>
            </div>

            <div className="mb-4">
              <input
                type="text"
                value={joinsSearch}
                onChange={(e) => setJoinsSearch(e.target.value)}
                placeholder="Search by gmail or innomail"
                className="w-full rounded-lg border-2 border-contrast/20 bg-primary/5 px-4 py-3 outline-none transition-colors focus:border-contrast/40 focus:bg-primary/10"
              />
            </div>

            {isLoadingSelected ? (
              <div className="text-contrast/70">Loading joins...</div>
            ) : (
              <JoinsList
                joins={(selectedDocument?.joins || []) as any}
                search={joinsSearch}
                onBan={(userId) => {
                  if (!selectedSlug) return;
                  banUser(
                    {
                      params: { path: { slug: selectedSlug } },
                      body: { user_id: userId },
                    },
                    {
                      onSuccess: async () => {
                        await queryClient.invalidateQueries({
                          queryKey: [
                            "guard",
                            "get",
                            "/google/documents/{slug}",
                            { params: { path: { slug: selectedSlug } } },
                          ],
                        });
                      },
                    },
                  );
                }}
              />
            )}

            <div className="mt-6">
              <h4 className="mb-2 text-base font-semibold">Banned</h4>
              <BannedList
                banned={(selectedDocument?.banned || []) as any}
                search={joinsSearch}
                onUnban={(userId) => {
                  if (!selectedSlug) return;
                  unbanUser(
                    {
                      params: { path: { slug: selectedSlug, user_id: userId } },
                    },
                    {
                      onSuccess: async () => {
                        await queryClient.invalidateQueries({
                          queryKey: [
                            "guard",
                            "get",
                            "/google/documents/{slug}",
                            { params: { path: { slug: selectedSlug } } },
                          ],
                        });
                      },
                    },
                  );
                }}
              />
            </div>
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
                className="w-full rounded-lg border-2 border-contrast/20 bg-primary/5 px-4 py-3 outline-none transition-colors focus:border-contrast/40 focus:bg-primary/10"
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
              className="rounded-lg border-2 border-contrast/20 px-3 py-2 text-sm font-medium hover:border-contrast/40"
            >
              Show more
            </button>
            <button
              onClick={() => handleCopy(doc.slug)}
              className={`rounded-lg px-3.5 py-2.5 text-sm font-medium text-white ${
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
  user_id: string;
  gmail: string;
  innomail: string;
  joined_at: string;
};

type BannedItem = {
  user_id: string;
  gmail: string;
  innomail: string;
  banned_at: string;
};

function Email({ email }: { email: string }) {
  return (
    <span>
      {email.split("@")[0]}
      <span className="text-contrast/50">@{email.split("@")[1]}</span>
    </span>
  );
}

function JoinsList({
  joins,
  search,
  onBan,
}: {
  joins: JoinItem[];
  search: string;
  onBan: (userId: string) => void;
}) {
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
    <div className="flex max-h-80 flex-col gap-3 overflow-auto">
      {filtered.map((j) => (
        <div
          key={`${j.user_id}`}
          className="flex items-center justify-between rounded-lg border-2 border-contrast/20 bg-primary/5 px-4 py-3"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Email email={j.gmail} />
              <Email email={j.innomail} />
            </div>
            <div className="text-xs text-contrast/50">
              joined at {new Date(j.joined_at).toLocaleString()}
            </div>
          </div>
          <BanButton onClick={() => onBan(j.user_id)} />
        </div>
      ))}
    </div>
  );
}

function BannedList({
  banned,
  search,
  onUnban,
}: {
  banned: BannedItem[];
  search: string;
  onUnban: (userId: string) => void;
}) {
  const q = search.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!q) return banned;
    return banned.filter(
      (b) =>
        (b.gmail || "").toLowerCase().includes(q) ||
        (b.innomail || "").toLowerCase().includes(q),
    );
  }, [banned, q]);

  if (!banned || banned.length === 0) {
    return <div className="text-contrast/60">No banned users.</div>;
  }

  return (
    <div className="flex max-h-80 flex-col gap-3 overflow-auto">
      {filtered.map((b) => (
        <div
          key={`${b.user_id}`}
          className="flex items-center justify-between rounded-lg border-2 border-contrast/20 bg-primary/5 px-4 py-3"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Email email={b.gmail} />
              <Email email={b.innomail} />
            </div>
            <div className="text-xs text-contrast/50">
              banned at {new Date(b.banned_at).toLocaleString()}
            </div>
          </div>
          <UnbanButton onClick={() => onUnban(b.user_id)} />
        </div>
      ))}
    </div>
  );
}

function BanButton({ onClick }: { onClick: () => void }) {
  const [pending, setPending] = useState(false);
  return (
    <button
      onClick={async () => {
        if (!confirm("Ban this user?")) return;
        setPending(true);
        try {
          await onClick();
        } finally {
          setPending(false);
        }
      }}
      disabled={pending}
      className="ml-4 shrink-0 rounded-lg border-2 border-red-500 px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
      title="Ban user"
    >
      {pending ? "Banning..." : "Ban"}
    </button>
  );
}

function UnbanButton({ onClick }: { onClick: () => void }) {
  const [pending, setPending] = useState(false);
  return (
    <button
      onClick={async () => {
        if (!confirm("Unban this user?")) return;
        setPending(true);
        try {
          await onClick();
        } finally {
          setPending(false);
        }
      }}
      disabled={pending}
      className="ml-4 shrink-0 rounded-lg border-2 border-green-500 px-3 py-2 text-sm font-medium text-green-500 hover:bg-green-500/20 disabled:cursor-not-allowed disabled:opacity-50"
      title="Unban user"
    >
      {pending ? "Unbanning..." : "Unban"}
    </button>
  );
}
