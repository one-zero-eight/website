/** Compact «По группам» grid scale — aligned with «По дням» density. */
export const GROUPS_TIME_COL_WIDTH = "w-[130px] min-w-[130px] max-w-[130px]";

export const GROUPS_COL_WIDTH = "w-[135px] max-w-[135px] min-w-[135px]";

export const GROUPS_TABLE_CLASS =
  "groups-grid-table isolate w-max min-w-full table-fixed border-separate border-spacing-0";

export const GROUPS_SLOT_ROW_CLASS =
  "slot-row [&_.empty]:h-full [&_.empty]:min-h-[64px] [&_.meeting]:h-full [&_.meeting]:min-h-0 [&_td]:h-[100px]";

export const GROUPS_HEAD_PAD = "px-2 py-1.5 text-[0.6875rem] leading-tight";

export const GROUPS_CELL_PAD = "p-1.5 text-[0.6875rem] leading-tight";

export const GROUPS_SLOT_TIME_PAD =
  "p-2 text-center text-[0.6875rem] leading-snug font-bold";

export const GROUPS_DAY_ROW_INNER_CLASS =
  "sticky z-[19] box-border border-r border-b border-l border-[#d8dfeb] bg-[#edf4ff] p-2 align-top text-[0.8125rem] font-bold tracking-[0.3px] text-[#1d3f70]";

/** Inline `top` — must match measured thead height exactly (no offset). */
export const GROUPS_DAY_ROW_STICKY_STYLE = {
  top: "var(--sa-grid-header-height)",
} as const;

export const GROUPS_TABLE_HEAD_CLASS =
  "sticky top-0 z-[20] shadow-[0_1px_0_#d8dfeb]";

export const GROUPS_GRID_HEADER_HEIGHT_DEFAULT = "68px";

export const GROUPS_MEETING_CLASS =
  "mb-0 flex h-full min-h-0 w-full cursor-pointer flex-col gap-0.5 rounded border p-[7px] pb-1.5 last:mb-0";

export const GROUPS_MEETING_BODY_CLASS =
  "grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto] gap-0.5 overflow-hidden";

export const GROUPS_MEETING_TITLE_CLASS =
  "line-clamp-3 min-h-0 min-w-0 overflow-hidden text-[0.6875rem] leading-tight font-bold break-words text-[#1a2332]";

export const GROUPS_MEETING_FOOTER_CLASS =
  "flex min-w-0 shrink-0 flex-col gap-0.5";

export const GROUPS_MEETING_LINE_CLASS =
  "w-full min-w-0 shrink-0 text-[0.625rem] leading-tight text-[#313b49]";
