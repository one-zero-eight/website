import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import { ReservationStatus } from "@/api/board-games/types.ts";
import { cn } from "@/lib/ui/cn";
import type { ReactNode } from "react";

export function withId<T extends { id: string | null }>(
  items: T[] | undefined,
) {
  return (items ?? []).filter((item): item is T & { id: string } =>
    Boolean(item.id),
  );
}

export function byCreatedAtDesc<T extends { created_at: string }>(items: T[]) {
  return [...items].sort(
    (first, second) =>
      new Date(second.created_at).getTime() -
      new Date(first.created_at).getTime(),
  );
}

export function telegramHandle(alias: string | null | undefined) {
  const handle = alias?.trim().replace(/^@/, "");
  return handle || null;
}

export function ReservationStatusBadge({
  status,
}: {
  status: ReservationStatus;
}) {
  return (
    <span
      className={cn(
        "badge badge-soft shrink-0 capitalize",
        status === ReservationStatus.reserved && "badge-warning",
        status === ReservationStatus.taken && "badge-info",
        status === ReservationStatus.returned && "badge-success",
      )}
    >
      {status}
    </span>
  );
}

/** Extra inset so board-games dialogs are not flush with the modal frame. */
export const boardGamesModalClassName = "gap-6 p-6 sm:p-8";

export function InformationField({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("min-w-0 text-left", className)}>
      <p className="text-sm text-neutral-400">{label}</p>
      {/* A single long token (no spaces) would otherwise widen the modal. */}
      <div className="mt-1 leading-relaxed wrap-anywhere whitespace-pre-wrap">
        {children}
      </div>
    </div>
  );
}

export function GameInfoBody({
  image,
  title,
  description,
  stats,
  action,
}: {
  image: ReactNode;
  title: string;
  description: string | null;
  stats: { label: string; value: ReactNode; accent?: boolean }[];
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5 text-left">
      {image}
      <div className="flex flex-col gap-2">
        <h2 className="text-xl leading-snug font-semibold wrap-anywhere">
          {title}
        </h2>
        <GameDescription
          description={description}
          className="text-base leading-relaxed text-neutral-500 dark:text-neutral-200"
        />
      </div>
      <dl
        className={cn(
          "bg-base-300/50 rounded-box grid gap-4 px-8 py-4",
          stats.length > 2 ? "grid-cols-3" : "grid-cols-2",
        )}
      >
        {stats.map((stat) => (
          <div key={stat.label} className="min-w-0">
            <dt className="text-sm text-neutral-400">{stat.label}</dt>
            <dd
              className={cn(
                "mt-1 text-lg font-semibold tabular-nums",
                stat.accent && "text-primary",
              )}
            >
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>
      {action && <div className="flex justify-end">{action}</div>}
    </div>
  );
}

export function GameDescription({
  description,
  className,
  emptyLabel = "No description provided.",
}: {
  description: string | null;
  className?: string;
  emptyLabel?: string;
}) {
  return (
    <p className={cn("wrap-anywhere whitespace-pre-wrap", className)}>
      {description?.trim() ? description : emptyLabel}
    </p>
  );
}

export function SearchInput({
  value,
  onValueChange,
  placeholder,
  disabled,
  iconClassName = "icon-[material-symbols--search]",
  className,
}: {
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  iconClassName?: string;
  className?: string;
}) {
  return (
    <label className={cn("input w-full", className)}>
      <span
        className={cn(iconClassName, "text-base-content/50 shrink-0 text-xl")}
      />
      <input
        type="search"
        className="grow"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />
    </label>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="card card-border bg-base-100 py-10 text-center text-neutral-500 dark:text-neutral-200">
      {message}
    </div>
  );
}

export function SkeletonGrid({
  count,
  className,
  itemClassName,
}: {
  count: number;
  className?: string;
  itemClassName?: string;
}) {
  return (
    <div className={className}>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className={cn("skeleton", itemClassName)} />
      ))}
    </div>
  );
}

export function ListState({
  isPending,
  error,
  errorTitle,
  emptyMessage,
  pending,
  children,
}: {
  isPending: boolean;
  error: unknown;
  errorTitle: string;
  emptyMessage?: string;
  pending: ReactNode;
  children: ReactNode;
}) {
  if (isPending) return pending;
  if (error) return <QueryError title={errorTitle} error={error} />;
  if (emptyMessage) return <EmptyState message={emptyMessage} />;
  return children;
}

export function QueryError({
  title,
  error,
}: {
  title: string;
  error: unknown;
}) {
  return (
    <div className="alert alert-error">
      <span className="icon-[material-symbols--error-outline] shrink-0 text-xl" />
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-sm">{formatApiErrorMessage(error)}</p>
      </div>
    </div>
  );
}
