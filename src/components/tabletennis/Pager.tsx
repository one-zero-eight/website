import { PAGE_SIZE, pageCount } from "./ranking";

/** "‹ 11–20 of 34 ›" page switcher; renders nothing when everything fits on one page */
export function Pager({
  page,
  total,
  onChange,
  pageSize = PAGE_SIZE,
}: {
  page: number;
  total: number;
  onChange: (page: number) => void;
  pageSize?: number;
}) {
  const pages = pageCount(total, pageSize);
  if (total <= pageSize) return null;
  const current = Math.min(Math.max(0, page), pages - 1);
  const from = current * pageSize + 1;
  const to = Math.min(total, from + pageSize - 1);

  return (
    <div className="flex items-center justify-center gap-3 py-3">
      <button
        type="button"
        aria-label="Previous page"
        disabled={current === 0}
        onClick={() => onChange(current - 1)}
        className="disabled:border-base-300 disabled:text-base-content/25 flex h-10 w-10 items-center justify-center rounded-xl border border-[#712BB2] text-[#712BB2] transition-colors hover:bg-[#712BB2]/10 disabled:hover:bg-transparent"
      >
        <span className="icon-[mdi--chevron-left] text-2xl" />
      </button>
      <span className="text-base-content/70 min-w-28 text-center text-sm tabular-nums">
        {from}–{to} of {total}
      </span>
      <button
        type="button"
        aria-label="Next page"
        disabled={current >= pages - 1}
        onClick={() => onChange(current + 1)}
        className="disabled:border-base-300 disabled:text-base-content/25 flex h-10 w-10 items-center justify-center rounded-xl border border-[#712BB2] text-[#712BB2] transition-colors hover:bg-[#712BB2]/10 disabled:hover:bg-transparent"
      >
        <span className="icon-[mdi--chevron-right] text-2xl" />
      </button>
    </div>
  );
}
