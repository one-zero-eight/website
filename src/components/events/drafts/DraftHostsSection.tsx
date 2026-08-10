import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import { $clubs } from "@/api/clubs";
import { $workshops } from "@/api/workshops";
import { HostType, SchemaDraftOut, SchemaHost } from "@/api/workshops/types";
import { Modal } from "@/components/common/Modal.tsx";
import { useToast } from "@/components/toast";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useEventsAuth } from "../hooks";
import { StoredHostLink } from "../shared/HostLink";

export function DraftHostsSection({
  draft,
  canEdit,
}: {
  draft: SchemaDraftOut;
  canEdit: boolean;
}) {
  const { showError } = useToast();
  const queryClient = useQueryClient();
  const { clubs, isClubLeader, isEventManager } = useEventsAuth();
  const hosts = useMemo(() => draft.data.hosts ?? [], [draft.data.hosts]);
  const invitations = draft.invitations ?? [];

  const [inviteClubId, setInviteClubId] = useState("");
  const [addClubId, setAddClubId] = useState("");
  const [externalOpen, setExternalOpen] = useState(false);
  const [editHost, setEditHost] = useState<SchemaHost | null>(null);
  const [externalName, setExternalName] = useState("");
  const [externalUrl, setExternalUrl] = useState("");

  const { data: allClubs = [] } = $clubs.useQuery("get", "/clubs/");

  const clubTitleById = useMemo(() => {
    const map = new Map<string, string>();
    for (const club of clubs) {
      map.set(club.club_id, club.title);
    }
    for (const club of allClubs) {
      if (club.id) {
        map.set(club.id, club.title);
      }
    }
    return map;
  }, [allClubs, clubs]);

  const hostedClubIds = useMemo(
    () =>
      new Set(
        hosts
          .filter((host) => host.type === HostType.club && host.club_id)
          .map((host) => host.club_id as string),
      ),
    [hosts],
  );

  const ownClubsToAdd = clubs.filter(
    (club) => !hostedClubIds.has(club.club_id),
  );

  useEffect(() => {
    if (
      ownClubsToAdd.length > 0 &&
      !ownClubsToAdd.some((club) => club.club_id === addClubId)
    ) {
      setAddClubId(ownClubsToAdd[0].club_id);
    }
  }, [ownClubsToAdd, addClubId]);

  const inviteableClubs = allClubs.filter((club) => {
    if (!club.id) {
      return false;
    }
    if (hostedClubIds.has(club.id) || invitations.includes(club.id)) {
      return false;
    }
    if (clubs.some((owned) => owned.club_id === club.id)) {
      return false;
    }
    return true;
  });

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

  const { mutate: addClubHost, isPending: isAddingClub } =
    $workshops.useMutation("post", "/drafts/{id}/hosts/clubs", {
      onSuccess: invalidateDraft,
      onError,
    });

  const { mutate: inviteClub, isPending: isInviting } = $workshops.useMutation(
    "post",
    "/drafts/{id}/hosts/invitations",
    {
      onSuccess: (next) => {
        setInviteClubId("");
        invalidateDraft(next);
      },
      onError,
    },
  );

  const { mutate: addExternal, isPending: isAddingExternal } =
    $workshops.useMutation("post", "/drafts/{id}/hosts/external", {
      onSuccess: (next) => {
        setExternalOpen(false);
        setExternalName("");
        setExternalUrl("");
        invalidateDraft(next);
      },
      onError,
    });

  const { mutate: patchExternal, isPending: isPatchingExternal } =
    $workshops.useMutation("patch", "/drafts/{id}/hosts/external/{host_id}", {
      onSuccess: (next) => {
        setEditHost(null);
        setExternalName("");
        setExternalUrl("");
        invalidateDraft(next);
      },
      onError,
    });

  const { mutate: deleteHost, isPending: isDeletingHost } =
    $workshops.useMutation("delete", "/drafts/{id}/hosts/{host_id}", {
      onSuccess: invalidateDraft,
      onError,
    });

  const { mutate: deleteInvitation, isPending: isDeletingInvitation } =
    $workshops.useMutation(
      "delete",
      "/drafts/{id}/hosts/invitations/{club_id}",
      {
        onSuccess: invalidateDraft,
        onError,
      },
    );

  const { mutate: orderHosts, isPending: isOrdering } = $workshops.useMutation(
    "put",
    "/drafts/{id}/hosts/order",
    {
      onSuccess: invalidateDraft,
      onError,
    },
  );

  const busy =
    isAddingClub ||
    isInviting ||
    isAddingExternal ||
    isPatchingExternal ||
    isDeletingHost ||
    isDeletingInvitation ||
    isOrdering;

  function handleMove(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= hosts.length) {
      return;
    }

    const reordered = [...hosts];
    const [item] = reordered.splice(index, 1);
    reordered.splice(nextIndex, 0, item);
    orderHosts({
      params: { path: { id: draft.id } },
      body: { host_ids: reordered.map((host) => host.id) },
    });
  }

  function handleOpenEditExternal(host: SchemaHost) {
    setEditHost(host);
    setExternalName(host.name ?? "");
    setExternalUrl(host.url ?? "");
  }

  function handleSaveExternal() {
    const name = externalName.trim();
    if (!name) {
      showError("Invalid host", "External host name is required.");
      return;
    }

    if (editHost) {
      patchExternal({
        params: { path: { id: draft.id, host_id: editHost.id } },
        body: { name, url: externalUrl.trim() || null },
      });
      return;
    }

    addExternal({
      params: { path: { id: draft.id } },
      body: { name, url: externalUrl.trim() || null },
    });
  }

  return (
    <div className="border-base-300 rounded-2xl border p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="font-medium">Hosts</h3>
      </div>

      {hosts.length === 0 ? (
        <p className="text-base-content/70 mb-3 text-sm">No hosts yet.</p>
      ) : (
        <ul className="mb-3 flex flex-col gap-2">
          {hosts.map((host, index) => (
            <li
              key={host.id}
              className="border-base-300 flex items-center gap-2 rounded-xl border px-3 py-2 text-sm"
            >
              <div className="min-w-0 grow">
                <StoredHostLink host={host} clubs={clubs} />
                <p className="text-base-content/50 text-xs capitalize">
                  {host.type}
                </p>
              </div>
              {canEdit && (
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    disabled={busy || index === 0}
                    onClick={() => handleMove(index, -1)}
                  >
                    <span className="icon-[material-symbols--arrow-upward]" />
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    disabled={busy || index === hosts.length - 1}
                    onClick={() => handleMove(index, 1)}
                  >
                    <span className="icon-[material-symbols--arrow-downward]" />
                  </button>
                  {host.type === HostType.external && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      disabled={busy}
                      onClick={() => handleOpenEditExternal(host)}
                    >
                      Edit
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs text-error"
                    disabled={busy}
                    onClick={() =>
                      deleteHost({
                        params: { path: { id: draft.id, host_id: host.id } },
                      })
                    }
                  >
                    Remove
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {invitations.length > 0 && (
        <div className="mb-3">
          <p className="mb-2 text-sm font-medium">Pending invitations</p>
          <ul className="flex flex-col gap-2">
            {invitations.map((clubId) => (
              <li
                key={clubId}
                className="border-base-300 flex items-center gap-2 rounded-xl border px-3 py-2 text-sm"
              >
                <span className="min-w-0 grow">
                  {clubTitleById.get(clubId) ?? clubId}
                </span>
                {canEdit && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    disabled={busy}
                    onClick={() =>
                      deleteInvitation({
                        params: { path: { id: draft.id, club_id: clubId } },
                      })
                    }
                  >
                    Cancel
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {canEdit && (
        <div className="flex flex-col gap-3">
          {isClubLeader && ownClubsToAdd.length > 0 && (
            <div className="flex flex-wrap items-end gap-2">
              <label className="flex min-w-40 grow flex-col gap-1 text-sm">
                <span>Add your club</span>
                <select
                  className="select select-bordered w-full"
                  disabled={busy}
                  value={addClubId}
                  onChange={(e) => setAddClubId(e.target.value)}
                >
                  {ownClubsToAdd.map((club) => (
                    <option key={club.club_id} value={club.club_id}>
                      {club.title}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                disabled={busy || !addClubId}
                onClick={() =>
                  addClubHost({
                    params: { path: { id: draft.id } },
                    body: { club_id: addClubId },
                  })
                }
              >
                {isAddingClub && (
                  <span className="loading loading-spinner loading-sm" />
                )}
                Add club
              </button>
            </div>
          )}

          {isClubLeader && inviteableClubs.length > 0 && (
            <div className="flex flex-wrap items-end gap-2">
              <label className="flex min-w-40 grow flex-col gap-1 text-sm">
                <span>Invite club</span>
                <select
                  className="select select-bordered w-full"
                  disabled={busy}
                  value={inviteClubId}
                  onChange={(e) => setInviteClubId(e.target.value)}
                >
                  <option value="">Select a club</option>
                  {inviteableClubs.map((club) => (
                    <option key={club.id!} value={club.id!}>
                      {club.title}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="btn btn-sm btn-ghost border"
                disabled={busy || !inviteClubId}
                onClick={() =>
                  inviteClub({
                    params: { path: { id: draft.id } },
                    body: { club_id: inviteClubId },
                  })
                }
              >
                {isInviting && (
                  <span className="loading loading-spinner loading-sm" />
                )}
                Invite
              </button>
            </div>
          )}

          {isEventManager && (
            <div className="flex justify-end">
              <button
                type="button"
                className="btn btn-sm btn-ghost border"
                disabled={busy}
                onClick={() => {
                  setEditHost(null);
                  setExternalName("");
                  setExternalUrl("");
                  setExternalOpen(true);
                }}
              >
                Add external host
              </button>
            </div>
          )}
        </div>
      )}

      <Modal
        open={externalOpen || !!editHost}
        onOpenChange={(open) => {
          if (!open) {
            setExternalOpen(false);
            setEditHost(null);
          }
        }}
        title={editHost ? "Edit external host" : "Add external host"}
      >
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span>Name</span>
            <input
              type="text"
              className="input input-bordered w-full"
              value={externalName}
              disabled={isAddingExternal || isPatchingExternal}
              onChange={(e) => setExternalName(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>URL (optional)</span>
            <input
              type="url"
              className="input input-bordered w-full"
              value={externalUrl}
              disabled={isAddingExternal || isPatchingExternal}
              onChange={(e) => setExternalUrl(e.target.value)}
            />
          </label>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setExternalOpen(false);
                setEditHost(null);
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={isAddingExternal || isPatchingExternal}
              onClick={handleSaveExternal}
            >
              {(isAddingExternal || isPatchingExternal) && (
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
