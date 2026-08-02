import { Modal } from "@/components/common/Modal.tsx";
import type { FormEvent, ReactNode } from "react";

export function SettingsCreateModal({
  open,
  onOpenChange,
  title,
  submitLabel,
  isPending,
  errorMessage,
  onSubmit,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  submitLabel: string;
  isPending: boolean;
  errorMessage?: string | null;
  onSubmit: () => void;
  children: ReactNode;
}) {
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (isPending) return;
    onSubmit();
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={title}>
      <form
        className="@container/modal flex flex-col gap-3"
        onSubmit={handleSubmit}
      >
        {children}
        {errorMessage ? (
          <p className="text-error text-sm">{errorMessage}</p>
        ) : null}
        <div className="mt-2 flex justify-end gap-2">
          <button
            type="button"
            className="btn btn-ghost"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            Отмена
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isPending}
          >
            {isPending ? (
              <span className="loading loading-spinner loading-sm" />
            ) : (
              submitLabel
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function SettingsCreateField({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-base-content/70 text-xs font-medium tracking-wide uppercase">
        {label}
        {required ? <span className="text-error"> *</span> : null}
      </span>
      {children}
    </label>
  );
}
