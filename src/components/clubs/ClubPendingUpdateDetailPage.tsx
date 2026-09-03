import { $clubs, clubsTypes } from "@/api/clubs";
import {
  getDescriptionImageUrl,
  getLogoURLById,
  getPendingLogoPreviewUrl,
} from "@/api/clubs/links.ts";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import { DescriptionViewer } from "@/components/editor/DescriptionViewer.tsx";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/ui/cn";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  getClubTypeColor,
  getClubTypeLabel,
  getLinkIconClass,
  getLinkLabel,
} from "./constants.ts";

function parseDescription(value: string | null | undefined): any {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function DiffRow({
  label,
  current,
  proposed,
}: {
  label: string;
  current: React.ReactNode;
  proposed: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-[8rem_1fr_1fr]">
      <div className="text-base-content/50 text-sm font-medium">{label}</div>
      <div className="border-base-300 rounded-field border p-3 text-sm">
        <div className="text-base-content/40 mb-1 text-xs uppercase">
          Current
        </div>
        {current}
      </div>
      <div className="border-primary/40 bg-primary/5 rounded-field border p-3 text-sm">
        <div className="text-primary/70 mb-1 text-xs uppercase">Proposed</div>
        {proposed}
      </div>
    </div>
  );
}

export function ClubPendingUpdateDetailPage({ slug }: { slug: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showError, showConfirm } = useToast();

  const { data: clubsUser } = $clubs.useQuery("get", "/users/me");
  const { data: club, isPending } = $clubs.useQuery(
    "get",
    "/clubs/by-slug/{slug}",
    { params: { path: { slug } } },
  );
  const { data: clubLeaders } = $clubs.useQuery("get", "/leaders/");

  const invalidate = (id: string | null) => {
    queryClient.invalidateQueries({
      queryKey: $clubs.queryOptions("get", "/clubs/pending-updates").queryKey,
    });
    if (id) {
      queryClient.invalidateQueries({
        queryKey: $clubs.queryOptions("get", "/clubs/by-id/{id}", {
          params: { path: { id } },
        }).queryKey,
      });
    }
    queryClient.invalidateQueries({
      queryKey: $clubs.queryOptions("get", "/clubs/by-slug/{slug}", {
        params: { path: { slug } },
      }).queryKey,
    });
    queryClient.invalidateQueries({
      queryKey: $clubs.queryOptions("get", "/clubs/").queryKey,
    });
  };

  const { mutate: approve, isPending: isApproving } = $clubs.useMutation(
    "post",
    "/clubs/by-id/{id}/approve-update",
    {
      onSuccess: (updated) => {
        invalidate(updated.id);
        navigate({ to: "/clubs/pending-updates" });
      },
      onError: (error) => showError("Error", formatApiErrorMessage(error)),
    },
  );

  const { mutate: reject, isPending: isRejecting } = $clubs.useMutation(
    "post",
    "/clubs/by-id/{id}/reject-update",
    {
      onSuccess: (updated) => {
        invalidate(updated.id);
        navigate({ to: "/clubs/pending-updates" });
      },
      onError: (error) => showError("Error", formatApiErrorMessage(error)),
    },
  );

  if (clubsUser?.role !== "admin") {
    return null;
  }

  if (isPending) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-base-content/50 text-lg">Loading...</div>
      </div>
    );
  }

  if (!club || !club.pending_update) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 text-center">
        <p className="text-base-content/50 mb-4 text-lg">
          No pending change for this club.
        </p>
        <Link to="/clubs/pending-updates" className="btn btn-ghost">
          <span className="icon-[mdi--arrow-left] size-5" />
          Back to pending changes
        </Link>
      </div>
    );
  }

  const pending = club.pending_update;

  async function handleApprove() {
    const confirmed = await showConfirm({
      title: "Approve changes",
      message: `Apply these proposed changes to "${club!.title}"? This cannot be undone from here.`,
      confirmText: "Approve",
      cancelText: "Cancel",
      type: "info",
    });
    if (!confirmed) return;
    approve({ params: { path: { id: club!.id! } } });
  }

  async function handleReject() {
    const confirmed = await showConfirm({
      title: "Reject changes",
      message: `Discard the proposed changes to "${club!.title}"? The leader will need to resubmit.`,
      confirmText: "Reject",
      cancelText: "Cancel",
      type: "error",
    });
    if (!confirmed) return;
    reject({ params: { path: { id: club!.id! } } });
  }

  const rows: React.ReactNode[] = [];

  if (pending.title != null && pending.title !== club.title) {
    rows.push(
      <DiffRow
        key="title"
        label="Title"
        current={club.title}
        proposed={pending.title}
      />,
    );
  }

  if (
    pending.short_description != null &&
    pending.short_description !== club.short_description
  ) {
    rows.push(
      <DiffRow
        key="short_description"
        label="Short description"
        current={club.short_description}
        proposed={pending.short_description}
      />,
    );
  }

  if (pending.type != null && pending.type !== club.type) {
    rows.push(
      <DiffRow
        key="type"
        label="Type"
        current={
          <span className={cn("badge", getClubTypeColor(club.type))}>
            {getClubTypeLabel(club.type)}
          </span>
        }
        proposed={
          <span className={cn("badge", getClubTypeColor(pending.type))}>
            {getClubTypeLabel(pending.type)}
          </span>
        }
      />,
    );
  }

  if (pending.sport_id !== undefined && pending.sport_id !== club.sport_id) {
    rows.push(
      <DiffRow
        key="sport_id"
        label="Sport ID"
        current={club.sport_id || "Not a sport club"}
        proposed={pending.sport_id || "Not a sport club"}
      />,
    );
  }

  if (
    pending.leader_innohassle_id !== undefined &&
    pending.leader_innohassle_id !== club.leader_innohassle_id
  ) {
    const currentLeader = club.leader_innohassle_id
      ? clubLeaders?.[club.leader_innohassle_id]
      : null;
    const proposedLeader = pending.leader_innohassle_id
      ? clubLeaders?.[pending.leader_innohassle_id]
      : null;
    rows.push(
      <DiffRow
        key="leader"
        label="Leader"
        current={currentLeader?.name || currentLeader?.email || "None"}
        proposed={proposedLeader?.name || proposedLeader?.email || "None"}
      />,
    );
  }

  const linksChanged =
    pending.links != null &&
    JSON.stringify(pending.links) !== JSON.stringify(club.links);
  if (linksChanged) {
    const renderLinks = (links: clubsTypes.SchemaLinkSchema[]) =>
      links.length === 0 ? (
        <span className="text-base-content/50 italic">No links</span>
      ) : (
        <ul className="flex flex-col gap-1">
          {links.map((link, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className={cn(getLinkIconClass(link.type), "size-4")} />
              <span>{link.label || getLinkLabel(link.type)}</span>
            </li>
          ))}
        </ul>
      );
    rows.push(
      <DiffRow
        key="links"
        label="Links"
        current={renderLinks(club.links)}
        proposed={renderLinks(pending.links!)}
      />,
    );
  }

  if (
    pending.logo_file_id != null &&
    pending.logo_file_id !== club.logo_file_id
  ) {
    const pendingLogoUrl = getPendingLogoPreviewUrl(pending.logo_file_id);
    rows.push(
      <DiffRow
        key="logo"
        label="Logo"
        current={
          club.logo_file_id ? (
            <img
              src={getLogoURLById(club.id!, club.logo_file_id)}
              alt="Current logo"
              className="size-24 rounded-full object-contain"
            />
          ) : (
            <span className="text-base-content/70 italic">No logo</span>
          )
        }
        proposed={
          <>
            {pendingLogoUrl && (
              <img
                src={pendingLogoUrl}
                alt="Proposed logo"
                className="size-24 rounded-full object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  e.currentTarget.nextElementSibling?.classList.remove(
                    "hidden",
                  );
                }}
              />
            )}
            <span
              className={cn(
                "text-base-content/70 italic",
                pendingLogoUrl && "hidden",
              )}
            >
              New logo submitted (preview unavailable — set VITE_CLUBS_MINIO_URL
              to enable it locally)
            </span>
          </>
        }
      />,
    );
  }

  const descriptionChanged =
    pending.description != null && pending.description !== club.description;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-4">
      <div className="card card-border">
        <div className="card-body">
          <div className="mb-2 flex items-center justify-between">
            <h1 className="card-title text-2xl font-bold">
              Review changes — {club.title}
            </h1>
            <Link to="/clubs/pending-updates" className="btn btn-ghost btn-sm">
              <span className="icon-[mdi--arrow-left] size-4" />
              Back
            </Link>
          </div>
          <p className="text-base-content/70 text-sm">
            Proposed by the club leader, waiting for your approval.
          </p>
        </div>
      </div>

      {rows.length === 0 && !descriptionChanged ? (
        <div className="card card-border">
          <div className="card-body text-base-content/50">
            No detectable field changes.
          </div>
        </div>
      ) : (
        <div className="card card-border">
          <div className="card-body space-y-4">{rows}</div>
        </div>
      )}

      {descriptionChanged && (
        <div className="card card-border">
          <div className="card-body">
            <h2 className="card-title mb-2">Description</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <div className="text-base-content/40 mb-2 text-xs uppercase">
                  Current
                </div>
                <DescriptionViewer
                  content={parseDescription(club.description)}
                  imageHandlers={{ resolveImageUrl: getDescriptionImageUrl }}
                />
              </div>
              <div>
                <div className="text-primary/70 mb-2 text-xs uppercase">
                  Proposed
                </div>
                <DescriptionViewer
                  content={parseDescription(pending.description)}
                  imageHandlers={{ resolveImageUrl: getDescriptionImageUrl }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card card-border">
        <div className="card-body">
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              className="btn btn-error"
              disabled={isApproving || isRejecting}
              onClick={handleReject}
            >
              {isRejecting && (
                <span className="loading loading-spinner loading-sm" />
              )}
              Reject
            </button>
            <button
              type="button"
              className="btn btn-success"
              disabled={isApproving || isRejecting}
              onClick={handleApprove}
            >
              {isApproving && (
                <span className="loading loading-spinner loading-sm" />
              )}
              Approve
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
