import { $clubs, clubsTypes } from "@/api/clubs";
import { ClubLogo } from "@/components/clubs/ClubLogo.tsx";
import { useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useBlocker, useNavigate } from "@tanstack/react-router";
import { getClubTypeLabel } from "./utils";

export function EditClubPage({ clubSlug }: { clubSlug: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: club, isPending: clubPending } = $clubs.useQuery(
    "get",
    "/clubs/by-slug/{slug}",
    {
      params: { path: { slug: clubSlug } },
    },
  );

  // Form state
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
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

  // Initialize form with club data
  useEffect(() => {
    if (club) {
      setSlug(club.slug);
      setTitle(club.title);
      setShortDescription(club.short_description);
      setDescription(club.description);
      setIsActive(club.is_active);
      setType(club.type);
      setIsSport(!!club.sport_id);
      setSportId(club.sport_id || "");
      setLinks(club.links || []);
    }
  }, [club]);

  useEffect(() => {
    if (clubLeader?.email) {
      setLeaderEmail(clubLeader.email);
    }
  }, [clubLeader]);

  // Initialize initial form state after club data is loaded
  useEffect(() => {
    if (club) {
      initialFormStateRef.current = {
        slug: club.slug,
        title: club.title,
        shortDescription: club.short_description,
        description: club.description,
        isActive: club.is_active,
        type: club.type,
        leaderEmail: clubLeader?.email || leaderEmail || "",
        isSport: !!club.sport_id,
        sportId: club.sport_id || "",
        links: club.links || [],
      };
    }
  }, [club, clubLeader, leaderEmail]);

  // Check if form has unsaved changes
  const hasUnsavedChanges = useCallback(() => {
    if (!initialFormStateRef.current) return false;

    const initial = initialFormStateRef.current;
    const current = {
      slug,
      title,
      shortDescription,
      description,
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
      initial.description !== current.description ||
      initial.isActive !== current.isActive ||
      initial.type !== current.type ||
      initial.leaderEmail !== current.leaderEmail ||
      initial.isSport !== current.isSport ||
      initial.sportId !== current.sportId ||
      JSON.stringify(initial.links) !== JSON.stringify(current.links) ||
      logoFile !== null
    );
  }, [
    slug,
    title,
    shortDescription,
    description,
    isActive,
    type,
    leaderEmail,
    isSport,
    sportId,
    links,
    logoFile,
  ]);

  useBlocker({
    shouldBlockFn: () => {
      if (hasUnsavedChanges()) {
        return !confirm(
          "You have unsaved changes. Are you sure you want to leave?",
        );
      }
      return false;
    },
  });

  const { mutate: updateClub, isPending: isUpdating } = $clubs.useMutation(
    "post",
    "/clubs/by-slug/{slug}",
    {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: $clubs.queryOptions("get", "/clubs/by-slug/{slug}", {
            params: { path: { slug: clubSlug } },
          }).queryKey,
        });
        queryClient.invalidateQueries({
          queryKey: $clubs.queryOptions("get", "/clubs/by-slug/{slug}", {
            params: { path: { slug } },
          }).queryKey,
        });
        queryClient.invalidateQueries({
          queryKey: $clubs.queryOptions("get", "/clubs/").queryKey,
        });
        // Reset initial form state after successful save
        if (club) {
          initialFormStateRef.current = {
            slug,
            title,
            shortDescription,
            description,
            isActive,
            type,
            leaderEmail: clubLeader?.email || leaderEmail || "",
            isSport,
            sportId,
            links,
          };
        }
        // Navigate to new slug if it changed, otherwise stay on current slug
        navigate({ to: "/clubs/$slug", params: { slug } });
      },
      onError: (error) => {
        console.error("Failed to update club:", error);
        alert("Failed to update club. Please try again.");
      },
    },
  );

  const { mutate: uploadLogo, isPending: isUploadingLogo } = $clubs.useMutation(
    "post",
    "/clubs/by-id/{id}/logo",
    {
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
        alert("Logo uploaded successfully!");
      },
      onError: (error) => {
        console.error("Failed to upload logo:", error);
        alert("Failed to upload logo. Please try again.");
      },
    },
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const updateData: clubsTypes.SchemaUpdateClub = {
      ...club,
      slug,
      title,
      short_description: shortDescription,
      description,
      is_active: isActive,
      type,
      sport_id: isSport ? sportId || null : null,
      links: links.length > 0 ? links : undefined,
      // TODO: leader from email
    };

    updateClub({
      params: { path: { slug: clubSlug } },
      body: updateData,
    });
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

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadLogo = () => {
    if (!logoFile || !club) return;

    const formData = new FormData();
    formData.append("logo_file", logoFile);

    uploadLogo({
      params: { path: { id: club.id } },
      body: formData as any,
    });
  };

  if (clubPending) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-inh-inactive text-lg">
          Loading club information...
        </div>
      </div>
    );
  }

  if (!club) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-inh-inactive text-lg">Club not found</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-4">
      {/* Header Section */}
      <div className="card card-border">
        <div className="card-body">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="card-title text-3xl font-bold">Edit Club</h1>
            <Link
              to="/clubs/$slug"
              params={{ slug: clubSlug }}
              className="btn btn-ghost"
            >
              <span className="icon-[mdi--arrow-left] size-5" />
              Back to Club
            </Link>
          </div>
          <p className="text-base-content/80 text-base leading-relaxed">
            Update the club information below
          </p>
          <p className="text-base-content/80 text-base leading-relaxed">
            Club: {club.title}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Logo Upload Section */}
        <div className="card card-border">
          <div className="card-body">
            <h2 className="card-title">
              <span className="icon-[mdi--image] size-6" />
              Club Logo
            </h2>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Current Logo */}
              <div>
                <h3 className="text-base-content mb-3 text-sm font-medium">
                  Current logo
                </h3>
                <div className="flex items-center justify-center">
                  <ClubLogo clubId={club.id} className="size-48" />
                </div>
              </div>

              {/* Upload New Logo */}
              <div>
                <h3 className="text-base-content mb-3 text-sm font-medium">
                  Upload new logo
                </h3>
                <div className="space-y-3">
                  {logoPreview ? (
                    <div className="flex items-center justify-center">
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        className="rounded-field max-h-48 max-w-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="bg-inh-primary border-inh-secondary rounded-field flex items-center justify-center border p-4">
                      <div className="text-inh-inactive flex flex-col items-center gap-2 py-8">
                        <span className="icon-[mdi--image-plus] size-12" />
                        <span className="text-sm">
                          Select a file to preview
                        </span>
                      </div>
                    </div>
                  )}

                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoFileChange}
                    className="text-base-content file:bg-primary hover:file:bg-primary/90 file:rounded-field w-full text-sm file:mr-4 file:border-0 file:px-4 file:py-2 file:text-white"
                  />

                  <button
                    type="button"
                    onClick={handleUploadLogo}
                    disabled={!logoFile || isUploadingLogo}
                    className={clsx(
                      "btn btn-primary w-full",
                      (!logoFile || isUploadingLogo) && "btn-disabled",
                    )}
                  >
                    {isUploadingLogo ? "Uploading..." : "Upload Logo"}
                  </button>

                  {logoFile && (
                    <button
                      type="button"
                      onClick={() => {
                        setLogoFile(null);
                        setLogoPreview(null);
                      }}
                      className="btn btn-ghost btn-sm w-full"
                    >
                      Clear selection
                    </button>
                  )}
                </div>
              </div>
            </div>

            <p className="text-base-content/50 mt-4 text-sm">
              Recommended: Square image, at least 400x400px, PNG, JPG or WEBP
              format
            </p>
          </div>
        </div>

        {/* Basic Information */}
        <div className="card card-border">
          <div className="card-body">
            <h2 className="card-title">Basic information</h2>

            {/* Active Status */}
            <div className="form-control">
              <label className="label cursor-pointer justify-start gap-3">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="checkbox checkbox-primary"
                />
                <span className="label-text text-base-content font-medium">
                  Club is active{" "}
                  <span className="text-xs font-normal">
                    (show in the list of clubs)
                  </span>
                </span>
              </label>
            </div>

            {/* Title */}
            <div className="form-control">
              <label className="label">
                <span className="label-text text-base-content font-medium">
                  Title <span className="text-red-500">*</span>
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

            {/* Slug */}
            <div className="form-control">
              <label className="label">
                <span className="label-text text-base-content font-medium">
                  Slug <span className="text-red-500">*</span>
                </span>
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                required
                className="input input-bordered w-full"
                placeholder="club-slug"
              />
              <label className="label">
                <span className="label-text-alt text-base-content/50">
                  URL-friendly identifier for the club
                </span>
              </label>
            </div>

            {/* Type */}
            <div className="form-control">
              <label className="label">
                <span className="label-text text-base-content font-medium">
                  Type <span className="text-red-500">*</span>
                </span>
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as clubsTypes.ClubType)}
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

            {/* Short Description */}
            <div className="form-control">
              <label className="label">
                <span className="label-text text-base-content font-medium">
                  Short Description <span className="text-red-500">*</span>
                </span>
              </label>
              <textarea
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                required
                rows={3}
                className="textarea textarea-bordered w-full"
                placeholder="Brief description for cards"
              />
            </div>

            {/* Description */}
            <div className="form-control">
              <label className="label">
                <span className="label-text text-base-content font-medium">
                  Full Description
                </span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={8}
                className="textarea textarea-bordered w-full"
                placeholder="Detailed description of the club"
              />
            </div>
          </div>
        </div>

        {/* Leader Information */}
        <div className="card card-border">
          <div className="card-body">
            <h2 className="card-title">
              <span className="icon-[mdi--account] size-6" />
              Club Leader
            </h2>

            {/* Current Leader Info */}
            {clubLeader && (
              <div className="bg-base-200 mb-4 space-y-3 rounded-lg p-4">
                {clubLeader.name && (
                  <div className="flex items-start gap-3">
                    <span className="icon-[mdi--account] text-base-content/50 mt-0.5 size-5" />
                    <div>
                      <div className="text-base-content/50 text-sm">Name</div>
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
                      <div className="text-base-content/50 text-sm">Email</div>
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
                        href={`https://t.me/${clubLeader.telegram_alias}`}
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
                Change Leader
              </button>
            )}

            {/* Set New Leader */}
            {showChangeLeader && (
              <div className="form-control">
                <div className="mb-2 flex items-center justify-between">
                  <label className="label">
                    <span className="label-text text-base-content font-medium">
                      Set New Leader (Innopolis Email)
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
                    Cancel
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
                    Enter Innopolis email to set as new club leader
                  </span>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Sport Information */}
        <div className="card card-border">
          <div className="card-body">
            <h2 className="card-title">
              <span className="icon-[mdi--dumbbell] size-6" />
              Sport Information
            </h2>

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
                  Is InnoSport club
                </span>
              </label>
            </div>

            {/* Sport ID - Only shown if isSport is true */}
            {isSport && (
              <div className="form-control">
                <label className="label">
                  <span className="label-text text-base-content font-medium">
                    Sport ID
                  </span>
                </label>
                <input
                  type="text"
                  value={sportId}
                  onChange={(e) => setSportId(e.target.value)}
                  className="input input-bordered w-full"
                  placeholder="ID from InnoSport system"
                />
                <label className="label">
                  <span className="label-text-alt text-base-content/50">
                    Sport type ID from InnoSport system
                  </span>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Links */}
        <div className="card card-border">
          <div className="card-body">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="card-title">
                <span className="icon-[mdi--link] size-6" />
                Resources & Links
              </h2>
              <button
                type="button"
                onClick={handleAddLink}
                className="btn btn-primary btn-sm"
              >
                <span className="icon-[mdi--plus] size-5" />
                Add Link
              </button>
            </div>

            {links.length === 0 ? (
              <div className="border-base-300 flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8">
                <span className="icon-[mdi--link-variant-off] text-base-content/30 mb-2 size-12" />
                <p className="text-base-content/50 text-sm">
                  No links added yet. Click "Add Link" to add resources.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {links.map((link, index) => (
                  <div
                    key={index}
                    className="border-base-300 bg-base-200 hover:border-primary/50 rounded-lg border p-4 transition-colors"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="icon-[mdi--link] text-primary size-5" />
                        <span className="text-base-content font-semibold">
                          Link {index + 1}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveLink(index)}
                        className="btn btn-ghost btn-sm btn-error"
                        title="Remove link"
                      >
                        <span className="icon-[mdi--delete] size-5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div className="form-control md:col-span-1">
                        <label className="label pb-1">
                          <span className="label-text text-base-content text-xs font-medium tracking-wide uppercase">
                            Type
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
                            Telegram Channel
                          </option>
                          <option value={clubsTypes.LinkType.telegram_chat}>
                            Telegram Chat
                          </option>
                          <option value={clubsTypes.LinkType.telegram_user}>
                            Telegram User
                          </option>
                          <option value={clubsTypes.LinkType.external_url}>
                            External URL
                          </option>
                        </select>
                      </div>

                      <div className="form-control md:col-span-2">
                        <label className="label pb-1">
                          <span className="label-text text-base-content text-xs font-medium tracking-wide uppercase">
                            URL <span className="text-red-500">*</span>
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
                          Label (Optional)
                        </span>
                      </label>
                      <input
                        type="text"
                        value={link.label || ""}
                        onChange={(e) =>
                          handleLinkChange(index, "label", e.target.value)
                        }
                        className="input input-bordered w-full"
                        placeholder="Custom display label"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="card card-border">
          <div className="card-body">
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() =>
                  navigate({ to: "/clubs/$slug", params: { slug: clubSlug } })
                }
                className="btn btn-ghost"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUpdating}
                className={clsx(
                  "btn btn-primary",
                  isUpdating && "btn-disabled",
                )}
              >
                {isUpdating && (
                  <span className="loading loading-spinner loading-sm" />
                )}
                {isUpdating ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
