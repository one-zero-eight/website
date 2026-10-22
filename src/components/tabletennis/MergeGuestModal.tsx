import { useMemo, useState } from "react";
import { Trans, useLingui } from "@lingui/react/macro";
import { msg } from "@lingui/core/macro";
import { $tabletennis, tabletennisTypes } from "@/api/tabletennis";
import { formatApiErrorDescriptor } from "@/api/helpers/create-query-client";
import { Modal } from "@/components/common/Modal.tsx";
import { useToast } from "@/components/toast";
import { useTabletennisRefresh } from "./useTabletennisRefresh";

type SchemaPlayer = tabletennisTypes.SchemaPlayer;

/** Hands a guest over to a registered player: by a picked nickname or by email */
export function MergeGuestModal({
  open,
  onOpenChange,
  guest,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guest: SchemaPlayer;
}) {
  const { t } = useLingui();
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<SchemaPlayer | null>(null);
  const refresh = useTabletennisRefresh();
  const { showSuccess, showError } = useToast();

  const { data } = $tabletennis.useQuery("get", "/players");
  const registered = useMemo(
    () =>
      (
        (data as unknown as { players?: SchemaPlayer[] } | undefined)
          ?.players ?? []
      ).filter((p) => !p.placeholder),
    [data],
  );

  const isEmail = query.includes("@");
  const suggestions = useMemo(() => {
    const lower = query.trim().toLowerCase();
    if (!lower || isEmail || picked) return [];
    return registered
      .filter((p) => p.nickname.toLowerCase().includes(lower))
      .slice(0, 8);
  }, [registered, query, isEmail, picked]);

  const { mutate, isPending } = $tabletennis.useMutation(
    "post",
    "/merge-guest",
    {
      onSuccess: (res) => {
        const tours = (res as { tournaments?: number }).tournaments ?? 0;
        showSuccess(
          msg`Guest linked`,
          msg`${guest.nickname} → ${picked?.nickname ?? query.trim()}: ${tours} tournaments moved`,
        );
        refresh();
        handleOpenChange(false);
      },
      onError: (e) => showError(msg`Error`, formatApiErrorDescriptor(e)),
    },
  );

  function handleOpenChange(value: boolean) {
    if (!value) {
      setQuery("");
      setPicked(null);
    }
    onOpenChange(value);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const target = picked
      ? { player_id: picked.innohassle_id }
      : isEmail
        ? { email: query.trim() }
        : null;
    if (!target) return;
    mutate({ params: { query: { guest_id: guest.innohassle_id, ...target } } });
  }

  return (
    <Modal
      open={open}
      onOpenChange={handleOpenChange}
      title={t`Link guest to account`}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <p className="text-base-content/70 text-sm">
          <Trans>
            Pick the registered player who played as{" "}
            <strong>{guest.nickname}</strong>. They get the guest's games in
            every tournament and the rating ({guest.rating}); the guest is
            deleted.
          </Trans>
        </p>
        <div className="relative">
          <input
            type="text"
            autoFocus
            value={picked ? picked.nickname : query}
            onChange={(e) => {
              setPicked(null);
              setQuery(e.target.value);
            }}
            placeholder={t`Nickname or email`}
            className="input input-bordered h-12 w-full"
          />
          {suggestions.length > 0 && (
            <div className="bg-base-100 rounded-box absolute top-full right-0 left-0 z-10 mt-1 max-h-56 overflow-y-auto border shadow-lg">
              {suggestions.map((p) => (
                <button
                  key={p.innohassle_id}
                  type="button"
                  onClick={() => setPicked(p)}
                  className="hover:bg-base-200 flex min-h-11 w-full items-center gap-2 px-3 text-left text-sm"
                >
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {p.nickname}
                  </span>
                  <span className="text-base-content/50 text-xs tabular-nums">
                    {p.rating}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        <p className="text-base-content/50 text-xs">
          <Trans>The person has to register in table tennis first.</Trans>
        </p>
        <div className="mt-2 flex justify-end gap-2">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => handleOpenChange(false)}
          >
            <Trans>Cancel</Trans>
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isPending || (!picked && !isEmail)}
          >
            {isPending ? (
              <span className="loading loading-spinner loading-sm" />
            ) : (
              <Trans>Link</Trans>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
