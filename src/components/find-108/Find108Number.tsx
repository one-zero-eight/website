import { Find108Glyph } from "@/components/find-108/Find108Glyph.tsx";

export function Find108Number({
  value,
  revealed,
  onReveal,
}: {
  value: string;
  revealed: boolean;
  onReveal: () => void;
}) {
  if (revealed) {
    return <span className="text-white tabular-nums">{value}</span>;
  }

  return (
    <button
      type="button"
      className="cursor-pointer text-white tabular-nums hover:text-white/60"
      onClick={onReveal}
    >
      <Find108Glyph />
    </button>
  );
}
