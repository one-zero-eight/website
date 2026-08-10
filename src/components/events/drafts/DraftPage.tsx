import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import { $workshops } from "@/api/workshops";
import { DraftStatus } from "@/api/workshops/types";
import { Modal } from "@/components/common/Modal.tsx";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/ui/cn";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useEventsAuth } from "../hooks";
import { EventHeroImage } from "../shared/EventHeroImage";
import { EventInfoCard } from "../shared/EventInfoCard";
import { EventPageLayout } from "../shared/EventPageLayout";
import { LocaleContentSection } from "../shared/LocaleContentSection";
import { getDraftImageUrl } from "../utils/links";
import { DraftHostsSection } from "./DraftHostsSection";
import { DraftLinksSection } from "./DraftLinksSection";
import { EditDraftInfoModal } from "./EditDraftInfoModal";

export function DraftPage({ id }: { id: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showError } = useToast();
  const { canManage, clubs, isPending: isAuthPending } = useEventsAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addLocaleMenuRef = useRef<HTMLDivElement>(null);

  const [selectedLocale, setSelectedLocale] = useState<string | null>(null);
  const [editingLocale, setEditingLocale] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [addLocaleOpen, setAddLocaleOpen] = useState(false);
  const [deleteLocaleOpen, setDeleteLocaleOpen] = useState(false);
  const [editInfoOpen, setEditInfoOpen] = useState(false);
  const [imageCacheBust, setImageCacheBust] = useState(0);

  const { data: allowedLocales = [] } = $workshops.useQuery("get", "/locales");
  const { data, isPending, isError, error, refetch } = $workshops.useQuery(
    "get",
    "/drafts/{id}",
    { params: { path: { id } } },
    { enabled: canManage },
  );

  const locales = useMemo(
    () => Object.keys(data?.data.locales ?? {}),
    [data?.data.locales],
  );
  const missingLocales = allowedLocales.filter(
    (locale) => !locales.includes(locale),
  );

  useEffect(() => {
    if (!isAuthPending && !canManage) {
      navigate({ to: "/events" });
    }
  }, [canManage, isAuthPending, navigate]);

  useEffect(() => {
    if (locales.length === 0) {
      setSelectedLocale(null);
      return;
    }

    if (!selectedLocale || !locales.includes(selectedLocale)) {
      setSelectedLocale(locales[0] ?? null);
    }
  }, [locales, selectedLocale]);

  useEffect(() => {
    if (!addLocaleOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!addLocaleMenuRef.current?.contains(event.target as Node)) {
        setAddLocaleOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [addLocaleOpen]);

  const invalidateDraft = () => {
    queryClient.invalidateQueries({
      queryKey: $workshops.queryOptions("get", "/drafts/{id}", {
        params: { path: { id } },
      }).queryKey,
    });
    queryClient.invalidateQueries({
      queryKey: $workshops.queryOptions("get", "/drafts/").queryKey,
    });
  };

  const { mutate: putLocale, isPending: isSavingLocale } =
    $workshops.useMutation("put", "/drafts/{id}/locales/{locale}", {
      onError: (mutationError) => {
        showError("Error", formatApiErrorMessage(mutationError));
      },
    });

  const { mutate: deleteLocale, isPending: isDeletingLocale } =
    $workshops.useMutation("delete", "/drafts/{id}/locales/{locale}", {
      onSuccess: () => {
        setDeleteLocaleOpen(false);
        setEditingLocale(false);
        invalidateDraft();
      },
      onError: (mutationError) => {
        showError("Error", formatApiErrorMessage(mutationError));
      },
    });

  const { mutate: uploadImage, isPending: isUploadingImage } =
    $workshops.useMutation("post", "/drafts/{id}/image", {
      onSuccess: () => {
        setImageCacheBust(Date.now());
        invalidateDraft();
      },
      onError: (mutationError) => {
        showError("Error", formatApiErrorMessage(mutationError));
      },
    });

  const { mutate: submitDraft, isPending: isSubmitting } =
    $workshops.useMutation("post", "/submissions/{id}", {
      onSuccess: () => {
        invalidateDraft();
      },
      onError: (mutationError) => {
        showError("Error", formatApiErrorMessage(mutationError));
      },
    });

  const { mutate: acceptInvite, isPending: isAccepting } =
    $workshops.useMutation("post", "/drafts/{id}/accept", {
      onSuccess: (draft) => {
        queryClient.setQueryData(
          $workshops.queryOptions("get", "/drafts/{id}", {
            params: { path: { id } },
          }).queryKey,
          draft,
        );
        invalidateDraft();
      },
      onError: (mutationError) => {
        showError("Error", formatApiErrorMessage(mutationError));
      },
    });

  const { mutate: declineInvite, isPending: isDeclining } =
    $workshops.useMutation("post", "/drafts/{id}/decline", {
      onSuccess: () => {
        navigate({ to: "/events/drafts" });
        queryClient.invalidateQueries({
          queryKey: $workshops.queryOptions("get", "/drafts/").queryKey,
        });
      },
      onError: (mutationError) => {
        showError("Error", formatApiErrorMessage(mutationError));
      },
    });

  if (isAuthPending || isPending) {
    return (
      <div className="flex flex-col gap-4 px-4 py-4">
        <div className="skeleton h-48 w-full rounded-2xl" />
        <div className="skeleton h-40 w-full rounded-2xl" />
      </div>
    );
  }

  if (!canManage) {
    return null;
  }

  if (isError || !data) {
    return (
      <div className="px-4 py-4">
        <p className="text-error mb-2">
          {formatApiErrorMessage(error) || "Failed to load draft."}
        </p>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => refetch()}
        >
          Retry
        </button>
      </div>
    );
  }

  const localeContent = selectedLocale
    ? data.data.locales?.[selectedLocale]
    : undefined;
  const canEdit = data.can_edit;
  const controlsDisabled = editingLocale || !canEdit;
  const hasPendingInvite = clubs.some((club) =>
    data.invitations.includes(club.club_id),
  );
  const inviteActionPending = isAccepting || isDeclining;

  function handleStartEditLocale() {
    if (!selectedLocale) {
      return;
    }

    setEditName(localeContent?.name ?? "");
    setEditDescription(localeContent?.description ?? "");
    setEditingLocale(true);
  }

  function handleCancelEditLocale() {
    setEditingLocale(false);
    setEditName("");
    setEditDescription("");
  }

  function syncDraftCache(draft: typeof data) {
    if (!draft) {
      return;
    }

    queryClient.setQueryData(
      $workshops.queryOptions("get", "/drafts/{id}", {
        params: { path: { id } },
      }).queryKey,
      draft,
    );
  }

  function handleSaveLocale() {
    if (!selectedLocale) {
      return;
    }

    putLocale(
      {
        params: { path: { id, locale: selectedLocale } },
        body: {
          name: editName,
          description: editDescription,
        },
      },
      {
        onSuccess: (draft) => {
          syncDraftCache(draft);
          setEditingLocale(false);
          invalidateDraft();
        },
      },
    );
  }

  function handleAddLocale(locale: string) {
    setAddLocaleOpen(false);
    putLocale(
      {
        params: { path: { id, locale } },
        body: {
          name: null,
          description: null,
        },
      },
      {
        onSuccess: (draft) => {
          syncDraftCache(draft);
          setSelectedLocale(locale);
          setEditName("");
          setEditDescription("");
          setEditingLocale(true);
          invalidateDraft();
        },
      },
    );
  }

  function handleUploadImage(file: File) {
    const formData = new FormData();
    formData.append("image_file", file);
    uploadImage({
      params: { path: { id } },
      body: formData as never,
    });
  }

  return (
    <>
      <EventPageLayout
        hero={
          <EventHeroImage
            src={
              data.data.image_id
                ? `${getDraftImageUrl(id)}?t=${imageCacheBust}`
                : null
            }
          >
            {canEdit && (
              <>
                <button
                  type="button"
                  className="btn btn-sm btn-circle absolute right-3 bottom-3"
                  disabled={isUploadingImage}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {isUploadingImage ? (
                    <span className="loading loading-spinner loading-sm" />
                  ) : (
                    <span className="icon-[material-symbols--upload]" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleUploadImage(file);
                    }
                    e.target.value = "";
                  }}
                />
              </>
            )}
          </EventHeroImage>
        }
        main={
          <>
            {hasPendingInvite && (
              <div className="border-info/40 bg-info/10 mb-4 rounded-2xl border p-4">
                <p className="mb-3 text-sm">
                  Your club was invited as a host for this draft.
                </p>
                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={inviteActionPending}
                    onClick={() => declineInvite({ params: { path: { id } } })}
                  >
                    {isDeclining && (
                      <span className="loading loading-spinner loading-sm" />
                    )}
                    Decline
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={inviteActionPending}
                    onClick={() => acceptInvite({ params: { path: { id } } })}
                  >
                    {isAccepting && (
                      <span className="loading loading-spinner loading-sm" />
                    )}
                    Accept
                  </button>
                </div>
              </div>
            )}
            <LocaleContentSection
              locales={locales}
              selectedLocale={selectedLocale}
              onSelectLocale={(locale) => {
                if (editingLocale) {
                  return;
                }
                setSelectedLocale(locale);
              }}
              name={localeContent?.name}
              description={localeContent?.description}
              editing={editingLocale}
              editName={editName}
              editDescription={editDescription}
              onEditNameChange={setEditName}
              onEditDescriptionChange={setEditDescription}
              toolbar={
                canEdit ? (
                  <>
                    {missingLocales.length > 0 && (
                      <div className="relative" ref={addLocaleMenuRef}>
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost border"
                          disabled={controlsDisabled || isSavingLocale}
                          onClick={() => setAddLocaleOpen((open) => !open)}
                        >
                          +
                        </button>
                        {addLocaleOpen && (
                          <div className="border-base-300 bg-base-100 absolute top-full left-0 mt-1 flex min-w-24 flex-col rounded-lg border p-1 shadow-md">
                            {missingLocales.map((locale) => (
                              <button
                                key={locale}
                                type="button"
                                className="btn btn-ghost btn-sm justify-start uppercase"
                                disabled={isSavingLocale}
                                onClick={() => handleAddLocale(locale)}
                              >
                                {locale}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="ml-auto flex flex-wrap gap-2">
                      {editingLocale ? (
                        <>
                          <button
                            type="button"
                            className="btn btn-sm btn-ghost"
                            disabled={isSavingLocale}
                            onClick={handleCancelEditLocale}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            disabled={isSavingLocale || !selectedLocale}
                            onClick={handleSaveLocale}
                          >
                            {isSavingLocale && (
                              <span className="loading loading-spinner loading-sm" />
                            )}
                            Save locale
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="btn btn-sm btn-ghost text-error"
                            disabled={!selectedLocale || isSavingLocale}
                            onClick={() => setDeleteLocaleOpen(true)}
                          >
                            Delete language
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-ghost border"
                            disabled={!selectedLocale || isSavingLocale}
                            onClick={handleStartEditLocale}
                          >
                            Edit
                          </button>
                        </>
                      )}
                    </div>
                  </>
                ) : undefined
              }
            />
          </>
        }
        side={
          <>
            <EventInfoCard
              storedHosts={data.data.hosts}
              clubs={clubs}
              startsAt={data.data.starts_at}
              location={data.data.location}
              durationHours={data.data.duration_hours}
              enrollment={data.data.enrollment}
              links={data.data.links}
              actions={
                canEdit ? (
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost border"
                    disabled={controlsDisabled}
                    onClick={() => setEditInfoOpen(true)}
                  >
                    Edit info
                  </button>
                ) : undefined
              }
            />
            <DraftHostsSection draft={data} canEdit={canEdit} />
            <DraftLinksSection draft={data} canEdit={canEdit} />
            <DraftSubmissionCard
              id={id}
              status={data.status}
              canSubmit={canEdit && data.can_submit}
              cannotSubmitReasons={data.cannot_submit_reasons}
              feedback={data.feedback}
              isSubmitting={isSubmitting}
              onSubmit={() => submitDraft({ params: { path: { id } } })}
              canEdit={canEdit}
            />
          </>
        }
      />

      {canEdit && (
        <EditDraftInfoModal
          open={editInfoOpen}
          onOpenChange={setEditInfoOpen}
          draft={data}
        />
      )}

      <Modal
        open={deleteLocaleOpen}
        onOpenChange={setDeleteLocaleOpen}
        title="Delete language"
      >
        <p className="mb-4 text-sm">
          Delete language{" "}
          <span className="font-medium uppercase">{selectedLocale}</span>?
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setDeleteLocaleOpen(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-error"
            disabled={!selectedLocale || isDeletingLocale}
            onClick={() => {
              if (!selectedLocale) {
                return;
              }
              deleteLocale({
                params: { path: { id, locale: selectedLocale } },
              });
            }}
          >
            {isDeletingLocale && (
              <span className="loading loading-spinner loading-sm" />
            )}
            Delete
          </button>
        </div>
      </Modal>
    </>
  );
}

function DraftSubmissionCard({
  id,
  status,
  canSubmit,
  cannotSubmitReasons,
  feedback,
  isSubmitting,
  onSubmit,
  canEdit,
}: {
  id: string;
  status: DraftStatus | null;
  canSubmit: boolean;
  cannotSubmitReasons: string[];
  feedback?: string | null;
  isSubmitting: boolean;
  onSubmit: () => void;
  canEdit: boolean;
}) {
  if (status === DraftStatus.pending) {
    return (
      <div className="border-base-300 rounded-2xl border p-4 text-sm">
        Draft submitted on review
      </div>
    );
  }

  if (status === DraftStatus.declined) {
    return (
      <div className="border-base-300 rounded-2xl border p-4 text-sm">
        <p className="font-medium">Draft declined</p>
        {feedback?.trim() && (
          <p className="text-base-content/80 mt-2 whitespace-pre-wrap">
            {feedback}
          </p>
        )}
      </div>
    );
  }

  if (status === DraftStatus.published) {
    return (
      <div className="border-base-300 rounded-2xl border p-4 text-sm">
        <p className="mb-2">Draft published</p>
        <Link to="/events/p/$id" params={{ id }} className="link link-primary">
          Open event publication
        </Link>
      </div>
    );
  }

  if (status === DraftStatus.unpublished) {
    return (
      <div className="border-base-300 rounded-2xl border p-4 text-sm">
        Draft removed from publication
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className="border-base-300 rounded-2xl border p-4 text-sm">
        You can view this draft. Accept the host invitation to edit and submit.
      </div>
    );
  }

  return (
    <div className="border-base-300 rounded-2xl border p-4">
      {feedback?.trim() && (
        <div className="mb-3 text-sm">
          <p className="mb-1 font-medium">Moderator feedback</p>
          <p className="text-base-content/80 whitespace-pre-wrap">{feedback}</p>
        </div>
      )}
      {canSubmit ? (
        <p className="mb-3 text-sm">Draft can be submitted for review.</p>
      ) : (
        <div className="mb-3 text-sm">
          <p className="mb-2">Draft cannot be submitted on review:</p>
          <ul className="text-base-content/80 list-disc space-y-1 pl-5">
            {cannotSubmitReasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex justify-end">
        <button
          type="button"
          className={cn(
            "btn btn-sm",
            canSubmit ? "btn-primary" : "btn-ghost border border-dashed",
          )}
          disabled={!canSubmit || isSubmitting}
          onClick={onSubmit}
        >
          {isSubmitting && (
            <span className="loading loading-spinner loading-sm" />
          )}
          Submit
        </button>
      </div>
    </div>
  );
}
