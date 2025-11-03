import { $clubs, clubsTypes } from "@/api/clubs";
import { useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { getClubTypeLabel } from "./utils";

export function EditClubPage({ clubId }: { clubId: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: club, isPending: clubPending } = $clubs.useQuery(
    "get",
    "/clubs/{id}",
    {
      params: { path: { id: clubId } },
    },
  );

  // Form state
  const [title, setTitle] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [type, setType] = useState<clubsTypes.ClubType>(
    clubsTypes.ClubType.tech,
  );
  const [leaderInnohassleId, setLeaderInnohassleId] = useState("");
  const [sportId, setSportId] = useState("");
  const [links, setLinks] = useState<clubsTypes.SchemaLinkSchema[]>([]);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Initialize form with club data
  useEffect(() => {
    if (club) {
      setTitle(club.title);
      setShortDescription(club.short_description);
      setDescription(club.description);
      setIsActive(club.is_active);
      setType(club.type);
      setLeaderInnohassleId(club.leader_innohassle_id || "");
      setSportId(club.sport_id || "");
      setLinks(club.links || []);
    }
  }, [club]);

  const { mutate: updateClub, isPending: isUpdating } = $clubs.useMutation(
    "post",
    "/clubs/{id}",
    {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: $clubs.queryOptions("get", "/clubs/{id}", {
            params: { path: { id: clubId } },
          }).queryKey,
        });
        queryClient.invalidateQueries({
          queryKey: $clubs.queryOptions("get", "/clubs/").queryKey,
        });
        navigate({ to: "/clubs/$id", params: { id: clubId } });
      },
      onError: (error) => {
        console.error("Failed to update club:", error);
        alert("Failed to update club. Please try again.");
      },
    },
  );

  const { mutate: uploadLogo, isPending: isUploadingLogo } = $clubs.useMutation(
    "post",
    "/clubs/{id}/logo",
    {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: $clubs.queryOptions("get", "/clubs/{id}", {
            params: { path: { id: clubId } },
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
      title,
      short_description: shortDescription,
      description,
      is_active: isActive,
      type,
      leader_innohassle_id: leaderInnohassleId || null,
      sport_id: sportId || null,
      links: links.length > 0 ? links : undefined,
    };

    updateClub({
      params: { path: { id: clubId } },
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
    if (!logoFile) return;

    const formData = new FormData();
    formData.append("logo_file", logoFile);

    uploadLogo({
      params: { path: { id: clubId } },
      body: formData as any,
    });
  };

  const getLogoUrl = () => {
    if (club?.logo_file_id) {
      return `${import.meta.env.VITE_CLUBS_API_URL}/clubs/${clubId}/logo`;
    }
    return null;
  };

  if (clubPending) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-inactive text-lg">Loading club information...</div>
      </div>
    );
  }

  if (!club) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-inactive text-lg">Club not found</div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <div className="bg-floating border-secondary mb-6 rounded-lg border p-6">
        <h1 className="text-contrast mb-2 text-2xl font-bold">Edit Club</h1>
        <p className="text-inactive text-sm">
          Update the club information below
        </p>
      </div>

      {/* Logo Upload Section */}
      <div className="bg-floating border-secondary mb-6 rounded-lg border p-6">
        <h2 className="text-contrast mb-4 text-xl font-semibold">Club Logo</h2>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Current Logo */}
          <div>
            <h3 className="text-contrast mb-3 text-sm font-medium">
              Current Logo
            </h3>
            <div className="bg-primary border-secondary flex items-center justify-center rounded-lg border p-4">
              {getLogoUrl() ? (
                <img
                  src={getLogoUrl()!}
                  alt="Current club logo"
                  className="max-h-48 max-w-full rounded-lg object-contain"
                />
              ) : (
                <div className="text-inactive flex flex-col items-center gap-2 py-8">
                  <span className="icon-[mdi--image-off] size-12" />
                  <span className="text-sm">No logo uploaded</span>
                </div>
              )}
            </div>
          </div>

          {/* Upload New Logo */}
          <div>
            <h3 className="text-contrast mb-3 text-sm font-medium">
              Upload New Logo
            </h3>
            <div className="space-y-3">
              {logoPreview ? (
                <div className="bg-primary border-secondary flex items-center justify-center rounded-lg border p-4">
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="max-h-48 max-w-full rounded-lg object-contain"
                  />
                </div>
              ) : (
                <div className="bg-primary border-secondary flex items-center justify-center rounded-lg border p-4">
                  <div className="text-inactive flex flex-col items-center gap-2 py-8">
                    <span className="icon-[mdi--image-plus] size-12" />
                    <span className="text-sm">Select a file to preview</span>
                  </div>
                </div>
              )}

              <input
                type="file"
                accept="image/*"
                onChange={handleLogoFileChange}
                className="text-contrast file:bg-brand-violet hover:file:bg-brand-violet/90 w-full text-sm file:mr-4 file:rounded-lg file:border-0 file:px-4 file:py-2 file:text-white"
              />

              <button
                type="button"
                onClick={handleUploadLogo}
                disabled={!logoFile || isUploadingLogo}
                className={clsx(
                  "w-full rounded-lg px-4 py-2 text-white transition-colors",
                  !logoFile || isUploadingLogo
                    ? "cursor-not-allowed bg-gray-400"
                    : "bg-brand-violet hover:bg-brand-violet/90",
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
                  className="text-inactive hover:text-contrast w-full text-sm transition-colors"
                >
                  Clear selection
                </button>
              )}
            </div>
          </div>
        </div>

        <p className="text-inactive mt-4 text-sm">
          Recommended: Square image, at least 400x400px, PNG or JPG format
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-floating border-secondary rounded-lg border p-6">
          <h2 className="text-contrast mb-4 text-xl font-semibold">
            Basic Information
          </h2>

          {/* Active Status */}
          <div className="mb-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="size-4 rounded border-gray-300"
              />
              <span className="text-contrast font-medium">Club is active</span>
            </label>
          </div>

          {/* Title */}
          <div className="mb-4">
            <label className="text-contrast mb-2 block font-medium">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="bg-primary border-secondary text-contrast focus:border-brand-violet focus:ring-brand-violet w-full rounded-lg border px-4 py-2 focus:ring-1 focus:outline-none"
            />
          </div>

          {/* Type */}
          <div className="mb-4">
            <label className="text-contrast mb-2 block font-medium">
              Type <span className="text-red-500">*</span>
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as clubsTypes.ClubType)}
              required
              className="bg-primary border-secondary text-contrast focus:border-brand-violet focus:ring-brand-violet w-full rounded-lg border px-4 py-2 focus:ring-1 focus:outline-none"
            >
              {Object.values(clubsTypes.ClubType).map((clubType) => (
                <option key={clubType} value={clubType}>
                  {getClubTypeLabel(clubType)}
                </option>
              ))}
            </select>
          </div>

          {/* Short Description */}
          <div className="mb-4">
            <label className="text-contrast mb-2 block font-medium">
              Short Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              required
              rows={2}
              className="bg-primary border-secondary text-contrast focus:border-brand-violet focus:ring-brand-violet w-full rounded-lg border px-4 py-2 focus:ring-1 focus:outline-none"
              placeholder="Brief description for cards"
            />
          </div>

          {/* Description */}
          <div className="mb-4">
            <label className="text-contrast mb-2 block font-medium">
              Full Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={8}
              className="bg-primary border-secondary text-contrast focus:border-brand-violet focus:ring-brand-violet w-full rounded-lg border px-4 py-2 focus:ring-1 focus:outline-none"
              placeholder="Detailed description of the club"
            />
          </div>
        </div>

        {/* Additional Information */}
        <div className="bg-floating border-secondary rounded-lg border p-6">
          <h2 className="text-contrast mb-4 text-xl font-semibold">
            Additional Information
          </h2>

          {/* Leader InnoHassle ID */}
          <div className="mb-4">
            <label className="text-contrast mb-2 block font-medium">
              Leader InnoHassle ID
            </label>
            <input
              type="text"
              value={leaderInnohassleId}
              onChange={(e) => setLeaderInnohassleId(e.target.value)}
              className="bg-primary border-secondary text-contrast focus:border-brand-violet focus:ring-brand-violet w-full rounded-lg border px-4 py-2 focus:ring-1 focus:outline-none"
              placeholder="Optional"
            />
          </div>

          {/* Sport ID */}
          <div className="mb-4">
            <label className="text-contrast mb-2 block font-medium">
              Sport ID
            </label>
            <input
              type="text"
              value={sportId}
              onChange={(e) => setSportId(e.target.value)}
              className="bg-primary border-secondary text-contrast focus:border-brand-violet focus:ring-brand-violet w-full rounded-lg border px-4 py-2 focus:ring-1 focus:outline-none"
              placeholder="Only for sport clubs"
            />
            <p className="text-inactive mt-1 text-sm">
              ID from InnoSport system (only for sport clubs)
            </p>
          </div>
        </div>

        {/* Links */}
        <div className="bg-floating border-secondary rounded-lg border p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-contrast text-xl font-semibold">
              Resources & Links
            </h2>
            <button
              type="button"
              onClick={handleAddLink}
              className="bg-brand-violet hover:bg-brand-violet/90 flex items-center gap-2 rounded-lg px-4 py-2 text-white transition-colors"
            >
              <span className="icon-[mdi--plus] size-5" />
              Add Link
            </button>
          </div>

          {links.length === 0 ? (
            <p className="text-inactive text-sm">
              No links added yet. Click "Add Link" to add resources.
            </p>
          ) : (
            <div className="space-y-4">
              {links.map((link, index) => (
                <div
                  key={index}
                  className="bg-primary border-secondary rounded-lg border p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-contrast font-medium">
                      Link {index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveLink(index)}
                      className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    >
                      <span className="icon-[mdi--delete] size-5" />
                    </button>
                  </div>

                  <div className="mb-3">
                    <label className="text-contrast mb-1 block text-sm font-medium">
                      Link Type
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
                      className="bg-primary border-secondary text-contrast focus:border-brand-violet focus:ring-brand-violet w-full rounded-lg border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
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

                  <div className="mb-3">
                    <label className="text-contrast mb-1 block text-sm font-medium">
                      URL
                    </label>
                    <input
                      type="text"
                      value={link.link}
                      onChange={(e) =>
                        handleLinkChange(index, "link", e.target.value)
                      }
                      className="bg-primary border-secondary text-contrast focus:border-brand-violet focus:ring-brand-violet w-full rounded-lg border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
                      placeholder="https://..."
                    />
                  </div>

                  <div>
                    <label className="text-contrast mb-1 block text-sm font-medium">
                      Label (Optional)
                    </label>
                    <input
                      type="text"
                      value={link.label || ""}
                      onChange={(e) =>
                        handleLinkChange(index, "label", e.target.value)
                      }
                      className="bg-primary border-secondary text-contrast focus:border-brand-violet focus:ring-brand-violet w-full rounded-lg border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
                      placeholder="Optional custom label"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="bg-floating border-secondary rounded-lg border p-6">
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() =>
                navigate({ to: "/clubs/$id", params: { id: clubId } })
              }
              className="border-secondary text-contrast hover:bg-primary rounded-lg border px-6 py-2 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUpdating}
              className={clsx(
                "bg-brand-violet rounded-lg px-6 py-2 text-white transition-colors",
                isUpdating
                  ? "cursor-not-allowed opacity-50"
                  : "hover:bg-brand-violet/90",
              )}
            >
              {isUpdating ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
