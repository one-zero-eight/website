import { $clubs, clubsTypes } from "@/api/clubs";
import { Trans, useLingui } from "@lingui/react/macro";
import { msg } from "@lingui/core/macro";
import { getDescriptionImageUrl, getLogoURLById } from "@/api/clubs/links.ts";
import { usePendingLogoUrl } from "@/api/clubs/use-pending-logo.ts";
import { formatApiErrorDescriptor } from "@/api/helpers/create-query-client";
import { DescriptionViewer } from "@/components/editor/DescriptionViewer.tsx";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/ui/cn";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import moment from "moment";
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

function DiffBlock({
  label,
  current,
  proposed,
}: {
  label: string;
  current: React.ReactNode;
  proposed: React.ReactNode;
}) {
  return (
    <div className="card card-border">
      <div className="card-body">
        <h2 className="card-title mb-2">{label}</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <div className="text-base-content/40 mb-2 text-xs uppercase">
              <Trans>Current</Trans>
            </div>
            {current}
          </div>
          <div>
            <div className="text-primary/70 mb-2 text-xs uppercase">
              <Trans>Proposed</Trans>
            </div>
            {proposed}
          </div>
        </div>
      </div>
    </div>
  );
}

type DiffField = {
  key: string;
  label: string;
  changed: boolean;
  current: React.ReactNode;
  proposed: React.ReactNode;
};

function renderDiffFields(fields: DiffField[]) {
  return fields
    .filter((field) => field.changed)
    .map(({ key, label, current, proposed }) => (
      <DiffBlock
        key={key}
        label={label}
        current={current}
        proposed={proposed}
      />
    ));
}

function renderLinks(links: clubsTypes.SchemaLinkSchema[]) {
  if (links.length === 0) {
    return (
      <span className="text-base-content/50 italic">
        <Trans>No links</Trans>
      </span>
    );
  }

  return (
    <ul className="menu w-full p-0">
      {links.map((link, index) => (
        <li key={index}>
          <a
            href={link.link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3"
          >
            <span
              className={cn(
                "text-base-content",
                getLinkIconClass(link.type),
                "size-5",
              )}
            />
            <span className="text-base-content font-medium">
              {link.label ? link.label : getLinkLabel(link.type)}
            </span>
            <span className="icon-[mdi--open-in-new] text-base-content/30 ml-auto size-4" />
          </a>
        </li>
      ))}
    </ul>
  );
}

export function ClubReviewChangeDetailPage({ slug }: { slug: string }) {
  const { t } = useLingui();
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
  const pendingLogoFileId =
    club?.pending_update?.logo_file_id != null &&
    club.pending_update.logo_file_id !== club.logo_file_id
      ? club.pending_update.logo_file_id
      : null;
  const { logoUrl: pendingLogoUrl } = usePendingLogoUrl(
    club?.id,
    pendingLogoFileId,
  );

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
        navigate({ to: "/clubs/review" });
      },
      onError: (error) =>
        showError(msg`Error`, formatApiErrorDescriptor(error)),
    },
  );

  const { mutate: reject, isPending: isRejecting } = $clubs.useMutation(
    "post",
    "/clubs/by-id/{id}/reject-update",
    {
      onSuccess: (updated) => {
        invalidate(updated.id);
        navigate({ to: "/clubs/review" });
      },
      onError: (error) =>
        showError(msg`Error`, formatApiErrorDescriptor(error)),
    },
  );

  if (clubsUser?.role !== "admin") {
    return null;
  }

  if (isPending) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-base-content/50 text-lg">
          <Trans>Loading...</Trans>
        </div>
      </div>
    );
  }

  if (!club || !club.pending_update) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 text-center">
        <p className="text-base-content/50 mb-4 text-lg">
          <Trans>No changes to review for this club.</Trans>
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {club && (
            <Link to="/clubs/$slug" params={{ slug }} className="btn btn-ghost">
              <Trans>View club</Trans>
            </Link>
          )}
          <Link to="/clubs/review" className="btn btn-ghost">
            <span className="icon-[mdi--arrow-left] size-5" />
            <Trans>Back to review changes</Trans>
          </Link>
        </div>
      </div>
    );
  }

  const pending = club.pending_update;
  const clubTitle = club.title;

  async function handleApprove() {
    const confirmed = await showConfirm({
      title: msg`Approve changes`,
      message: msg`Apply these proposed changes to "${clubTitle}"? This cannot be undone from here.`,
      confirmText: msg`Approve`,
      cancelText: msg`Cancel`,
      type: "info",
    });
    if (!confirmed) return;
    approve({ params: { path: { id: club!.id! } } });
  }

  async function handleReject() {
    const confirmed = await showConfirm({
      title: msg`Reject changes`,
      message: msg`Discard the proposed changes to "${clubTitle}"? The leader will need to resubmit.`,
      confirmText: msg`Reject`,
      cancelText: msg`Cancel`,
      type: "error",
    });
    if (!confirmed) return;
    reject({ params: { path: { id: club!.id! } } });
  }

  const currentLeader = club.leader_innohassle_id
    ? clubLeaders?.[club.leader_innohassle_id]
    : null;
  const proposedLeader = pending.leader_innohassle_id
    ? clubLeaders?.[pending.leader_innohassle_id]
    : null;
  const blocks = renderDiffFields([
    {
      key: "title",
      label: t`Title`,
      changed: pending.title != null && pending.title !== club.title,
      current: club.title,
      proposed: pending.title,
    },
    {
      key: "short_description",
      label: t`Short description`,
      changed:
        pending.short_description != null &&
        pending.short_description !== club.short_description,
      current: club.short_description,
      proposed: pending.short_description,
    },
    {
      key: "type",
      label: t`Type`,
      changed: pending.type != null && pending.type !== club.type,
      current: (
        <span className={cn("badge", getClubTypeColor(club.type))}>
          {getClubTypeLabel(club.type)}
        </span>
      ),
      proposed: pending.type && (
        <span className={cn("badge", getClubTypeColor(pending.type))}>
          {getClubTypeLabel(pending.type)}
        </span>
      ),
    },
    {
      key: "sport_id",
      label: t`Sport ID`,
      changed:
        pending.sport_id !== undefined && pending.sport_id !== club.sport_id,
      current: club.sport_id || t`Not a sport club`,
      proposed: pending.sport_id || t`Not a sport club`,
    },
    {
      key: "leader",
      label: t`Leader`,
      changed:
        pending.leader_innohassle_id !== undefined &&
        pending.leader_innohassle_id !== club.leader_innohassle_id,
      current: currentLeader?.name || currentLeader?.email || t`None`,
      proposed: proposedLeader?.name || proposedLeader?.email || t`None`,
    },
    {
      key: "links",
      label: t`Links`,
      changed:
        pending.links != null &&
        JSON.stringify(pending.links) !== JSON.stringify(club.links),
      current: renderLinks(club.links),
      proposed: pending.links && renderLinks(pending.links),
    },
    {
      key: "logo",
      label: t`Logo`,
      changed:
        pending.logo_file_id != null &&
        pending.logo_file_id !== club.logo_file_id,
      current: club.logo_file_id ? (
        <img
          src={getLogoURLById(club.id!, club.logo_file_id)}
          alt={t`Current logo`}
          className="rounded-field bg-base-200 size-24 object-contain"
        />
      ) : (
        <span className="text-base-content/70 italic">
          <Trans>No logo</Trans>
        </span>
      ),
      proposed: pending.logo_file_id && (
        <>
          <img
            src={pendingLogoUrl ?? undefined}
            alt={t`Proposed logo`}
            className="rounded-field bg-base-200 size-24 object-contain"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              e.currentTarget.nextElementSibling?.classList.remove("hidden");
            }}
          />
          <span className="text-base-content/70 hidden italic">
            <Trans>New logo submitted (preview failed to load)</Trans>
          </span>
        </>
      ),
    },
    {
      key: "description",
      label: t`Description`,
      changed:
        pending.description != null &&
        JSON.stringify(pending.description) !==
          JSON.stringify(club.description),
      current: (
        <DescriptionViewer
          content={parseDescription(club.description)}
          imageHandlers={{ resolveImageUrl: getDescriptionImageUrl }}
        />
      ),
      proposed: (
        <DescriptionViewer
          content={parseDescription(pending.description)}
          imageHandlers={{ resolveImageUrl: getDescriptionImageUrl }}
        />
      ),
    },
  ]);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-4">
      <div className="space-y-2">
        <div className="mb-2 flex items-start justify-between gap-2">
          <h1 className="min-w-0 text-2xl font-bold wrap-break-word">
            <Trans>Review changes — {clubTitle}</Trans>
          </h1>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              to="/clubs/$slug"
              params={{ slug }}
              className="btn btn-ghost btn-sm"
            >
              <Trans>View club</Trans>
            </Link>
            <Link to="/clubs/review" className="btn btn-ghost btn-sm">
              <span className="icon-[mdi--arrow-left] size-4" />
              <Trans>Back</Trans>
            </Link>
          </div>
        </div>
        <p className="text-base-content/70 text-sm">
          <Trans>Proposed by the club leader, waiting for your review.</Trans>
        </p>
        <p className="text-base-content/70 text-sm">
          <Trans>
            Submitted:{" "}
            <time dateTime={pending.submitted_at}>
              {moment(pending.submitted_at).format("D MMM YYYY, HH:mm")}
            </time>
          </Trans>
        </p>
      </div>

      {blocks.length === 0 ? (
        <div className="card card-border">
          <div className="card-body text-base-content/50">
            <Trans>No detectable field changes.</Trans>
          </div>
        </div>
      ) : (
        blocks
      )}

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
          <Trans>Reject</Trans>
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
          <Trans>Approve</Trans>
        </button>
      </div>
    </div>
  );
}
