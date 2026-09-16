import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/ui/cn";
import { $tabletennis, tabletennisTypes } from "@/api/tabletennis";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import { useToast } from "@/components/toast";
import { ScoreSheet } from "./ScoreSheet";
import {
  type GameData,
  type Groups,
  type Player,
  groupGamesTotal,
  groupName,
  groupStandings,
  pairKey,
  snakeGroups,
  suggestNextMatches,
  type MatchSuggestion,
} from "./bracket-utils";
import { DROP_ATTR, useGroupDrag } from "./useGroupDrag";

const UNASSIGNED = "?";

type OpenGame = { game_id: string; p1: string; p2: string };
type Scoring = OpenGame & {
  mode: "finish" | "fix";
  initial?: [number, number];
};

export function ValidationMatches({
  players,
  tourId,
  groups,
  groupsLocked,
  qualStarted,
  validationGames,
  isAdmin,
  onChanged,
}: {
  players: Player[];
  tourId: string;
  groups: Groups;
  groupsLocked: boolean;
  qualStarted: boolean;
  validationGames: GameData[];
  isAdmin: boolean;
  onChanged: () => Promise<void>;
}) {
  const names = useMemo(
    () => new Map(players.map((p) => [p.id, p.name])),
    [players],
  );
  const getName = (id: string) => names.get(id) ?? id;

  if (!groupsLocked) {
    return (
      <GroupSetup
        players={players}
        tourId={tourId}
        serverGroups={groups}
        isAdmin={isAdmin}
        getName={getName}
        onChanged={onChanged}
      />
    );
  }

  return (
    <GroupStage
      players={players}
      tourId={tourId}
      groups={groups}
      qualStarted={qualStarted}
      validationGames={validationGames}
      isAdmin={isAdmin}
      getName={getName}
      onChanged={onChanged}
    />
  );
}

// ── stage 1: build groups ─────────────────────────────────────

function GroupSetup({
  players,
  tourId,
  serverGroups,
  isAdmin,
  getName,
  onChanged,
}: {
  players: Player[];
  tourId: string;
  serverGroups: Groups;
  isAdmin: boolean;
  getName: (id: string) => string;
  onChanged: () => Promise<void>;
}) {
  const { showError } = useToast();
  const hasServerGroups = Object.keys(serverGroups).length > 0;
  const defaultCount = Math.max(1, Math.round(players.length / 4));

  const [draft, setDraft] = useState<Groups>(() =>
    hasServerGroups ? serverGroups : snakeGroups(players, defaultCount),
  );
  const [dirty, setDirty] = useState(!hasServerGroups);
  const [countPref, setCountPref] = useState<number | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // follow server groups (another admin, a refetch) unless there are local edits
  const serverKey = JSON.stringify(serverGroups);
  useEffect(() => {
    if (!dirty && hasServerGroups) setDraft(serverGroups);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverKey]);

  // a fresh tournament without saved groups: re-snake when players load or change
  const playersKey = players.map((p) => p.id).join();
  useEffect(() => {
    if (!hasServerGroups && dirty) {
      setDraft(snakeGroups(players, countPref ?? defaultCount));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playersKey]);

  const groupCount = Object.keys(draft).length;
  const assigned = new Set(Object.values(draft).flat());
  const unassigned = players
    .filter((p) => !assigned.has(p.id))
    .map((p) => p.id);
  const tooSmall = Object.values(draft).some((m) => m.length < 2);
  const canLock = unassigned.length === 0 && !tooSmall && groupCount > 0;

  const { mutateAsync: setGroups } = $tabletennis.useMutation(
    "post",
    "/reg-tour/set-groups",
    { onError: (e) => showError("Error", formatApiErrorMessage(e)) },
  );
  const { mutateAsync: lockGroups } = $tabletennis.useMutation(
    "post",
    "/reg-tour/lock-groups",
    { onError: (e) => showError("Error", formatApiErrorMessage(e)) },
  );

  function edit(next: Groups) {
    setDraft(next);
    setDirty(true);
  }

  function changeCount(delta: number) {
    const count = Math.min(
      Math.max(1, groupCount + delta),
      Math.max(1, Math.floor(players.length / 2)),
    );
    setCountPref(count);
    edit(snakeGroups(players, count));
    setSelected(null);
  }

  function movePlayer(id: string, target: string) {
    setSelected(null);
    const alreadyThere =
      target === UNASSIGNED
        ? !Object.values(draft).some((m) => m.includes(id))
        : draft[target]?.includes(id);
    if (alreadyThere) return;
    const next: Groups = {};
    for (const [name, members] of Object.entries(draft)) {
      next[name] = members.filter((m) => m !== id);
    }
    if (target !== UNASSIGNED) next[target] = [...(next[target] ?? []), id];
    edit(next);
  }

  function moveSelected(target: string) {
    if (selected) movePlayer(selected, target);
  }

  const { drag, chipProps, consumeClick } = useGroupDrag(movePlayer);

  function dropState(group: string) {
    if (!drag) return undefined;
    return drag.over === group ? "over" : "available";
  }

  function toggleSelected(id: string) {
    if (consumeClick()) return;
    setSelected(selected === id ? null : id);
  }

  async function run(action: "save" | "lock") {
    setBusy(true);
    try {
      await setGroups({ params: { query: { tour_id: tourId } }, body: draft });
      if (action === "lock") {
        await lockGroups({ params: { query: { tour_id: tourId } } });
      }
      setDirty(false);
      await onChanged();
    } catch {
      // toast shown by onError
    } finally {
      setBusy(false);
    }
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col gap-3 px-4 py-5 md:px-7">
        <h2 className="text-xl font-light">Groups</h2>
        {hasServerGroups ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(serverGroups).map(([name, members]) => (
              <GroupShell
                key={name}
                name={name}
                subtitle={`${members.length} players`}
              >
                <div className="flex flex-wrap gap-2">
                  {members.map((id) => (
                    <span
                      key={id}
                      className="bg-base-200 rounded-lg px-3 py-1.5 text-sm"
                    >
                      {getName(id)}
                    </span>
                  ))}
                </div>
              </GroupShell>
            ))}
          </div>
        ) : (
          <p className="text-base-content/50 text-sm">
            The organiser is forming the groups.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-5 md:px-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-light">Split players into groups</h2>
          <p className="text-base-content/50 mt-0.5 text-xs">
            Hold a player and drag them to another group, or tap a player and
            then a group. Groups can be of any size.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-base-content/60 text-xs">Groups</span>
          <div className="border-base-300 flex items-center rounded-xl border">
            <button
              type="button"
              aria-label="Fewer groups"
              onClick={() => changeCount(-1)}
              disabled={groupCount <= 1}
              className="flex h-10 w-10 items-center justify-center disabled:opacity-30"
            >
              <span className="icon-[mdi--minus]" />
            </button>
            <span className="w-6 text-center font-semibold tabular-nums">
              {groupCount}
            </span>
            <button
              type="button"
              aria-label="More groups"
              onClick={() => changeCount(1)}
              disabled={groupCount >= Math.floor(players.length / 2)}
              className="flex h-10 w-10 items-center justify-center disabled:opacity-30"
            >
              <span className="icon-[mdi--plus]" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => changeCount(0)}
            className="flex h-10 items-center gap-1 rounded-xl border border-[#712BB2] px-3 text-xs font-medium text-[#712BB2]"
          >
            <span className="icon-[mdi--shuffle-variant] text-base" />
            By rating
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(draft).map(([name, members]) => (
          <GroupShell
            key={name}
            name={name}
            subtitle={`${members.length} player${members.length === 1 ? "" : "s"}`}
            highlight={!drag && !!selected && !members.includes(selected)}
            warn={members.length < 2}
            onHeaderClick={selected ? () => moveSelected(name) : undefined}
            dropId={name}
            dropState={dropState(name)}
          >
            <div className="flex min-h-10 flex-wrap gap-2">
              {members.map((id) => (
                <PlayerChip
                  key={id}
                  label={getName(id)}
                  active={selected === id}
                  dragging={drag?.id === id}
                  onClick={() => toggleSelected(id)}
                  {...chipProps(id)}
                />
              ))}
              {members.length === 0 && (
                <span className="text-base-content/40 text-xs">
                  Empty group
                </span>
              )}
            </div>
          </GroupShell>
        ))}
        {(unassigned.length > 0 || drag) && (
          <GroupShell
            name={UNASSIGNED}
            subtitle="Not in a group"
            warn
            dropId={UNASSIGNED}
            dropState={dropState(UNASSIGNED)}
          >
            <div className="flex min-h-10 flex-wrap gap-2">
              {unassigned.map((id) => (
                <PlayerChip
                  key={id}
                  label={getName(id)}
                  active={selected === id}
                  dragging={drag?.id === id}
                  onClick={() => toggleSelected(id)}
                  {...chipProps(id)}
                />
              ))}
              {unassigned.length === 0 && (
                <span className="text-base-content/40 text-xs">
                  Drop here to remove from groups
                </span>
              )}
            </div>
          </GroupShell>
        )}
      </div>

      {drag && (
        <div
          aria-hidden
          className="pointer-events-none fixed z-50 flex min-h-10 -translate-x-1/2 -translate-y-[130%] scale-105 items-center gap-1 rounded-xl border-2 border-[#712BB2] bg-[#712BB2] px-3 text-sm font-medium whitespace-nowrap text-white shadow-[0_12px_32px_rgba(113,43,178,0.45)]"
          style={{ left: drag.x, top: drag.y }}
        >
          <span className="icon-[mdi--drag] text-base" />
          {getName(drag.id)}
        </div>
      )}

      {selected && (
        <div className="bg-base-100/95 border-base-300 sticky bottom-0 z-[1] -mx-4 flex flex-wrap items-center gap-2 border-t px-4 py-3 backdrop-blur md:mx-0 md:rounded-xl md:border">
          <span className="text-sm">
            Move <b>{getName(selected)}</b> to
          </span>
          {Object.keys(draft).map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => moveSelected(name)}
              disabled={draft[name]!.includes(selected)}
              className="h-10 min-w-10 rounded-xl bg-[#712BB2] px-3 text-sm font-semibold text-white disabled:opacity-30"
            >
              {name}
            </button>
          ))}
          <button
            type="button"
            onClick={() => edit({ ...draft, [groupName(groupCount)]: [] })}
            className="h-10 rounded-xl border border-[#712BB2] px-3 text-sm text-[#712BB2]"
          >
            + New group
          </button>
        </div>
      )}

      {tooSmall && (
        <p className="text-warning text-xs">
          Every group needs at least 2 players.
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          disabled={busy}
          onClick={() => run("save")}
          className="border-base-content/20 h-12 rounded-xl border px-6 text-sm font-medium disabled:opacity-40"
        >
          Save draft
        </button>
        <button
          type="button"
          disabled={busy || !canLock}
          onClick={() => run("lock")}
          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#712BB2] px-6 text-sm font-medium text-white disabled:opacity-40"
        >
          {busy ? (
            <span className="loading loading-spinner loading-sm" />
          ) : (
            <>
              <span className="icon-[mdi--lock]" />
              Lock groups & start
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ── stage 2: round robin inside groups ───────────────────────

function GroupStage({
  players,
  tourId,
  groups,
  qualStarted,
  validationGames,
  isAdmin,
  getName,
  onChanged,
}: {
  players: Player[];
  tourId: string;
  groups: Groups;
  qualStarted: boolean;
  validationGames: GameData[];
  isAdmin: boolean;
  getName: (id: string) => string;
  onChanged: () => Promise<void>;
}) {
  const { showError, showConfirm } = useToast();
  const [scoring, setScoring] = useState<Scoring | null>(null);
  const [busy, setBusy] = useState(false);

  const { mutateAsync: fixGame } = $tabletennis.useMutation(
    "post",
    "/fix-game",
    { onError: (e) => showError("Error", formatApiErrorMessage(e)) },
  );
  const { mutateAsync: cancelGame } = $tabletennis.useMutation(
    "post",
    "/cancel-game",
    { onError: (e) => showError("Error", formatApiErrorMessage(e)) },
  );

  const { mutateAsync: createGame } = $tabletennis.useMutation(
    "post",
    "/reg-game",
    {
      onError: (e) => showError("Error", formatApiErrorMessage(e)),
    },
  );
  const { mutateAsync: finishGame } = $tabletennis.useMutation(
    "post",
    "/finish-game",
    {
      onError: (e) => showError("Error", formatApiErrorMessage(e)),
    },
  );
  const { mutateAsync: unlockGroups } = $tabletennis.useMutation(
    "post",
    "/reg-tour/unlock-groups",
    { onError: (e) => showError("Error", formatApiErrorMessage(e)) },
  );

  const totalGames = Object.values(groups).reduce(
    (s, m) => s + groupGamesTotal(m.length),
    0,
  );
  const finishedCount = validationGames.filter((g) => g.finished).length;
  const leftCount = Math.max(0, totalGames - finishedCount);
  const canPlay = isAdmin && !qualStarted;
  const suggestions = useMemo(
    () =>
      canPlay
        ? suggestNextMatches(
            groups,
            validationGames,
            Object.keys(groups).length,
          )
        : [],
    [canPlay, groups, validationGames],
  );

  async function startMatch(p1: string, p2: string) {
    setBusy(true);
    try {
      const res = await createGame({
        params: {
          query: {
            tour_id: tourId,
            tip: tabletennisTypes.PathsRegGamePostParametersQueryTip.val,
            player1_id: p1,
            player2_id: p2,
          },
        },
      });
      await onChanged();
      const gameId = (res as { game_id?: string }).game_id;
      if (gameId) setScoring({ game_id: gameId, p1, p2, mode: "finish" });
    } catch {
      // toast shown by onError; another admin may have started this pair, resync
      await onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function submitScore(s1: number, s2: number) {
    if (!scoring) return;
    const query = { game_id: scoring.game_id, s1, s2, tour_id: tourId };
    try {
      if (scoring.mode === "fix") await fixGame({ params: { query } });
      else await finishGame({ params: { query } });
    } finally {
      await onChanged();
    }
  }

  async function cancelScoring() {
    if (!scoring) return;
    const ok = await showConfirm({
      title: "Cancel match",
      message: `Delete the match ${getName(scoring.p1)} vs ${getName(scoring.p2)}? No rating changes.`,
      confirmText: "Delete",
      cancelText: "Keep",
      type: "warning",
    });
    if (!ok) throw new Error("kept");
    try {
      await cancelGame({
        params: { query: { game_id: scoring.game_id, tour_id: tourId } },
      });
    } finally {
      await onChanged();
    }
  }

  async function unlock() {
    setBusy(true);
    try {
      await unlockGroups({ params: { query: { tour_id: tourId } } });
      await onChanged();
    } catch {
      // toast shown by onError
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-5 md:px-7">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-light">Group stage</h2>
          <p className="text-base-content/50 text-xs">
            {finishedCount} of {totalGames} games played · {leftCount} left ·{" "}
            {players.length} players
          </p>
        </div>
        {isAdmin && validationGames.length === 0 && (
          <button
            type="button"
            disabled={busy}
            onClick={unlock}
            className="border-base-content/20 text-base-content/70 flex h-10 items-center gap-1 rounded-xl border px-3 text-xs"
          >
            <span className="icon-[mdi--lock-open-variant-outline]" />
            Edit groups
          </button>
        )}
      </div>
      <div className="bg-base-300 h-1.5 overflow-hidden rounded-full">
        <div
          className="h-full rounded-full bg-[#712BB2] transition-all"
          style={{
            width: `${totalGames ? (finishedCount / totalGames) * 100 : 0}%`,
          }}
        />
      </div>

      {qualStarted && (
        <p className="bg-base-200 rounded-xl px-4 py-3 text-xs">
          Qualification has started, the group stage is closed.
        </p>
      )}

      {suggestions.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <span className="icon-[mdi--lightbulb-on-outline] text-lg text-[#712BB2]" />
            Suggested next
          </h3>
          <div className="-mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
            {suggestions.map((s) => (
              <div
                key={`${s.group}-${s.p1}-${s.p2}`}
                className="bg-base-100 flex w-64 shrink-0 snap-start flex-col gap-2 rounded-2xl border border-[#712BB2] p-3 shadow-[0_0_0_3px_rgba(113,43,178,0.12)]"
              >
                <div className="flex items-center gap-2 text-xs">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#712BB2] font-bold text-white">
                    {s.group}
                  </span>
                  <span className="text-base-content/60">
                    {s.remaining} game{s.remaining === 1 ? "" : "s"} not started
                  </span>
                </div>
                <p className="truncate text-sm font-medium">
                  {getName(s.p1)}{" "}
                  <span className="text-base-content/40">vs</span>{" "}
                  {getName(s.p2)}
                </p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => startMatch(s.p1, s.p2)}
                  className="flex h-10 items-center justify-center gap-1 rounded-xl bg-[#712BB2] text-sm font-medium text-white disabled:opacity-40"
                >
                  <span className="icon-[mdi--play]" />
                  Start
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {Object.entries(groups).map(([name, members]) => (
          <GroupCard
            key={name}
            name={name}
            members={members}
            games={validationGames}
            getName={getName}
            canPlay={canPlay}
            busy={busy}
            suggestion={suggestions.find((s) => s.group === name)}
            onStart={startMatch}
            onOpenGame={setScoring}
          />
        ))}
      </div>

      <ScoreSheet
        open={!!scoring}
        onOpenChange={(v) => !v && setScoring(null)}
        title={scoring?.mode === "fix" ? "Correct score" : "Group match"}
        player1={scoring ? getName(scoring.p1) : ""}
        player2={scoring ? getName(scoring.p2) : ""}
        onSubmit={submitScore}
        initial={scoring?.initial}
        submitLabel={
          scoring?.mode === "fix" ? "Save correction" : "Finish match"
        }
        note={
          scoring?.mode === "fix"
            ? "The old result's rating change is rolled back and recalculated."
            : undefined
        }
        secondaryAction={
          scoring?.mode === "finish"
            ? { label: "Cancel this match", onClick: cancelScoring }
            : undefined
        }
      />
    </div>
  );
}

function GroupCard({
  name,
  members,
  games,
  getName,
  canPlay,
  busy,
  suggestion,
  onStart,
  onOpenGame,
}: {
  name: string;
  members: string[];
  games: GameData[];
  getName: (id: string) => string;
  canPlay: boolean;
  busy: boolean;
  suggestion?: MatchSuggestion;
  onStart: (p1: string, p2: string) => void;
  onOpenGame: (g: Scoring) => void;
}) {
  const [open, setOpen] = useState(true);
  const [picked, setPicked] = useState<string[]>([]);

  const memberSet = useMemo(() => new Set(members), [members]);
  const groupGames = useMemo(
    () =>
      games.filter(
        (g) =>
          memberSet.has(g.player1.innohassle_id) &&
          memberSet.has(g.player2.innohassle_id),
      ),
    [games, memberSet],
  );
  const names = useMemo(
    () => new Map(members.map((id) => [id, getName(id)])),
    [members, getName],
  );
  const standings = useMemo(
    () => groupStandings(name, members, groupGames, names),
    [name, members, groupGames, names],
  );

  const results = new Map<string, GameData>();
  const busyPlayers = new Set<string>();
  const openGames: OpenGame[] = [];
  for (const g of groupGames) {
    const p1 = g.player1.innohassle_id;
    const p2 = g.player2.innohassle_id;
    if (g.finished) results.set(pairKey(p1, p2), g);
    else {
      busyPlayers.add(p1);
      busyPlayers.add(p2);
      openGames.push({ game_id: g.game_id, p1, p2 });
    }
  }
  const openPairs = new Set(openGames.map((g) => pairKey(g.p1, g.p2)));

  const total = groupGamesTotal(members.length);
  const played = results.size;

  function scoreFor(row: string, col: string) {
    const g = results.get(pairKey(row, col));
    if (!g) return null;
    const rowIsP1 = g.player1.innohassle_id === row;
    const mine = rowIsP1 ? g.player1.score : g.player2.score;
    const theirs = rowIsP1 ? g.player2.score : g.player1.score;
    return { mine, theirs, won: mine > theirs, game: g };
  }

  function toggle(id: string) {
    setPicked((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [id];
      if (
        prev.length === 1 &&
        (results.has(pairKey(prev[0]!, id)) ||
          openPairs.has(pairKey(prev[0]!, id)))
      )
        return prev;
      return [...prev, id];
    });
  }

  return (
    <GroupShell
      name={name}
      subtitle={`${members.length} players · ${played}/${total} played · ${
        total - played === 0 ? "all done" : `${total - played} left`
      }`}
      done={played === total}
      collapsible
      open={open}
      onHeaderClick={() => setOpen((v) => !v)}
    >
      {open && (
        <div className="flex flex-col gap-4">
          <div className="-mx-4 overflow-x-auto px-4">
            <table className="w-full min-w-max border-separate border-spacing-0 text-xs">
              <thead>
                <tr className="text-base-content/50">
                  <th className="bg-base-100 sticky left-0 z-[1] py-1.5 pr-2 text-left font-medium">
                    #
                  </th>
                  <th className="bg-base-100 sticky left-6 z-[1] py-1.5 pr-3 text-left font-medium">
                    Player
                  </th>
                  <th className="w-9 py-1.5 text-center font-semibold text-[#712BB2]">
                    Pts
                  </th>
                  <th className="w-11 py-1.5 pr-1 text-center font-medium">
                    Sets
                  </th>
                  {standings.map((s) => (
                    <th
                      key={s.id}
                      className="w-10 py-1.5 text-center font-medium"
                    >
                      {s.place}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {standings.map((row) => (
                  <tr key={row.id}>
                    <td className="bg-base-100 border-base-300 sticky left-0 z-[1] w-6 border-t py-2 pr-2 font-semibold tabular-nums">
                      {row.place}
                    </td>
                    <td className="bg-base-100 border-base-300 sticky left-6 z-[1] max-w-[6.5rem] truncate border-t py-2 pr-3 font-medium">
                      {getName(row.id)}
                    </td>
                    <td className="border-base-300 border-t py-2 text-center text-sm font-semibold tabular-nums">
                      {row.points}
                    </td>
                    <td className="border-base-300 text-base-content/70 border-t py-2 pr-1 text-center tabular-nums">
                      {row.setsWon}:{row.setsLost}
                    </td>
                    {standings.map((col) => {
                      if (col.id === row.id) {
                        return (
                          <td
                            key={col.id}
                            className="border-base-300 border-t p-0.5"
                          >
                            <div className="bg-base-300 h-7 rounded-md bg-[repeating-linear-gradient(135deg,transparent_0_4px,rgba(113,43,178,0.25)_4px_5px)]" />
                          </td>
                        );
                      }
                      const sc = scoreFor(row.id, col.id);
                      const live = openPairs.has(pairKey(row.id, col.id));
                      return (
                        <td
                          key={col.id}
                          className="border-base-300 border-t p-0.5"
                        >
                          <button
                            type="button"
                            disabled={!sc || !canPlay}
                            aria-label={sc ? "Correct this score" : undefined}
                            onClick={() =>
                              sc &&
                              onOpenGame({
                                game_id: sc.game.game_id,
                                p1: sc.game.player1.innohassle_id,
                                p2: sc.game.player2.innohassle_id,
                                mode: "fix",
                                initial: [
                                  sc.game.player1.score,
                                  sc.game.player2.score,
                                ],
                              })
                            }
                            className={cn(
                              "flex h-7 w-full items-center justify-center rounded-md tabular-nums disabled:cursor-default",
                              sc && canPlay && "active:scale-95",
                              sc?.won &&
                                "bg-[#712BB2] font-semibold text-white",
                              sc &&
                                !sc.won &&
                                "bg-base-200 text-base-content/70",
                              live &&
                                "border border-dashed border-[#712BB2] text-[#712BB2]",
                            )}
                          >
                            {sc
                              ? `${sc.mine}:${sc.theirs}`
                              : live
                                ? "live"
                                : ""}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {openGames.length > 0 && (
            <div className="flex flex-col gap-2">
              {openGames.map((g) => (
                <button
                  key={g.game_id}
                  type="button"
                  disabled={!canPlay}
                  onClick={() => onOpenGame({ ...g, mode: "finish" })}
                  className="flex min-h-12 items-center gap-2 rounded-xl border border-[#712BB2] px-3 py-2 text-left text-sm"
                >
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#712BB2] opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[#712BB2]" />
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    {getName(g.p1)}{" "}
                    <span className="text-base-content/40">vs</span>{" "}
                    {getName(g.p2)}
                  </span>
                  {canPlay && (
                    <span className="shrink-0 text-xs font-medium text-[#712BB2]">
                      Enter score
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {canPlay && played + openGames.length < total && (
            <div className="flex flex-col gap-2">
              <p className="text-base-content/50 text-xs">
                Pick two players for the next match
              </p>
              {suggestion && (
                <button
                  type="button"
                  onClick={() => setPicked([suggestion.p1, suggestion.p2])}
                  className="flex min-h-10 items-center gap-2 rounded-xl border border-dashed border-[#712BB2] px-3 text-left text-xs text-[#712BB2]"
                >
                  <span className="icon-[mdi--lightbulb-on-outline] shrink-0 text-base" />
                  <span className="min-w-0 flex-1 truncate">
                    Suggested: {getName(suggestion.p1)} vs{" "}
                    {getName(suggestion.p2)}
                  </span>
                </button>
              )}
              <div className="flex flex-wrap gap-2">
                {members.map((id) => {
                  const inGame = busyPlayers.has(id);
                  const blocked =
                    picked.length === 1 &&
                    picked[0] !== id &&
                    (results.has(pairKey(picked[0]!, id)) ||
                      openPairs.has(pairKey(picked[0]!, id)));
                  const everyoneDone = members.every(
                    (o) =>
                      o === id ||
                      results.has(pairKey(id, o)) ||
                      openPairs.has(pairKey(id, o)),
                  );
                  return (
                    <PlayerChip
                      key={id}
                      label={getName(id)}
                      active={picked.includes(id)}
                      disabled={inGame || blocked || everyoneDone}
                      hint={inGame ? "playing" : undefined}
                      onClick={() => toggle(id)}
                    />
                  );
                })}
              </div>
              <button
                type="button"
                disabled={picked.length !== 2 || busy}
                onClick={() => {
                  onStart(picked[0]!, picked[1]!);
                  setPicked([]);
                }}
                className="flex h-12 items-center justify-center rounded-xl bg-[#712BB2] text-sm font-medium text-white disabled:opacity-30"
              >
                {busy ? (
                  <span className="loading loading-spinner loading-sm" />
                ) : picked.length === 2 ? (
                  `Start ${getName(picked[0]!)} vs ${getName(picked[1]!)}`
                ) : (
                  "Start match"
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </GroupShell>
  );
}

// ── shared bits ───────────────────────────────────────────────

function GroupShell({
  name,
  subtitle,
  children,
  highlight,
  warn,
  done,
  collapsible,
  open,
  onHeaderClick,
  dropId,
  dropState,
}: React.PropsWithChildren<{
  name: string;
  subtitle: string;
  highlight?: boolean;
  warn?: boolean;
  done?: boolean;
  collapsible?: boolean;
  open?: boolean;
  onHeaderClick?: () => void;
  /** makes the card a drop target for dragged players */
  dropId?: string;
  dropState?: "available" | "over";
}>) {
  return (
    <section
      {...(dropId !== undefined ? { [DROP_ATTR]: dropId } : {})}
      className={cn(
        "bg-base-100 border-base-300 rounded-2xl border p-4 transition-colors",
        highlight && "border-dashed border-[#712BB2]",
        dropState === "available" && "border-dashed border-[#712BB2]/50",
        dropState === "over" &&
          "border-[#712BB2] bg-[#712BB2]/10 ring-2 ring-[#712BB2]/40",
      )}
    >
      <button
        type="button"
        onClick={onHeaderClick}
        disabled={!onHeaderClick}
        className="mb-3 flex w-full items-center gap-3 text-left disabled:cursor-default"
      >
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base font-bold",
            warn
              ? "bg-base-300 text-base-content/60"
              : "bg-[#712BB2] text-white",
          )}
        >
          {name}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">
            {name === "?" ? "Unassigned" : `Group ${name}`}
          </span>
          <span className="text-base-content/50 block text-xs">{subtitle}</span>
        </span>
        {done && (
          <span className="icon-[mdi--check-circle] text-xl text-[#712BB2]" />
        )}
        {highlight && (
          <span className="text-xs font-medium text-[#712BB2]">Move here</span>
        )}
        {dropState === "over" && (
          <span className="text-xs font-medium text-[#712BB2]">Drop here</span>
        )}
        {collapsible && (
          <span
            className={cn(
              "icon-[mdi--chevron-down] text-base-content/50 text-xl transition-transform",
              open && "rotate-180",
            )}
          />
        )}
      </button>
      {children}
    </section>
  );
}

function PlayerChip({
  label,
  active,
  disabled,
  hint,
  dragging,
  onClick,
  onPointerDown,
  onContextMenu,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  hint?: string;
  dragging?: boolean;
  onClick: () => void;
  onPointerDown?: (e: React.PointerEvent<HTMLElement>) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}) {
  const draggable = !!onPointerDown;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      onPointerDown={onPointerDown}
      onContextMenu={onContextMenu}
      className={cn(
        "flex min-h-10 items-center gap-1.5 rounded-xl border-2 px-3 text-sm font-medium transition-colors",
        active
          ? "border-[#712BB2] bg-[#712BB2] text-white"
          : "border-base-300 hover:border-[#712BB2]",
        disabled &&
          "border-base-300 text-base-content/25 hover:border-base-300 cursor-not-allowed",
        draggable &&
          "cursor-grab touch-manipulation select-none [-webkit-touch-callout:none]",
        dragging && "border-dashed opacity-40",
      )}
    >
      {label}
      {hint && <span className="text-[10px] font-normal">· {hint}</span>}
    </button>
  );
}
