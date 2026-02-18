import { $clubs, clubsTypes } from "@/api/clubs";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState, useRef } from "react";
import {
  FloatingFocusManager,
  FloatingOverlay,
  FloatingPortal,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
  useTransitionStyles,
} from "@floating-ui/react";
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

  const { context, refs } = useFloating({ open, onOpenChange });

  // Transition effect
  const { isMounted, styles: transitionStyles } = useTransitionStyles(context);

  // Event listeners to change the open state
  const dismiss = useDismiss(context, {
    outsidePressEvent: "mousedown",
    enabled: !isPending,
  });
  // Role props for screen readers
  const role = useRole(context);

  const { getFloatingProps } = useInteractions([dismiss, role]);

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

  if (!isMounted) {
    return null;
  }

  return (
    <FloatingPortal>
      <FloatingOverlay
        className="@container/modal z-10 grid place-items-center bg-black/75"
        lockScroll
        onClick={(e) => e.stopPropagation()}
      >
        <FloatingFocusManager
          context={context}
          initialFocus={titleInputRef}
          modal
        >
          <div
            ref={refs.setFloating}
            style={transitionStyles}
            {...getFloatingProps()}
            className="flex w-full p-4 @sm/modal:w-auto"
          >
            <div className="bg-base-200 rounded-box h-fit w-full overflow-hidden @sm/modal:min-w-[500px]">
              <div className="flex flex-col p-6">
                <div className="mb-2 flex w-full flex-row">
                  <div className="grow items-center text-2xl font-semibold">
                    Add New Club
                  </div>
                  <button
                    type="button"
                    className="text-base-content/50 hover:bg-base-300/50 hover:text-base-content/75 rounded-box -mt-2 -mr-2 flex h-12 w-12 items-center justify-center"
                    onClick={handleClose}
                    disabled={isPending}
                  >
                    <span className="icon-[material-symbols--close] text-4xl" />
                  </button>
                </div>

                <form
                  onSubmit={handleSubmit}
                  className="mt-4 flex flex-col gap-4"
                >
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
              </div>
            </div>
          </div>
        </FloatingFocusManager>
      </FloatingOverlay>
    </FloatingPortal>
  );
}
