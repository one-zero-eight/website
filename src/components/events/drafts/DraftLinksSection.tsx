import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import { $workshops } from "@/api/workshops";
import { SchemaDraftOut, SchemaEventLink } from "@/api/workshops/types";
import { Modal } from "@/components/common/Modal.tsx";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/ui/cn";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { eventFieldClass } from "../shared/formStyles";
import { getLinkDisplayLabel } from "../utils/links";

export function DraftLinksSection({
  draft,
  canEdit,
}: {
  draft: SchemaDraftOut;
  canEdit: boolean;
}) {
  const { showError } = useToast();
  const queryClient = useQueryClient();
  const links = useMemo(() => draft.data.links ?? [], [draft.data.links]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editLink, setEditLink] = useState<SchemaEventLink | null>(null);
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  function invalidateDraft(next?: SchemaDraftOut) {
    if (next) {
      queryClient.setQueryData(
        $workshops.queryOptions("get", "/drafts/{id}", {
          params: { path: { id: draft.id } },
        }).queryKey,
        next,
      );
    }
    queryClient.invalidateQueries({
      queryKey: $workshops.queryOptions("get", "/drafts/{id}", {
        params: { path: { id: draft.id } },
      }).queryKey,
    });
    queryClient.invalidateQueries({
      queryKey: $workshops.queryOptions("get", "/drafts/").queryKey,
    });
  }

  const onError = (error: unknown) => {
    showError("Error", formatApiErrorMessage(error));
  };

  const { mutate: addLink, isPending: isAdding } = $workshops.useMutation(
    "post",
    "/drafts/{id}/links",
    {
      onSuccess: (next) => {
        setModalOpen(false);
        setUrl("");
        setName("");
        invalidateDraft(next);
      },
      onError,
    },
  );

  const { mutate: patchLink, isPending: isPatching } = $workshops.useMutation(
    "patch",
    "/drafts/{id}/links/{link_id}",
    {
      onSuccess: (next) => {
        setEditLink(null);
        setModalOpen(false);
        setUrl("");
        setName("");
        invalidateDraft(next);
      },
      onError,
    },
  );

  const { mutate: deleteLink, isPending: isDeleting } = $workshops.useMutation(
    "delete",
    "/drafts/{id}/links/{link_id}",
    {
      onSuccess: invalidateDraft,
      onError,
    },
  );

  const { mutate: orderLinks, isPending: isOrdering } = $workshops.useMutation(
    "put",
    "/drafts/{id}/links/order",
    {
      onSuccess: invalidateDraft,
      onError,
    },
  );

  const busy = isAdding || isPatching || isDeleting || isOrdering;

  function handleReorder(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) {
      return;
    }
    if (fromIndex >= links.length || toIndex >= links.length) {
      return;
    }

    const reordered = [...links];
    const [item] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, item);
    orderLinks({
      params: { path: { id: draft.id } },
      body: { link_ids: reordered.map((link) => link.id) },
    });
  }

  function handleOpenAdd() {
    setEditLink(null);
    setUrl("");
    setName("");
    setModalOpen(true);
  }

  function handleOpenEdit(link: SchemaEventLink) {
    setEditLink(link);
    setUrl(link.url);
    setName(link.name ?? "");
    setModalOpen(true);
  }

  function handleSave() {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      showError("Invalid link", "URL is required.");
      return;
    }

    if (editLink) {
      patchLink({
        params: { path: { id: draft.id, link_id: editLink.id } },
        body: { url: trimmedUrl, name: name.trim() || null },
      });
      return;
    }

    addLink({
      params: { path: { id: draft.id } },
      body: { url: trimmedUrl, name: name.trim() || null },
    });
  }

  return (
    <div className="border-base-300 rounded-2xl border p-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="flex min-w-0 grow items-center gap-2 text-left"
          onClick={() => setExpanded((value) => !value)}
        >
          <span
            className={cn(
              "icon-[material-symbols--expand-more] text-base-content/70 shrink-0 text-xl transition-transform",
              !expanded && "-rotate-90",
            )}
          />
          <h3 className="font-medium">Links</h3>
          {!expanded && (
            <span className="text-base-content/50 text-sm">{links.length}</span>
          )}
        </button>
        {canEdit && expanded && (
          <button
            type="button"
            className="btn btn-ghost btn-sm border"
            disabled={busy}
            onClick={handleOpenAdd}
          >
            Add link
          </button>
        )}
      </div>

      {expanded &&
        (links.length === 0 ? (
          <p className="text-base-content/70 mt-3 text-sm">No links yet.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {links.map((link, index) => (
              <li
                key={link.id}
                className={cn(
                  "border-base-300 flex items-center gap-2 rounded-xl border px-3 py-2 text-sm",
                  dropIndex === index &&
                    dragIndex !== null &&
                    dragIndex !== index
                    ? "border-primary"
                    : null,
                  dragIndex === index ? "opacity-50" : null,
                )}
                onDragOver={(e) => {
                  if (!canEdit || busy || dragIndex === null) {
                    return;
                  }
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  if (dropIndex !== index) {
                    setDropIndex(index);
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragIndex === null) {
                    return;
                  }
                  handleReorder(dragIndex, index);
                  setDragIndex(null);
                  setDropIndex(null);
                }}
                onDragLeave={() => {
                  if (dropIndex === index) {
                    setDropIndex(null);
                  }
                }}
              >
                {canEdit && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-square btn-xs text-base-content/50 h-7 min-h-7 w-5 cursor-grab px-0 active:cursor-grabbing"
                    disabled={busy}
                    draggable
                    onDragStart={(e) => {
                      setDragIndex(index);
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", link.id);
                    }}
                    onDragEnd={() => {
                      setDragIndex(null);
                      setDropIndex(null);
                    }}
                  >
                    <span className="icon-[material-symbols--drag-indicator] text-lg" />
                  </button>
                )}
                <div className="min-w-0 grow">
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="wrap-anywhere underline underline-offset-2"
                  >
                    {getLinkDisplayLabel(link)}
                  </a>
                </div>
                {canEdit && (
                  <div className="flex shrink-0 items-center gap-0.5">
                    <button
                      type="button"
                      className="btn btn-ghost btn-square btn-xs"
                      disabled={busy}
                      onClick={() => handleOpenEdit(link)}
                    >
                      <span className="icon-[material-symbols--edit-outline] text-base" />
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-square btn-xs text-error"
                      disabled={busy}
                      onClick={() =>
                        deleteLink({
                          params: {
                            path: { id: draft.id, link_id: link.id },
                          },
                        })
                      }
                    >
                      <span className="icon-[material-symbols--delete-outline] text-base" />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ))}

      <Modal
        open={modalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setModalOpen(false);
            setEditLink(null);
          }
        }}
        title={editLink ? "Edit link" : "Add link"}
      >
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span>URL</span>
            <input
              type="url"
              className={eventFieldClass()}
              placeholder="https://"
              value={url}
              disabled={isAdding || isPatching}
              onChange={(e) => setUrl(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>Name (optional)</span>
            <input
              type="text"
              className={eventFieldClass()}
              value={name}
              disabled={isAdding || isPatching}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setModalOpen(false);
                setEditLink(null);
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={isAdding || isPatching}
              onClick={handleSave}
            >
              {(isAdding || isPatching) && (
                <span className="loading loading-spinner loading-sm" />
              )}
              Save
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
