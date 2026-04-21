import { $clubs, clubsTypes } from "@/api/clubs";
import { Modal } from "@/components/common/Modal.tsx";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { transliterate } from "transliteration";

export function AddClubDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState<string | null>(null);

  const titleInputRef = useRef<HTMLInputElement>(null);

  const handleClose = () => {
    setTitle("");
    setSlug("");
    setError(null);
    onOpenChange(false);
  };

  const { mutate, isPending } = $clubs.useMutation("post", "/clubs/", {
    onSuccess: (createdClub) => {
      queryClient.invalidateQueries({
        queryKey: $clubs.queryOptions("get", "/clubs/").queryKey,
      });
      handleClose();
      if (createdClub) {
        navigate({
          to: "/clubs/$slug/edit",
          params: { slug: createdClub.slug },
        });
      }
    },
    onError: () => {
      setError("Failed to create club");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !slug.trim()) {
      setError("Title and Slug are required");
      return;
    }

    mutate({
      body: {
        title: title.trim(),
        slug: slug.trim(),
        short_description: "",
        description: "",
        type: clubsTypes.ClubType.tech,
        is_active: true,
      },
    });
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Add New Club"
      closeOnOutsidePress={!isPending}
    >
      <form onSubmit={handleSubmit} className="mt-2 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label
            htmlFor="club-title"
            className="text-base-content text-sm font-semibold"
          >
            Title <span className="text-error">*</span>
          </label>
          <input
            ref={titleInputRef}
            id="club-title"
            type="text"
            placeholder="Enter club title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setSlug(
                transliterate(e.target.value)
                  .toLowerCase()
                  .replace(/\s+/g, "-")
                  .replace(/[^a-z0-9-]/g, "")
                  .replace(/-+/g, "-")
                  .replace(/^-|-$/g, ""),
              );
            }}
            className="input input-bordered w-full"
            disabled={isPending}
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="club-slug"
            className="text-base-content text-sm font-semibold"
          >
            Slug <span className="text-error">*</span>
          </label>
          <input
            id="club-slug"
            type="text"
            placeholder="club-url-slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="input input-bordered w-full"
            disabled={isPending}
            required
          />
          <p className="text-base-content/50 text-xs">
            URL-friendly identifier (e.g., "robotics-club")
          </p>
        </div>

        {error && (
          <div className="alert alert-error">
            <span className="icon-[mdi--alert-circle] size-5" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-2 flex justify-end gap-2">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={handleClose}
            disabled={isPending}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isPending}
          >
            {isPending ? (
              <>
                <span className="loading loading-spinner loading-sm" />
                <span>Creating...</span>
              </>
            ) : (
              <>
                <span className="icon-[mdi--plus] size-5" />
                <span>Create</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
