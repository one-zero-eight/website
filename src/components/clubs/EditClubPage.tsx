import { msg } from "@lingui/core/macro";
import { $clubs, clubsTypes } from "@/api/clubs";
import { Trans, useLingui } from "@lingui/react/macro";
import { getDescriptionImageUrl } from "@/api/clubs/links.ts";
import { usePendingLogoUrl } from "@/api/clubs/use-pending-logo.ts";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import { ClubLogo } from "@/components/clubs/ClubLogo.tsx";
import { Helmet } from "@dr.pogodin/react-helmet";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/ui/cn";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Link, useBlocker, useNavigate } from "@tanstack/react-router";
import { getClubTypeLabel } from "./constants.ts";
import type { TiptapEditorRef } from "@/components/editor/_TiptapDescriptionEditor";
import { DescriptionEditor } from "@/components/editor/DescriptionEditor.tsx";
import { DescriptionViewer } from "@/components/editor/DescriptionViewer.tsx";
import type { EditorImageHandlers } from "@/components/editor/types";
import { Modal } from "@/components/common/Modal.tsx";
import { useToast } from "@/components/toast";
import { canUserEditClub } from "./permissions.ts";

/** Deep-compares two values that are only ever plain JSON. */
function isSameJson(a: unknown, b: unknown) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

/** Club descriptions come back either as a JSON string or as parsed JSON. */
function parseDescription(description: unknown): any {
  if (typeof description !== "string") {
    return description ?? null;
  }
  try {
    return description ? JSON.parse(description) : null;
  } catch {
    return null;
  }
}

export function EditClubPage({ clubSlug }: { clubSlug: string }) {
  const { t } = useLingui();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { showSuccess } = useToast();

  const { data: club, isPending: clubPending } = $clubs.useQuery(
    "get",
    "/clubs/by-slug/{slug}",
    {
      params: { path: { slug: clubSlug } },
    },
  );

  const { data: clubsUser } = $clubs.useQuery("get", "/users/me");
  const canEditClub = canUserEditClub(clubsUser, club?.id);
  const isAdmin = clubsUser?.role === "admin";

  // A leader's own change request, if it is still waiting for approval. The
  // club endpoint already returns it to the leader (it is stripped for
  // everyone else), so there is nothing extra to fetch: the whole form is
  // seeded from it below, letting the leader keep editing the request.
  const pendingUpdate = club?.pending_update ?? null;
  // Logo is the one pending field that isn't a plain form value, so it is
  // read straight from the request instead of form state.
  const pendingLogoFileId =
    pendingUpdate?.logo_file_id != null &&
    pendingUpdate.logo_file_id !== club?.logo_file_id
      ? pendingUpdate.logo_file_id
      : null;
  const { logoUrl: pendingLogoUrl } = usePendingLogoUrl(
    club?.id,
    pendingLogoFileId,
  );

  // Form state
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState<any>(null); // JSON object
  const [isActive, setIsActive] = useState(true);
  const [type, setType] = useState<clubsTypes.ClubType>(
    clubsTypes.ClubType.tech,
  );
  const [leaderEmail, setLeaderEmail] = useState("");
  const [showChangeLeader, setShowChangeLeader] = useState(false);
  const [isSport, setIsSport] = useState(false);
  const [sportId, setSportId] = useState("");
  const [links, setLinks] = useState<clubsTypes.SchemaLinkSchema[]>([]);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  // Leader asked to drop the logo already waiting for approval; applied on save
  // together with the rest of the request.
  const [cancelPendingLogo, setCancelPendingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const editorRef = useRef<TiptapEditorRef | null>(null);

  // Track initial form state to detect changes
  const initialFormStateRef = useRef<{
    slug: string;
    title: string;
    shortDescription: string;
    description: string;
    isActive: boolean;
    type: clubsTypes.ClubType;
    leaderEmail: string;
    isSport: boolean;
    sportId: string;
    links: clubsTypes.SchemaLinkSchema[];
  } | null>(null);

  const { data: clubLeader } = $clubs.useQuery(
    "get",
    "/leaders/by-club-slug/{slug}",
    {
      params: { path: { slug: clubSlug } },
      enabled: !!clubSlug,
    },
  );

  // Initialize form with club data, preferring a leader's in-flight pending
  // draft over the last-approved values so reopening this form doesn't lose it
  useEffect(() => {
    if (club) {
      const pending = club.pending_update;
      const title = pending?.title ?? club.title;
      const shortDescription =
        pending?.short_description ?? club.short_description;
      const description = pending?.description ?? club.description;
      const type = pending?.type ?? club.type;
      const sportId = pending?.sport_id ?? club.sport_id;
      const links = pending?.links ?? club.links;

      setSlug(club.slug);
      setTitle(title);
      setShortDescription(shortDescription);
      setDescription(parseDescription(description));
      setIsActive(club.is_active);
      setType(type);
      setIsSport(!!sportId);
      setSportId(sportId || "");
      setLinks(links || []);
    }
  }, [club]);

  useEffect(() => {
    if (clubLeader?.email) {
      setLeaderEmail(clubLeader.email);
    }
  }, [clubLeader]);

  // Initialize initial form state after club data is loaded (matches the
  // pending-draft-aware seeding above, so dirty-checking isn't tripped by it)
  useEffect(() => {
    if (club) {
      const pending = club.pending_update;
      const description = pending?.description ?? club.description;

      const parsedDescription = parseDescription(description);

      initialFormStateRef.current = {
        slug: club.slug,
        title: pending?.title ?? club.title,
        shortDescription: pending?.short_description ?? club.short_description,
        description: parsedDescription,
        isActive: club.is_active,
        type: pending?.type ?? club.type,
        leaderEmail: clubLeader?.email || leaderEmail || "",
        isSport: !!(pending?.sport_id ?? club.sport_id),
        sportId: (pending?.sport_id ?? club.sport_id) || "",
        links: pending?.links ?? club.links ?? [],
      };
    }
  }, [club, clubLeader, leaderEmail]);

  const publishedDescription = parseDescription(club?.description);

  // The description lives inside the editor, so its "changed" flag is kept in
  // state and refreshed both on seeding and on every keystroke.
  const [isDescriptionChanged, setIsDescriptionChanged] = useState(false);

  useEffect(() => {
    setIsDescriptionChanged(!isSameJson(description, publishedDescription));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [description, club?.description]);

  // Check if form has unsaved changes
  const hasUnsavedChanges = useCallback(() => {
    if (!initialFormStateRef.current) return false;

    const initialDescriptionJSON = initialFormStateRef.current.description;
    const currentDescriptionJSON = editorRef.current?.getJSON() || null;

    const initial = initialFormStateRef.current;
    const current = {
      slug,
      title,
      shortDescription,
      description: currentDescriptionJSON,
      isActive,
      type,
      leaderEmail,
      isSport,
      sportId,
      links,
    };

    return (
      initial.slug !== current.slug ||
      initial.title !== current.title ||
      initial.shortDescription !== current.shortDescription ||
      JSON.stringify(initialDescriptionJSON) !==
        JSON.stringify(currentDescriptionJSON) ||
      initial.isActive !== current.isActive ||
      initial.type !== current.type ||
      initial.leaderEmail !== current.leaderEmail ||
      initial.isSport !== current.isSport ||
      initial.sportId !== current.sportId ||
      JSON.stringify(initial.links) !== JSON.stringify(current.links) ||
      logoFile !== null ||
      cancelPendingLogo
    );
  }, [
    slug,
    title,
    shortDescription,
    isActive,
    type,
    leaderEmail,
    isSport,
    sportId,
    links,
    logoFile,
    cancelPendingLogo,
  ]);

  useBlocker({
    shouldBlockFn: () => {
      if (hasUnsavedChanges()) {
        return !confirm(
          t`You have unsaved changes. Are you sure you want to leave?`,
        );
      }
      return false;
    },
  });

  const { mutateAsync: updateClubAsync, isPending: isUpdating } =
    $clubs.useMutation("post", "/clubs/by-slug/{slug}", {
      onSuccess: () => {
        // Let the destination page refetch after navigation to avoid canceled requests.
        for (const affectedSlug of new Set([clubSlug, slug])) {
          queryClient.invalidateQueries({
            queryKey: $clubs.queryOptions("get", "/clubs/by-slug/{slug}", {
              params: { path: { slug: affectedSlug } },
            }).queryKey,
            refetchType: "none",
          });
        }
        queryClient.invalidateQueries({
          queryKey: $clubs.queryOptions("get", "/clubs/").queryKey,
        });
        // Reset initial form state after successful save
        if (club) {
          const currentDescriptionJSON = editorRef.current?.getJSON() || null;
          setDescription(currentDescriptionJSON); // Sync ref to state
          initialFormStateRef.current = {
            slug,
            title,
            shortDescription,
            description: currentDescriptionJSON,
            isActive,
            type,
            leaderEmail: clubLeader?.email || leaderEmail || "",
            isSport,
            sportId,
            links,
          };
        }
      },
      onError: (error) => {
        console.error("Failed to update club:", error);
        alert(formatApiErrorMessage(error));
      },
    });

  const { mutateAsync: uploadLogoAsync, isPending: isUploadingLogo } =
    $clubs.useMutation("post", "/clubs/by-id/{id}/logo", {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: $clubs.queryOptions("get", "/clubs/by-slug/{slug}", {
            params: { path: { slug: clubSlug } },
          }).queryKey,
        });
        queryClient.invalidateQueries({
          queryKey: $clubs.queryOptions("get", "/clubs/").queryKey,
        });
        setLogoFile(null);
        setLogoPreview(null);
      },
      onError: (error) => {
        console.error("Failed to upload logo:", error);
        alert(formatApiErrorMessage(error));
      },
    });

  const { mutateAsync: uploadDescriptionImage } = $clubs.useMutation(
    "post",
    "/clubs/by-id/{id}/description-images",
  );

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const descriptionImageHandlers = useMemo(():
    | EditorImageHandlers
    | undefined => {
    if (!club?.id) {
      return undefined;
    }

    return {
      resolveImageUrl: getDescriptionImageUrl,
      uploadImage: async (file: File) => {
        const formData = new FormData();
        formData.append("image_file", file);

        const response = await uploadDescriptionImage({
          params: { path: { id: club.id! } },
          body: formData as any,
        });

        return response.image_id;
      },
    };
  }, [club?.id, uploadDescriptionImage]);

  useEffect(() => {
    if (!clubsUser || !club || canEditClub) return;
    navigate({ to: "/clubs" });
  }, [canEditClub, club, clubsUser, navigate]);

  if (!canEditClub) {
    return null;
  }

  const buildUpdateData = (): clubsTypes.SchemaUpdateClub => {
    // Convert to JSON string for API
    const descriptionJSON = editorRef.current?.getJSON() || null;
    const descriptionString = descriptionJSON
      ? JSON.stringify(descriptionJSON)
      : "";
    const { id: _clubId, ...clubUpdateFields } = club ?? {};

    const updateData: clubsTypes.SchemaUpdateClub = {
      ...clubUpdateFields,
      slug,
      title,
      short_description: shortDescription,
      description: descriptionString,
      is_active: isActive,
      type,
      // A leader's save rewrites the whole pending request, so carry the
      // already-submitted logo over instead of resetting it to the approved
      // one. Admin edits apply directly and have no request to preserve.
      logo_file_id:
        isAdmin || cancelPendingLogo
          ? (club?.logo_file_id ?? null)
          : (pendingUpdate?.logo_file_id ?? club?.logo_file_id ?? null),
      sport_id: isSport ? sportId || null : null,
      links: links.length > 0 ? links : undefined,
    };
    if (showChangeLeader && leaderEmail && leaderEmail !== clubLeader?.email) {
      updateData.new_leader_email = leaderEmail;
    }
    return updateData;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Text fields always go first: for a leader this also happens to be what
    // makes the logo upload below safe (see uploadLogoAsync call), since the
    // backend crashes trying to start a pending change from inside the logo
    // endpoint itself. Saving as one action also means we never submit a
    // half-edited field the user hasn't confirmed via "Save Changes" yet.
    try {
      await updateClubAsync({
        params: { path: { slug: clubSlug } },
        body: buildUpdateData(),
      });
    } catch {
      return; // onError already reported it
    }

    if (logoFile && club?.id) {
      const formData = new FormData();
      formData.append("logo_file", logoFile);
      try {
        await uploadLogoAsync({
          params: { path: { id: club.id } },
          body: formData as any,
        });
      } catch {
        return; // onError already reported it
      }
    }

    if (!isAdmin) {
      showSuccess(
        msg`Submitted for review`,
        msg`An admin needs to review your changes before they go live.`,
      );
    }
    // Navigate to new slug if it changed, otherwise stay on current slug
    navigate({ to: "/clubs/$slug", params: { slug }, ignoreBlocker: true });
  };

  const handleAddLink = () => {
    setLinks([
      ...links,
      {
        type: clubsTypes.LinkType.external_url,
        link: "",
        label: null,
      },
    ]);
  };

  const handleRemoveLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index));
  };

  const handleLinkChange = (
    index: number,
    field: keyof clubsTypes.SchemaLinkSchema,
    value: string,
  ) => {
    const newLinks = [...links];
    newLinks[index] = { ...newLinks[index], [field]: value || null };
    setLinks(newLinks);
  };

  // Sections that currently differ from what is published on the club: only
  // these show the "Revert changes" button, so it comes and goes as the user
  // edits the form.
  const changedSections = {
    logo: !!logoFile || (!!pendingLogoFileId && !cancelPendingLogo),
    basicInfo:
      !!club &&
      (slug !== club.slug ||
        title !== club.title ||
        type !== club.type ||
        isActive !== club.is_active ||
        shortDescription !== club.short_description),
    description: isDescriptionChanged,
    leader: leaderEmail !== (clubLeader?.email ?? ""),
    sport:
      !!club &&
      (isSport !== !!club.sport_id || sportId !== (club.sport_id ?? "")),
    links: !!club && !isSameJson(links, club.links ?? []),
  };

  // Sections the club already had changes for when the page opened, i.e. the
  // request waiting for review. These get the "Modified" tag.
  const modifiedSections = {
    logo: !!pendingLogoFileId,
    basicInfo:
      !!club &&
      !!pendingUpdate &&
      ((pendingUpdate.title != null && pendingUpdate.title !== club.title) ||
        (pendingUpdate.short_description != null &&
          pendingUpdate.short_description !== club.short_description) ||
        (pendingUpdate.type != null && pendingUpdate.type !== club.type)),
    description:
      !!club &&
      pendingUpdate?.description != null &&
      pendingUpdate.description !== club.description,
    leader:
      !!club &&
      pendingUpdate?.leader_innohassle_id !== undefined &&
      pendingUpdate.leader_innohassle_id !== club.leader_innohassle_id,
    sport:
      !!club &&
      pendingUpdate?.sport_id !== undefined &&
      pendingUpdate.sport_id !== club.sport_id,
    links:
      !!club &&
      pendingUpdate?.links != null &&
      !isSameJson(pendingUpdate.links, club.links ?? []),
  };

  // Per-section "Revert changes": drops the section back to what is published
  // on the club right now, so it also throws away whatever this section had in
  // the pending request — not just the edits made since the form opened.
  const revertBasicInfo = () => {
    if (!club) return;
    setSlug(club.slug);
    setTitle(club.title);
    setType(club.type);
    setIsActive(club.is_active);
    setShortDescription(club.short_description);
  };

  const revertDescription = () => {
    if (!club) return;
    const published = parseDescription(club.description);
    setDescription(published);
    editorRef.current?.editor?.commands.setContent(published ?? "");
  };

  const revertLeader = () => {
    setShowChangeLeader(false);
    setLeaderEmail(clubLeader?.email || "");
  };

  const revertSport = () => {
    if (!club) return;
    setIsSport(!!club.sport_id);
    setSportId(club.sport_id || "");
  };

  const revertLinks = () => {
    if (!club) return;
    setLinks(club.links ?? []);
  };

  const revertLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    if (logoInputRef.current) {
      logoInputRef.current.value = "";
    }
    setCancelPendingLogo(!!pendingLogoFileId);
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCancelPendingLogo(false);
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  if (clubPending) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-base-content/30 text-lg">
          <Trans>Loading club information...</Trans>
        </div>
      </div>
    );
  }

  if (!club) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-base-content/30 text-lg">
          <Trans>Club not found</Trans>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-4">
      <Helmet>
        <title>{t`Edit ${club.title}`}</title>
        <meta name="description" content={club.short_description} />
      </Helmet>

      {/* Header Section */}
      <div className="space-y-2">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-3xl font-bold">
            <Trans>Edit Club</Trans>
          </h1>
          <Link
            to="/clubs/$slug"
            params={{ slug: clubSlug }}
            className="btn btn-ghost"
          >
            <span className="icon-[mdi--arrow-left] size-5" />
            <Trans>Back to Club</Trans>
          </Link>
        </div>
        <p className="text-base-content/80 text-base leading-relaxed">
          <Trans>Update the club information below</Trans>
        </p>
        <p className="text-base-content/80 text-base leading-relaxed">
          <Trans>Club: {club.title}</Trans>
        </p>
      </div>

      {pendingUpdate && (
        <div className="card card-border border-primary/40 bg-primary/5">
          <div className="card-body flex-row items-start gap-3">
            <span className="icon-[mdi--clock-outline] text-primary mt-0.5 size-5 shrink-0" />
            <div>
              <p className="text-base-content font-medium">
                {isAdmin
                  ? t`This club has changes waiting for review`
                  : t`You have changes waiting for review`}
              </p>
              <p className="text-base-content/70 text-sm">
                {isAdmin
                  ? t`The form below shows the leader's submitted changes. Saving will apply your edits directly to the club.`
                  : t`The form below shows what you submitted, not what is published yet. Keep editing and save again to update the request.`}
              </p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Logo Upload Section */}
        <div className="card card-border">
          <div className="card-body">
            <div className="flex items-center justify-between gap-2">
              <h2 className="card-title">
                <span className="icon-[mdi--image] size-6" />
                <Trans>Club Logo</Trans>
                {modifiedSections.logo && <ModifiedBadge />}
              </h2>
              <RevertSectionButton
                changed={changedSections.logo}
                onRevert={revertLogo}
              />
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Current Logo */}
              <div>
                <h3 className="text-base-content mb-3 text-sm font-medium">
                  <Trans>Current logo</Trans>
                </h3>
                <div className="flex items-center justify-center">
                  <ClubLogo
                    clubId={club.id}
                    logoFileId={club.logo_file_id}
                    className="size-48"
                  />
                </div>
              </div>

              {/* Upload New Logo */}
              <div>
                <h3 className="text-base-content mb-3 text-sm font-medium">
                  <Trans>Upload new logo</Trans>
                </h3>
                <div className="space-y-3">
                  {logoPreview ? (
                    <div className="flex items-center justify-center">
                      <img
                        src={logoPreview}
                        alt={t`Logo preview`}
                        className="rounded-field max-h-48 max-w-full object-contain"
                      />
                    </div>
                  ) : pendingLogoFileId ? (
                    <div className="flex flex-col items-center gap-2">
                      {pendingLogoUrl ? (
                        <img
                          src={pendingLogoUrl}
                          alt={t`Submitted logo`}
                          className="rounded-field max-h-48 max-w-full object-contain"
                        />
                      ) : (
                        <div className="bg-base-200 border-base-300 rounded-field flex w-full items-center justify-center border p-4">
                          <div className="text-base-content/30 flex flex-col items-center gap-2 py-8">
                            <span className="icon-[mdi--image-check] size-12" />
                            <span className="text-sm">
                              <Trans>Preview unavailable</Trans>
                            </span>
                          </div>
                        </div>
                      )}
                      {cancelPendingLogo ? (
                        <>
                          <p className="text-base-content/70 text-sm">
                            <Trans>
                              This logo change will be cancelled when you save.
                            </Trans>
                          </p>
                          <button
                            type="button"
                            onClick={() => setCancelPendingLogo(false)}
                            className="btn btn-ghost btn-sm w-full"
                          >
                            <Trans>Keep submitted logo</Trans>
                          </button>
                        </>
                      ) : (
                        <p className="text-primary/70 text-sm">
                          <Trans>Submitted, waiting for review</Trans>
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="bg-base-200 border-base-300 rounded-field flex items-center justify-center border p-4">
                      <div className="text-base-content/30 flex flex-col items-center gap-2 py-8">
                        <span className="icon-[mdi--image-plus] size-12" />
                        <span className="text-sm">
                          <Trans>Select a file to preview</Trans>
                        </span>
                      </div>
                    </div>
                  )}

                  {/* The native file input is hidden because its "Choose
                      file" / "No file chosen" labels are rendered by the
                      browser in its own UI language. */}
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoFileChange}
                    className="hidden"
                  />
                  <div className="flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      className="btn btn-primary btn-sm"
                    >
                      <Trans>Choose file</Trans>
                    </button>
                    <span className="text-base-content/70 truncate text-sm">
                      {logoFile ? logoFile.name : t`No file selected`}
                    </span>
                  </div>

                  {logoFile && (
                    <>
                      <p className="text-base-content/50 text-sm">
                        <Trans>
                          This will be uploaded when you save changes below.
                        </Trans>
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setLogoFile(null);
                          setLogoPreview(null);
                          if (logoInputRef.current) {
                            logoInputRef.current.value = "";
                          }
                        }}
                        className="btn btn-ghost btn-sm w-full"
                      >
                        <Trans>Clear selection</Trans>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            <p className="text-base-content/50 mt-4 text-sm">
              <Trans>
                Recommended: Square image, at least 400x400px, PNG, JPG or WEBP
                format
              </Trans>
            </p>
          </div>
        </div>

        {/* Basic Information */}
        <div className="card card-border">
          <div className="card-body">
            <div className="flex items-center justify-between gap-2">
              <h2 className="card-title">
                <Trans>Basic information</Trans>
                {modifiedSections.basicInfo && <ModifiedBadge />}
              </h2>
              <RevertSectionButton
                changed={changedSections.basicInfo}
                onRevert={revertBasicInfo}
              />
            </div>

            {/* Active Status (admin-only: leaders' edits to this are dropped by the backend) */}
            {isAdmin && (
              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-3">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="checkbox checkbox-primary"
                  />
                  <span className="label-text text-base-content font-medium">
                    <Trans>
                      Club is active{" "}
                      <span className="text-xs font-normal">
                        (show in the list of clubs)
                      </span>
                    </Trans>
                  </span>
                </label>
              </div>
            )}

            {/* Title, slug and type are admin-only: leaders can't change a
                club's identity, so these fields are not rendered for them. */}
            {isAdmin && (
              <>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text text-base-content font-medium">
                      <Trans>Title</Trans>{" "}
                      <span className="text-red-500">*</span>
                    </span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    className="input input-bordered w-full"
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text text-base-content font-medium">
                      <Trans>Slug</Trans>{" "}
                      <span className="text-red-500">*</span>
                    </span>
                  </label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    required
                    className="input input-bordered w-full"
                    placeholder={t`club-slug`}
                  />
                  <label className="label">
                    <span className="label-text-alt text-base-content/50">
                      <Trans>URL-friendly identifier for the club</Trans>
                    </span>
                  </label>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text text-base-content font-medium">
                      <Trans>Type</Trans>{" "}
                      <span className="text-red-500">*</span>
                    </span>
                  </label>
                  <select
                    value={type}
                    onChange={(e) =>
                      setType(e.target.value as clubsTypes.ClubType)
                    }
                    required
                    className="select select-bordered w-full"
                  >
                    {Object.values(clubsTypes.ClubType).map((clubType) => (
                      <option key={clubType} value={clubType}>
                        {getClubTypeLabel(clubType)}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* Short Description */}
            <div className="form-control">
              <label className="label">
                <span className="label-text text-base-content font-medium">
                  <Trans>Short Description</Trans>{" "}
                  <span className="text-red-500">*</span>
                </span>
              </label>
              <textarea
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                required
                rows={3}
                className="textarea textarea-bordered w-full"
                placeholder={t`Brief description for cards`}
              />
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="card card-border">
          <div className="card-body">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="card-title">
                <span className="icon-[material-symbols--article-outline-rounded] size-6" />
                <Trans>About</Trans>
                {modifiedSections.description && <ModifiedBadge />}
              </h2>
              <div className="flex items-center gap-2">
                <RevertSectionButton
                  changed={changedSections.description}
                  onRevert={revertDescription}
                />
                <button
                  type="button"
                  onClick={() => setShowPreview(true)}
                  className="btn btn-outline btn-primary btn-sm"
                >
                  <span className="icon-[mdi--eye] size-5" />
                  <Trans>Preview</Trans>
                </button>
              </div>
            </div>

            <div className="-mx-6 -mb-6">
              <DescriptionEditor
                ref={editorRef}
                className="px-6 pb-6"
                initialContent={description}
                imageHandlers={descriptionImageHandlers}
                onUpdate={() =>
                  setIsDescriptionChanged(
                    !isSameJson(
                      editorRef.current?.getJSON() ?? null,
                      publishedDescription,
                    ),
                  )
                }
              />
            </div>
          </div>
        </div>

        {/* Leader Information (admin-only: the leader's own page has nothing
            to show or change here) */}
        {isAdmin && (
          <div className="card card-border">
            <div className="card-body">
              <div className="flex items-center justify-between gap-2">
                <h2 className="card-title">
                  <span className="icon-[mdi--account] size-6" />
                  <Trans>Club Leader</Trans>
                  {modifiedSections.leader && <ModifiedBadge />}
                </h2>
                <RevertSectionButton
                  changed={changedSections.leader}
                  onRevert={revertLeader}
                />
              </div>

              {/* Current Leader Info */}
              {clubLeader && (
                <div className="bg-base-200 rounded-field mb-4 space-y-3 p-4">
                  {clubLeader.name && (
                    <div className="flex items-start gap-3">
                      <span className="icon-[mdi--account] text-base-content/50 mt-0.5 size-5" />
                      <div>
                        <div className="text-base-content/50 text-sm">
                          <Trans>Name</Trans>
                        </div>
                        <div className="text-base-content font-medium">
                          {clubLeader.name}
                        </div>
                      </div>
                    </div>
                  )}
                  {clubLeader.email && (
                    <div className="flex items-start gap-3">
                      <span className="icon-[mdi--email] text-base-content/50 mt-0.5 size-5" />
                      <div>
                        <div className="text-base-content/50 text-sm">
                          <Trans>Email</Trans>
                        </div>
                        <div className="text-base-content font-medium">
                          {clubLeader.email}
                        </div>
                      </div>
                    </div>
                  )}
                  {clubLeader.telegram_alias && (
                    <div className="flex items-start gap-3">
                      <span className="icon-[mdi--telegram] text-base-content/50 mt-0.5 size-5" />
                      <div>
                        <div className="text-base-content/50 text-sm">
                          Telegram
                        </div>
                        <a
                          href={`https://telegram.me/${clubLeader.telegram_alias}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="link link-hover link-primary"
                        >
                          @{clubLeader.telegram_alias}
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Change Leader Button */}
              {!showChangeLeader && (
                <button
                  type="button"
                  onClick={() => setShowChangeLeader(true)}
                  className="btn btn-outline btn-primary w-full"
                >
                  <span className="icon-[mdi--account-edit] size-5" />
                  <Trans>Change Leader</Trans>
                </button>
              )}

              {/* Set New Leader */}
              {showChangeLeader && (
                <div className="form-control">
                  <div className="mb-2 flex items-center justify-between">
                    <label className="label">
                      <span className="label-text text-base-content font-medium">
                        <Trans>Set New Leader (Innopolis Email)</Trans>
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setShowChangeLeader(false);
                        setLeaderEmail(clubLeader?.email || "");
                      }}
                      className="btn btn-ghost btn-sm"
                    >
                      <Trans>Cancel</Trans>
                    </button>
                  </div>
                  <input
                    type="email"
                    value={leaderEmail}
                    onChange={(e) => setLeaderEmail(e.target.value)}
                    className="input input-bordered w-full"
                    placeholder="user@innopolis.university"
                  />
                  <label className="label">
                    <span className="label-text-alt text-base-content/50">
                      <Trans>
                        Enter Innopolis email to set as new club leader
                      </Trans>
                    </span>
                  </label>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sport Information (admin-only: leaders can't mark a club as an
            InnoSport club or change its sport id) */}
        {isAdmin && (
          <div className="card card-border">
            <div className="card-body">
              <div className="flex items-center justify-between gap-2">
                <h2 className="card-title">
                  <span className="icon-[mdi--dumbbell] size-6" />
                  <Trans>Sport Information</Trans>
                  {modifiedSections.sport && <ModifiedBadge />}
                </h2>
                <RevertSectionButton
                  changed={changedSections.sport}
                  onRevert={revertSport}
                />
              </div>

              {/* Is Sport Checkbox */}
              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-3">
                  <input
                    type="checkbox"
                    checked={isSport}
                    onChange={(e) => {
                      setIsSport(e.target.checked);
                      if (!e.target.checked) {
                        setSportId("");
                      }
                    }}
                    className="checkbox checkbox-primary"
                  />
                  <span className="label-text text-base-content font-medium">
                    <Trans>Is InnoSport club</Trans>
                  </span>
                </label>
              </div>

              {/* Sport ID - Only shown if isSport is true */}
              {isSport && (
                <div className="form-control">
                  <label className="label">
                    <span className="label-text text-base-content font-medium">
                      <Trans>Sport ID</Trans>
                    </span>
                  </label>
                  <input
                    type="text"
                    value={sportId}
                    onChange={(e) => setSportId(e.target.value)}
                    className="input input-bordered w-full"
                    placeholder={t`ID from InnoSport system`}
                  />
                  <label className="label">
                    <span className="label-text-alt text-base-content/50">
                      <Trans>Sport type ID from InnoSport system</Trans>
                    </span>
                  </label>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Links */}
        <div className="card card-border">
          <div className="card-body">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="card-title">
                <span className="icon-[mdi--link] size-6" />
                <Trans>Resources & Links</Trans>
                {modifiedSections.links && <ModifiedBadge />}
              </h2>
              <div className="flex items-center gap-2">
                <RevertSectionButton
                  changed={changedSections.links}
                  onRevert={revertLinks}
                />
                <button
                  type="button"
                  onClick={handleAddLink}
                  className="btn btn-primary btn-sm"
                >
                  <span className="icon-[mdi--plus] size-5" />
                  <Trans>Add Link</Trans>
                </button>
              </div>
            </div>

            {links.length === 0 ? (
              <div className="border-base-300 rounded-field flex flex-col items-center justify-center border-2 border-dashed p-8">
                <span className="icon-[mdi--link-variant-off] text-base-content/30 mb-2 size-12" />
                <p className="text-base-content/50 text-sm">
                  <Trans>
                    No links added yet. Click "Add Link" to add resources.
                  </Trans>
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {links.map((link, index) => (
                  <div
                    key={index}
                    className="border-base-300 bg-base-200 hover:border-primary/50 rounded-field border p-4 transition-colors"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="icon-[mdi--link] text-primary size-5" />
                        <span className="text-base-content font-semibold">
                          <Trans>Link {index + 1}</Trans>
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveLink(index)}
                        className="btn btn-ghost btn-sm btn-error"
                        title={t`Remove link`}
                      >
                        <span className="icon-[mdi--delete] size-5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div className="form-control md:col-span-1">
                        <label className="label pb-1">
                          <span className="label-text text-base-content text-xs font-medium tracking-wide uppercase">
                            <Trans>Type</Trans>
                          </span>
                        </label>
                        <select
                          value={link.type}
                          onChange={(e) =>
                            handleLinkChange(
                              index,
                              "type",
                              e.target.value as clubsTypes.LinkType,
                            )
                          }
                          className="select select-bordered w-full"
                        >
                          <option value={clubsTypes.LinkType.telegram_channel}>
                            <Trans>Telegram Channel</Trans>
                          </option>
                          <option value={clubsTypes.LinkType.telegram_chat}>
                            <Trans>Telegram Chat</Trans>
                          </option>
                          <option value={clubsTypes.LinkType.telegram_user}>
                            <Trans>Telegram User</Trans>
                          </option>
                          <option value={clubsTypes.LinkType.external_url}>
                            <Trans>External URL</Trans>
                          </option>
                        </select>
                      </div>

                      <div className="form-control md:col-span-2">
                        <label className="label pb-1">
                          <span className="label-text text-base-content text-xs font-medium tracking-wide uppercase">
                            <Trans>
                              URL <span className="text-red-500">*</span>
                            </Trans>
                          </span>
                        </label>
                        <input
                          type="text"
                          value={link.link}
                          onChange={(e) =>
                            handleLinkChange(index, "link", e.target.value)
                          }
                          className="input input-bordered w-full"
                          placeholder="https://..."
                          required
                        />
                      </div>
                    </div>

                    <div className="form-control mt-4">
                      <label className="label pb-1">
                        <span className="label-text text-base-content text-xs font-medium tracking-wide uppercase">
                          <Trans>Label (Optional)</Trans>
                        </span>
                      </label>
                      <input
                        type="text"
                        value={link.label || ""}
                        onChange={(e) =>
                          handleLinkChange(index, "label", e.target.value)
                        }
                        className="input input-bordered w-full"
                        placeholder={t`Custom display label`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() =>
              navigate({ to: "/clubs/$slug", params: { slug: clubSlug } })
            }
            className="btn btn-ghost"
          >
            <Trans>Cancel</Trans>
          </button>
          <button
            type="submit"
            disabled={isUpdating || isUploadingLogo}
            className={cn(
              "btn btn-primary",
              (isUpdating || isUploadingLogo) && "btn-disabled",
            )}
          >
            {(isUpdating || isUploadingLogo) && (
              <span className="loading loading-spinner loading-sm" />
            )}
            {isUpdating
              ? t`Saving...`
              : isUploadingLogo
                ? t`Uploading logo...`
                : t`Save Changes`}
          </button>
        </div>
      </form>

      {/* Preview Dialog */}
      <Modal
        open={showPreview}
        onOpenChange={setShowPreview}
        title={t`Description Preview`}
        containerClassName="bg-base-100 max-w-4xl"
      >
        <div className="max-h-[70vh] overflow-y-auto">
          <DescriptionViewer
            content={editorRef.current?.getJSON() || description}
            imageHandlers={descriptionImageHandlers}
          />
        </div>
      </Modal>
    </div>
  );
}

/** Tag marking a section that already has changes waiting for review. */
function ModifiedBadge() {
  return (
    <span className="badge badge-primary badge-soft">
      <Trans>Modified</Trans>
    </span>
  );
}

/** Undo control shown in a section header while it differs from the club. */
function RevertSectionButton({
  changed,
  onRevert,
}: {
  changed: boolean;
  onRevert: () => void;
}) {
  const { t } = useLingui();
  if (!changed) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={onRevert}
      className="btn btn-ghost btn-sm shrink-0"
      title={t`Revert this section to the published values`}
    >
      <span className="icon-[mdi--undo] size-4" />
      <Trans>Revert changes</Trans>
    </button>
  );
}
