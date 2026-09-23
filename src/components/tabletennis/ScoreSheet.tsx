import { useEffect, useState } from "react";
import { cn } from "@/lib/ui/cn";
import { Modal } from "@/components/common/Modal.tsx";

function Stepper({
  name,
  value,
  onChange,
  disabled,
  leading,
}: {
  name: string;
  value: number;
  onChange: (v: number) => void;
  disabled: boolean;
  leading: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border-2 px-3 py-3 transition-colors",
        leading ? "border-[#712BB2] bg-[#712BB2]/10" : "border-base-300",
      )}
    >
      <span className="min-w-0 flex-1 truncate text-base font-medium">
        {name}
      </span>
      <button
        type="button"
        aria-label={`Decrease ${name} score`}
        disabled={disabled || value === 0}
        onClick={() => onChange(value - 1)}
        className="border-base-content/20 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-xl disabled:opacity-30"
      >
        <span className="icon-[mdi--minus]" />
      </button>
      <span className="w-8 text-center text-3xl font-semibold tabular-nums">
        {value}
      </span>
      <button
        type="button"
        aria-label={`Increase ${name} score`}
        disabled={disabled || value >= 9}
        onClick={() => onChange(value + 1)}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#712BB2] text-xl text-white disabled:opacity-30"
      >
        <span className="icon-[mdi--plus]" />
      </button>
    </div>
  );
}

/** Score entry: a bottom sheet on phones, a centered dialog on desktop */
export function ScoreSheet({
  open,
  onOpenChange,
  title,
  player1,
  player2,
  onSubmit,
  initial,
  submitLabel = "Finish match",
  note,
  validate,
  secondaryAction,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  player1: string;
  player2: string;
  onSubmit: (s1: number, s2: number) => Promise<void>;
  /** prefilled score, e.g. when correcting a finished match */
  initial?: [number, number];
  submitLabel?: string;
  note?: string;
  /** returns an error text to block the submit */
  validate?: (s1: number, s2: number) => string | null;
  secondaryAction?: { label: string; onClick: () => Promise<void> };
}) {
  const [s1, setS1] = useState(0);
  const [s2, setS2] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setS1(initial?.[0] ?? 0);
      setS2(initial?.[1] ?? 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const unchanged = !!initial && initial[0] === s1 && initial[1] === s2;
  const error =
    s1 === s2 ? "Draws are not allowed" : (validate?.(s1, s2) ?? null);

  async function run(action: () => Promise<void>) {
    setSaving(true);
    try {
      await action();
      onOpenChange(false);
    } catch {
      // error toast is shown by the mutation
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={(v) => !saving && onOpenChange(v)}
      title={<span className="text-lg">{title}</span>}
      overlayClassName="items-end justify-items-stretch p-0 md:place-items-center md:p-4"
      containerClassName="max-w-none rounded-b-none pb-[max(1rem,env(safe-area-inset-bottom))] md:max-w-md md:rounded-box"
    >
      <p className="text-base-content/50 -mt-1 text-xs">Sets won</p>
      {note && (
        <p className="rounded-xl border border-[#712BB2]/40 bg-[#712BB2]/10 px-3 py-2 text-xs">
          {note}
        </p>
      )}
      <div className="flex flex-col gap-2">
        <Stepper
          name={player1}
          value={s1}
          onChange={setS1}
          disabled={saving}
          leading={s1 > s2}
        />
        <Stepper
          name={player2}
          value={s2}
          onChange={setS2}
          disabled={saving}
          leading={s2 > s1}
        />
      </div>
      <button
        type="button"
        disabled={!!error || unchanged || saving}
        onClick={() => run(() => onSubmit(s1, s2))}
        className="mt-2 flex min-h-12 w-full items-center justify-center rounded-xl bg-[#712BB2] px-3 text-center text-base font-medium text-white transition-opacity disabled:opacity-40"
      >
        {saving ? (
          <span className="loading loading-spinner loading-sm" />
        ) : (
          (error ?? submitLabel)
        )}
      </button>
      {secondaryAction && (
        <button
          type="button"
          disabled={saving}
          onClick={() => run(secondaryAction.onClick)}
          className="border-base-content/20 text-base-content/70 flex h-11 w-full items-center justify-center rounded-xl border text-sm disabled:opacity-40"
        >
          {secondaryAction.label}
        </button>
      )}
    </Modal>
  );
}
