import { useState } from "react";

export function AddPredefinedEmailForm({
  placeholder,
  isPending,
  onAdd,
}: {
  placeholder: string;
  isPending: boolean;
  onAdd: (email: string) => boolean;
}) {
  const [email, setEmail] = useState("");

  function handleSubmit() {
    if (onAdd(email)) {
      setEmail("");
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
      <input
        autoComplete="off"
        spellCheck={false}
        className="input input-bordered min-w-0 flex-1"
        placeholder={placeholder}
        value={email}
        disabled={isPending}
        onChange={(event) => setEmail(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            handleSubmit();
          }
        }}
      />
      <button
        type="button"
        className="btn btn-primary"
        disabled={isPending || !email.trim()}
        onClick={handleSubmit}
      >
        {isPending ? (
          <span className="loading loading-spinner loading-sm" />
        ) : (
          "Add email"
        )}
      </button>
    </div>
  );
}

export function RemovePredefinedEmailButton({
  isPending,
  onRemove,
}: {
  isPending: boolean;
  onRemove: () => void;
}) {
  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm btn-square text-error shrink-0"
      disabled={isPending}
      onClick={onRemove}
    >
      {isPending ? (
        <span className="loading loading-spinner loading-xs" />
      ) : (
        <span className="icon-[material-symbols--delete-outline-rounded]" />
      )}
    </button>
  );
}
