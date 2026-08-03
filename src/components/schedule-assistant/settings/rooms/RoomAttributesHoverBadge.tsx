import { Fragment } from "react";

import Tooltip from "@/components/common/Tooltip.tsx";

export function RoomAttributesHoverBadge({
  entries,
}: {
  entries: { key: string; label: string }[];
}) {
  if (!entries.length) return null;

  return (
    <Tooltip
      content={
        <div className="flex max-w-xs flex-col gap-1.5 py-0.5">
          <div className="text-base-content/60 text-[11px] font-semibold tracking-wide uppercase">
            Атрибуты
          </div>
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1">
            {entries.map((entry) => (
              <Fragment key={entry.key}>
                <dt className="text-base-content/70 shrink-0 font-medium">
                  {entry.key}
                </dt>
                <dd className="text-base-content min-w-0 wrap-break-word">
                  {entry.label}
                </dd>
              </Fragment>
            ))}
          </dl>
        </div>
      }
    >
      <span
        className="text-base-content/55 hover:text-base-content/80 inline-flex items-center gap-1 text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="icon-[material-symbols--list-alt-outline] text-sm" />
        Атрибуты
      </span>
    </Tooltip>
  );
}
