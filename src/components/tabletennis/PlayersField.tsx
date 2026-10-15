import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/ui/cn";
import { $tabletennis } from "@/api/tabletennis";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import { useToast } from "@/components/toast";
import { useTabletennisRefresh } from "./useTabletennisRefresh";

export type PlayerOption = {
  id: string;
  name: string;
  rating: number;
  guest: boolean;
};

export type FailedPlayer = { identifier: string; code: string; reason: string };

type Unresolved = { key: number; text: string; code: string; reason: string };

function splitTokens(raw: string): string[] {
  return raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** players already written in the input (every token except the one being typed) */
function typedTokens(raw: string): Set<string> {
  return new Set(
    raw
      .split(/[\n,]+/)
      .slice(0, -1)
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean),
  );
}

/** a guest is named after the typed text, or the part of the email before @ */
function guestNickname(text: string): string {
  return text.trim().split("@")[0]!.trim().slice(0, 20);
}

/** the players listed in a 400 from /reg-tour or /reg-tour/add-player */
export function failedPlayersOf(error: unknown): FailedPlayer[] | null {
  const detail = (error as { body?: { detail?: unknown } } | null)?.body
    ?.detail;
  if (typeof detail !== "object" || detail === null) return null;
  const failed = (detail as { failed?: unknown }).failed;
  return Array.isArray(failed) && failed.length > 0
    ? (failed as FailedPlayer[])
    : null;
}

export type PlayersFieldState = ReturnType<typeof usePlayersField>;

/**
 * State of a players field. `known` are all players the typed text is matched against:
 * a nickname typed by hand counts as picked when exactly one player has it.
 */
export function usePlayersField(known: PlayerOption[]) {
  const [raw, setRaw] = useState("");
  const [nickToId, setNickToId] = useState<Map<string, string>>(new Map());
  const [picked, setPicked] = useState<PlayerOption[]>([]);
  const [unresolved, setUnresolved] = useState<Unresolved[]>([]);
  const nextKey = useRef(0);

  const byNick = useMemo(() => {
    const map = new Map<string, PlayerOption[]>();
    for (const p of known) {
      const key = p.name.trim().toLowerCase();
      map.set(key, [...(map.get(key) ?? []), p]);
    }
    return map;
  }, [known]);

  const items = [
    ...splitTokens(raw),
    ...unresolved.map((u) => u.text.trim()).filter(Boolean),
  ];

  function matchesOf(item: string): PlayerOption[] {
    return byNick.get(item.trim().toLowerCase()) ?? [];
  }

  function idOf(item: string): string {
    if (item.includes("@")) return item;
    const mapped = nickToId.get(item);
    if (mapped) return mapped;
    const matches = matchesOf(item);
    return matches.length === 1 ? matches[0]!.id : item;
  }

  function isAmbiguous(item: string) {
    return (
      !item.includes("@") && !nickToId.has(item) && matchesOf(item).length > 1
    );
  }

  /**
   * The request body, or null when some nicknames belong to several players:
   * those are moved to rows where the right player is picked.
   */
  function prepare() {
    const ambiguous = items.filter(isAmbiguous);
    if (ambiguous.length > 0) {
      setRaw(
        splitTokens(raw)
          .filter((t) => !isAmbiguous(t))
          .map((t) => `${t},\n`)
          .join(""),
      );
      setUnresolved((prev) => [
        ...prev.filter((u) => !isAmbiguous(u.text.trim())),
        ...ambiguous.map((text) => ({
          key: nextKey.current++,
          text,
          code: "ambiguous",
          reason: "Several players have this nickname, pick one",
        })),
      ]);
      return null;
    }
    const player_ids = picked.map((p) => p.id);
    const emails: string[] = [];
    for (const item of items) {
      if (item.includes("@")) emails.push(item);
      else player_ids.push(idOf(item));
    }
    return { player_ids, emails };
  }

  /** moves the failed players out of the text into rows that can be fixed one by one */
  function applyFailed(failed: FailedPlayer[]) {
    const failedIds = new Set(failed.map((f) => f.identifier.toLowerCase()));
    const isFailed = (item: string) => failedIds.has(idOf(item).toLowerCase());
    setRaw(
      items
        .filter((t) => !isFailed(t))
        .map((t) => `${t},\n`)
        .join(""),
    );
    setPicked((prev) => prev.filter((p) => !failedIds.has(p.id.toLowerCase())));
    setUnresolved(
      failed.map((f) => ({
        key: nextKey.current++,
        text:
          items.find(
            (t) => idOf(t).toLowerCase() === f.identifier.toLowerCase(),
          ) ??
          picked.find((p) => p.id.toLowerCase() === f.identifier.toLowerCase())
            ?.name ??
          f.identifier,
        code: f.code,
        reason: f.reason,
      })),
    );
  }

  /** a suggestion picked while typing: replaces the token being typed */
  function pickSuggestion(player: PlayerOption) {
    setRaw((prev) => {
      const tokens = prev.split(/[\n,]+/);
      const typed = tokens[tokens.length - 1] ?? "";
      const rest = prev.slice(0, prev.length - typed.length);
      // a nickname shared by several players can't stay as text, it becomes a chip
      return matchesOf(player.name).length > 1
        ? rest
        : `${rest}${player.name},\n`;
    });
    if (matchesOf(player.name).length > 1) addPicked(player);
    else setNickToId((prev) => new Map(prev).set(player.name, player.id));
  }

  function addPicked(player: PlayerOption) {
    setPicked((prev) =>
      prev.some((p) => p.id === player.id) ? prev : [...prev, player],
    );
  }

  function reset() {
    setRaw("");
    setNickToId(new Map());
    setPicked([]);
    setUnresolved([]);
  }

  return {
    raw,
    setRaw,
    picked,
    setPicked,
    unresolved,
    setUnresolved,
    count: items.length + picked.length,
    matchesOf,
    prepare,
    applyFailed,
    pickSuggestion,
    addPicked,
    reset,
  };
}

/**
 * Players typed as emails, IDs or picked nicknames. Players the server could not find
 * are shown as rows below: fix the email, add the person as a guest, or drop them.
 */
export function PlayersField({
  field,
  options,
  multiline,
}: {
  field: PlayersFieldState;
  options: PlayerOption[];
  multiline?: boolean;
}) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [guestBusy, setGuestBusy] = useState<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement & HTMLInputElement>(null);
  const refresh = useTabletennisRefresh();
  const { showError } = useToast();

  const { mutateAsync: createGuest } = $tabletennis.useMutation(
    "post",
    "/guests",
    { onError: (e) => showError("Error", formatApiErrorMessage(e)) },
  );

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node))
        setShowSuggestions(false);
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const token = useMemo(() => {
    const tokens = field.raw.split(/[\n,]+/);
    return tokens[tokens.length - 1]?.trim() ?? "";
  }, [field.raw]);

  const suggestions = useMemo(() => {
    if (!token) return [];
    const lower = token.toLowerCase();
    const typed = typedTokens(field.raw);
    return options
      .filter(
        (p) =>
          !typed.has(p.name.toLowerCase()) && !typed.has(p.id.toLowerCase()),
      )
      .filter(
        (p) =>
          p.name.toLowerCase().includes(lower) ||
          p.id.toLowerCase().includes(lower),
      )
      .slice(0, 10);
  }, [options, token, field.raw]);

  async function handleAddGuest(row: Unresolved) {
    setGuestBusy(row.key);
    try {
      const guest = (await createGuest({
        params: { query: { nickname: guestNickname(row.text) } },
      })) as { innohassle_id: string; nickname: string; rating: number };
      field.addPicked({
        id: guest.innohassle_id,
        name: guest.nickname,
        rating: guest.rating,
        guest: true,
      });
      field.setUnresolved((prev) => prev.filter((u) => u.key !== row.key));
      refresh();
    } catch {
      // toast shown by onError
    } finally {
      setGuestBusy(null);
    }
  }

  const inputProps = {
    ref: inputRef,
    value: field.raw,
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) =>
      field.setRaw(e.target.value),
    onFocus: () => setShowSuggestions(true),
    placeholder: "Player emails or nicknames (comma or newline separated)",
  };

  return (
    <div className="flex flex-col gap-3">
      <div ref={wrapRef} className="relative">
        {multiline ? (
          <textarea
            {...inputProps}
            className="textarea textarea-bordered h-24 w-full"
          />
        ) : (
          <input
            {...inputProps}
            type="text"
            className="input input-bordered h-11 w-full"
          />
        )}
        {showSuggestions && suggestions.length > 0 && (
          <div className="bg-base-100 rounded-box absolute top-full right-0 left-0 z-10 mt-1 max-h-56 overflow-y-auto border shadow-lg">
            {suggestions.map((p) => (
              <button
                key={p.id}
                type="button"
                className="hover:bg-base-200 flex min-h-11 w-full items-center gap-2 px-3 text-left text-sm transition-colors"
                onClick={() => {
                  field.pickSuggestion(p);
                  setShowSuggestions(false);
                  inputRef.current?.focus();
                }}
              >
                <span className="min-w-0 flex-1 truncate font-medium">
                  {p.name}
                </span>
                {p.guest && <GuestBadge />}
                <span className="text-base-content/50 text-xs tabular-nums">
                  {p.rating}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {field.picked.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {field.picked.map((p) => (
            <span
              key={p.id}
              className="flex min-h-9 items-center gap-1.5 rounded-xl border border-[#712BB2] pl-3 text-sm"
            >
              <span className="font-medium">{p.name}</span>
              <span className="text-base-content/50 text-xs tabular-nums">
                {p.rating}
              </span>
              {p.guest && <GuestBadge />}
              <button
                type="button"
                aria-label={`Remove ${p.name}`}
                onClick={() =>
                  field.setPicked((prev) => prev.filter((x) => x.id !== p.id))
                }
                className="text-base-content/60 flex h-9 w-9 items-center justify-center"
              >
                <span className="icon-[mdi--close]" />
              </button>
            </span>
          ))}
        </div>
      )}

      {field.unresolved.length > 0 && (
        <div className="border-warning/60 bg-warning/10 flex flex-col gap-3 rounded-xl border p-3">
          <p className="text-sm font-medium">
            Check {field.unresolved.length} player
            {field.unresolved.length === 1 ? "" : "s"}: pick the right one, fix
            the email, add as a guest, or remove.
          </p>
          {field.unresolved.map((row) => {
            const nickname = guestNickname(row.text);
            // an existing player with this name: offer them instead of a duplicate guest
            const candidates =
              row.code === "already_in_tournament"
                ? []
                : field
                    .matchesOf(nickname)
                    .filter((c) => !field.picked.some((p) => p.id === c.id));
            return (
              <div key={row.key} className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={row.text}
                    onChange={(e) =>
                      field.setUnresolved((prev) =>
                        prev.map((u) =>
                          u.key === row.key
                            ? { ...u, text: e.target.value }
                            : u,
                        ),
                      )
                    }
                    className="input input-bordered input-sm h-11 min-w-0 flex-1"
                  />
                  {row.code === "not_found" && candidates.length === 0 && (
                    <button
                      type="button"
                      disabled={nickname.length < 2 || guestBusy !== null}
                      onClick={() => handleAddGuest(row)}
                      className="flex h-11 shrink-0 items-center gap-1 rounded-xl border border-[#712BB2] px-3 text-xs font-medium text-[#712BB2] disabled:opacity-40"
                    >
                      {guestBusy === row.key ? (
                        <span className="loading loading-spinner loading-sm" />
                      ) : (
                        <>
                          <span className="icon-[mdi--account-question-outline] text-base" />
                          Guest
                        </>
                      )}
                    </button>
                  )}
                  <button
                    type="button"
                    aria-label="Remove"
                    onClick={() =>
                      field.setUnresolved((prev) =>
                        prev.filter((u) => u.key !== row.key),
                      )
                    }
                    className="text-base-content/60 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                  >
                    <span className="icon-[mdi--close] text-lg" />
                  </button>
                </div>
                {candidates.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base-content/60 text-xs">
                      {row.code === "ambiguous" ? "Who is it?" : "Did you mean"}
                    </span>
                    {candidates.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          field.addPicked(c);
                          field.setUnresolved((prev) =>
                            prev.filter((u) => u.key !== row.key),
                          );
                        }}
                        className="flex min-h-9 items-center gap-1.5 rounded-xl bg-[#712BB2] px-3 text-sm font-medium text-white"
                      >
                        {c.name}
                        <span className="text-xs font-normal text-white/70 tabular-nums">
                          {c.rating}
                        </span>
                        {c.guest && (
                          <span className="text-[10px] font-normal">
                            · guest
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                <p className="text-base-content/60 text-[11px]">
                  {row.reason}
                  {row.code === "not_found" &&
                    candidates.length === 0 &&
                    nickname.length >= 2 &&
                    ` · guest name: ${nickname}`}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function GuestBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "badge badge-sm border-base-content/30 text-base-content/60 shrink-0 bg-transparent",
        className,
      )}
    >
      guest
    </span>
  );
}
