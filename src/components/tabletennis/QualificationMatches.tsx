import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/ui/cn";
import { $tabletennis, tabletennisTypes } from "@/api/tabletennis";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import { useToast } from "@/components/toast";
import { BracketGraph, MatchCard } from "./BracketGraph";
import { ScoreSheet } from "./ScoreSheet";
import {
  type BracketMatch,
  type GameData,
  type Groups,
  type Player,
  bracketSize,
  buildSeeding,
  groupGamesTotal,
  ordinal,
  resolveBracket,
  roundLabel,
  seedOrder,
  standingsToTop,
  topsEqual,
  visibleSections,
} from "./bracket-utils";
import { DROP_ATTR, useGroupDrag } from "./useGroupDrag";

export function QualificationMatches({
  players,
  tourId,
  groups,
  groupsLocked,
  qualSeeding,
  qualTop,
  validationGames,
  qualificationGames,
  isAdmin,
  onChanged,
}: {
  players: Player[];
  tourId: string;
  groups: Groups;
  groupsLocked: boolean;
  qualSeeding: string[];
  qualTop: Record<string, string>;
  validationGames: GameData[];
  qualificationGames: GameData[];
  isAdmin: boolean;
  onChanged: () => Promise<void>;
}) {
  const names = useMemo(
    () => new Map(players.map((p) => [p.id, p.name])),
    [players],
  );
  const getName = (id: string) => names.get(id) ?? "Unknown";

  if (qualSeeding.length === 0) {
    return (
      <SeedingPreview
        players={players}
        tourId={tourId}
        groups={groups}
        groupsLocked={groupsLocked}
        validationGames={validationGames}
        legacyGames={qualificationGames.length > 0}
        isAdmin={isAdmin}
        getName={getName}
        onChanged={onChanged}
      />
    );
  }

  return (
    <Bracket
      tourId={tourId}
      seeding={qualSeeding}
      qualTop={qualTop}
      games={qualificationGames}
      isAdmin={isAdmin}
      getName={getName}
      onChanged={onChanged}
    />
  );
}

// ── before start: seeding from the group stage ────────────────

function SeedingPreview({
  players,
  tourId,
  groups,
  groupsLocked,
  validationGames,
  legacyGames,
  isAdmin,
  getName,
  onChanged,
}: {
  players: Player[];
  tourId: string;
  groups: Groups;
  groupsLocked: boolean;
  validationGames: GameData[];
  legacyGames: boolean;
  isAdmin: boolean;
  getName: (id: string) => string;
  onChanged: () => Promise<void>;
}) {
  const { showError } = useToast();
  const [busy, setBusy] = useState(false);
  const [manualOrder, setManualOrder] = useState<string[] | null>(null);
  const { mutateAsync: setSeeding } = $tabletennis.useMutation(
    "post",
    "/reg-tour/set-qual-seeding",
    { onError: (e) => showError("Error", formatApiErrorMessage(e)) },
  );

  const hasGroups = Object.keys(groups).length > 0;
  const seeding = useMemo(
    () => buildSeeding(players, groups, validationGames),
    [players, groups, validationGames],
  );
  const byId = useMemo(() => new Map(seeding.map((s) => [s.id, s])), [seeding]);
  const computedOrder = seeding.map((s) => s.id);
  // a manual order is kept while it still covers exactly the same players
  const order =
    manualOrder &&
    manualOrder.length === computedOrder.length &&
    manualOrder.every((id) => byId.has(id))
      ? manualOrder
      : computedOrder;
  const edited = order.join() !== computedOrder.join();

  function moveSeed(id: string, toIndex: number) {
    const from = order.indexOf(id);
    if (from < 0 || from === toIndex) return;
    if (toIndex < 0 || toIndex >= order.length) return;
    const next = [...order];
    next.splice(from, 1);
    next.splice(toIndex, 0, id);
    setManualOrder(next);
  }

  const { drag, chipProps } = useGroupDrag((id, target) =>
    moveSeed(id, Number(target)),
  );

  // first-round opponent of every seed, to warn about same-group pairs after manual edits
  const opponentOf = useMemo(() => {
    const positions = seedOrder(bracketSize(order.length));
    const map = new Map<number, number>();
    for (let i = 0; i < positions.length; i += 2) {
      map.set(positions[i]!, positions[i + 1]!);
      map.set(positions[i + 1]!, positions[i]!);
    }
    return map;
  }, [order.length]);

  const totalGroupGames = Object.values(groups).reduce(
    (s, m) => s + groupGamesTotal(m.length),
    0,
  );
  const finished = validationGames.filter((g) => g.finished).length;
  const unfinished = validationGames.length - finished;
  const missing = Math.max(0, totalGroupGames - finished);
  const blocked =
    (hasGroups && !groupsLocked) ||
    unfinished > 0 ||
    legacyGames ||
    seeding.length < 2;

  async function start() {
    setBusy(true);
    try {
      await setSeeding({
        params: { query: { tour_id: tourId } },
        body: order,
      });
      await onChanged();
    } catch {
      // toast shown by onError
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-5 md:px-7">
      <div>
        <h2 className="text-xl font-light">Qualification seeding</h2>
        <p className="text-base-content/50 mt-0.5 text-xs">
          Everyone plays. Group winners are seeded first, then second places and
          so on. 1st seed meets the last one, players from the same group are
          kept apart in the first round.
          {isAdmin &&
            " Hold the handle and drag, or use the arrows, to change the order by hand."}
        </p>
      </div>

      {hasGroups && !groupsLocked && (
        <Notice>Lock the groups on the Validation tab first.</Notice>
      )}
      {legacyGames && (
        <Notice>
          This tournament already has games in the old bracket format.
        </Notice>
      )}
      {unfinished > 0 && (
        <Notice>
          {unfinished} group match{unfinished === 1 ? " is" : "es are"} still in
          progress.
        </Notice>
      )}
      {unfinished === 0 && missing > 0 && groupsLocked && (
        <Notice soft>
          {missing} group game{missing === 1 ? " was" : "s were"} not played.
          You can still start.
        </Notice>
      )}

      <ol className="bg-base-100 border-base-300 flex flex-col overflow-hidden rounded-2xl border">
        {order.map((id, index) => {
          const s = byId.get(id)!;
          const seed = index + 1;
          const oppSeed = opponentOf.get(seed);
          const opp =
            oppSeed && oppSeed <= order.length
              ? byId.get(order[oppSeed - 1]!)
              : undefined;
          const sameGroup = !!opp && s.group !== null && opp.group === s.group;
          const isOver = drag?.over === String(index) && drag.id !== id;
          return (
            <li
              key={id}
              {...{ [DROP_ATTR]: String(index) }}
              className={cn(
                "border-base-300 flex min-h-14 items-center gap-2 border-t px-3 py-2 transition-colors first:border-t-0",
                drag?.id === id && "opacity-40",
                isOver && "bg-[#712BB2]/10 shadow-[inset_0_3px_0_#712BB2]",
              )}
            >
              {isAdmin && (
                <button
                  type="button"
                  aria-label={`Drag ${getName(id)}`}
                  {...chipProps(id)}
                  className="text-base-content/40 flex h-10 w-7 shrink-0 cursor-grab touch-manipulation items-center justify-center select-none [-webkit-touch-callout:none]"
                >
                  <span className="icon-[mdi--drag] text-xl" />
                </button>
              )}
              <span className="w-6 shrink-0 text-sm font-semibold text-[#712BB2] tabular-nums">
                {seed}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {getName(id)}
                </span>
                <span className="text-base-content/50 block text-[11px] tabular-nums">
                  {s.points} pts · sets {s.setsWon}:{s.setsLost}
                  {sameGroup && (
                    <span className="text-[#712BB2]">
                      {" "}
                      · same group as #{oppSeed} in round 1
                    </span>
                  )}
                </span>
              </span>
              {s.group !== null && s.groupPlace !== null && (
                <span className="bg-base-200 shrink-0 rounded-lg px-2 py-0.5 text-[11px] font-medium tabular-nums">
                  {s.group}
                  {s.groupPlace}
                </span>
              )}
              {isAdmin && (
                <span className="flex shrink-0 flex-col">
                  <button
                    type="button"
                    aria-label={`Move ${getName(id)} up`}
                    disabled={index === 0}
                    onClick={() => moveSeed(id, index - 1)}
                    className="flex h-6 w-8 items-center justify-center disabled:opacity-20"
                  >
                    <span className="icon-[mdi--chevron-up] text-lg" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Move ${getName(id)} down`}
                    disabled={index === order.length - 1}
                    onClick={() => moveSeed(id, index + 1)}
                    className="flex h-6 w-8 items-center justify-center disabled:opacity-20"
                  >
                    <span className="icon-[mdi--chevron-down] text-lg" />
                  </button>
                </span>
              )}
            </li>
          );
        })}
      </ol>

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

      {isAdmin && edited && (
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="text-base-content/60">
            The order was changed by hand.
          </span>
          <button
            type="button"
            onClick={() => setManualOrder(null)}
            className="h-9 rounded-xl px-2 font-medium text-[#712BB2]"
          >
            Reset to results
          </button>
        </div>
      )}

      {isAdmin ? (
        <button
          type="button"
          disabled={blocked || busy}
          onClick={start}
          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#712BB2] text-sm font-medium text-white disabled:opacity-30 sm:self-end sm:px-8"
        >
          {busy ? (
            <span className="loading loading-spinner loading-sm" />
          ) : (
            <>
              <span className="icon-[mdi--tournament]" />
              Start qualification
            </>
          )}
        </button>
      ) : (
        <p className="text-base-content/50 text-center text-sm">
          The bracket appears when the organiser starts qualification.
        </p>
      )}
    </div>
  );
}

// ── bracket ──────────────────────────────────────────────────

function sectionLabel(s: { labelFrom: number; labelTo: number }) {
  if (s.labelTo - s.labelFrom === 1) return `${ordinal(s.labelFrom)} place`;
  return `Places ${s.labelFrom}–${s.labelTo}`;
}

function Bracket({
  tourId,
  seeding,
  qualTop,
  games,
  isAdmin,
  getName,
  onChanged,
}: {
  tourId: string;
  seeding: string[];
  qualTop: Record<string, string>;
  games: GameData[];
  isAdmin: boolean;
  getName: (id: string) => string;
  onChanged: () => Promise<void>;
}) {
  const { showError } = useToast();
  const [scoring, setScoring] = useState<BracketMatch | null>(null);

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
  const { mutateAsync: changeQualTop } = $tabletennis.useMutation(
    "post",
    "/reg-tour/change-qual-top",
    { onError: (e) => showError("Error", formatApiErrorMessage(e)) },
  );
  const { mutateAsync: fixGame } = $tabletennis.useMutation(
    "post",
    "/fix-game",
    { onError: (e) => showError("Error", formatApiErrorMessage(e)) },
  );

  const bracket = useMemo(
    () => resolveBracket(seeding, games),
    [seeding, games],
  );
  const sections = useMemo(
    () => visibleSections(bracket, seeding.length),
    [bracket, seeding.length],
  );
  const [sectionId, setSectionId] = useState<string | null>(null);
  const section = sections.find((s) => s.id === sectionId) ?? sections[0];

  const roundHasByes = (ids: string[]) =>
    ids.some((id) => bracket.matches.get(id)!.status === "bye");

  /** a later match fed by this one has already been started or played */
  function nextMatchStarted(m: BracketMatch) {
    for (const other of bracket.matches.values()) {
      const fed = other.sources.some(
        (s) => s.kind !== "seed" && s.matchId === m.id,
      );
      if (fed && (other.status === "done" || other.game_id)) return true;
    }
    return false;
  }

  const ready = useMemo(
    () =>
      sections.flatMap((s) =>
        s.matchIds.flatMap((ids, round) =>
          ids
            .map((id) => bracket.matches.get(id)!)
            .filter((m) => m.status === "ready")
            .map((m) => ({
              match: m,
              label: `${roundLabel(
                s,
                round,
                ids.some((id) => bracket.matches.get(id)!.status === "bye"),
              )} · ${sectionLabel(s)}`,
            })),
        ),
      ),
    [sections, bracket],
  );

  const placeById = new Map(bracket.places.map((p) => [p.place, p.id]));

  // save every decided place right away, so a tournament ended early keeps them
  const syncedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isAdmin || bracket.places.length === 0) return;
    const top = standingsToTop(bracket.places);
    if (topsEqual(top, qualTop)) return;
    const key = JSON.stringify(top);
    if (syncedRef.current === key) return;
    syncedRef.current = key;
    changeQualTop({ params: { query: { tour_id: tourId } }, body: top })
      .then(() => onChanged())
      .catch(() => {
        syncedRef.current = null;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bracket, qualTop, isAdmin, tourId]);

  async function submitScore(s1: number, s2: number) {
    const m = scoring;
    if (!m || m.side1.kind !== "player" || m.side2.kind !== "player") return;
    let gameId = m.game_id;
    let swapped = false;
    try {
      if (gameId) {
        const existing = games.find((g) => g.game_id === gameId);
        swapped = existing?.player1.innohassle_id !== m.side1.id;
      } else {
        const res = await createGame({
          params: {
            query: {
              tour_id: tourId,
              tip: tabletennisTypes.PathsRegGamePostParametersQueryTip.cval,
              player1_id: m.side1.id,
              player2_id: m.side2.id,
            },
          },
        });
        gameId = (res as { game_id?: string }).game_id;
        if (!gameId) throw new Error("No game id");
      }
      const query = {
        game_id: gameId,
        s1: swapped ? s2 : s1,
        s2: swapped ? s1 : s2,
        tour_id: tourId,
      };
      if (m.status === "done") await fixGame({ params: { query } });
      else await finishGame({ params: { query } });
    } finally {
      // always resync: on a conflict another admin has already changed this match
      await onChanged();
    }
  }

  const onSelect = isAdmin ? setScoring : undefined;
  const doneCount = [...bracket.matches.values()].filter(
    (m) => m.status === "done",
  ).length;
  const realCount = [...bracket.matches.values()].filter(
    (m) => m.status !== "bye",
  ).length;

  return (
    <div className="flex flex-col gap-5 px-4 py-5 md:px-7">
      <div>
        <h2 className="text-xl font-light">Qualification</h2>
        <p className="text-base-content/50 text-xs">
          {doneCount} of {realCount} matches played · {seeding.length} players
        </p>
      </div>

      {ready.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#712BB2] opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#712BB2]" />
            </span>
            Can be played now
            <span className="text-base-content/40 font-normal">
              {ready.length}
            </span>
          </h3>
          <div className="-mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
            {ready.map(({ match, label }) => (
              <div
                key={match.id}
                className="flex shrink-0 snap-start flex-col gap-1"
              >
                <span className="text-base-content/50 text-[10px] font-medium tracking-wide uppercase">
                  {label}
                </span>
                <MatchCard
                  match={match}
                  getName={getName}
                  onSelect={onSelect}
                />
              </div>
            ))}
          </div>
          {!isAdmin && (
            <p className="text-base-content/40 text-[11px]">
              Scores are entered by the organiser.
            </p>
          )}
        </div>
      )}

      {sections.length > 1 && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
          {sections.map((s) => {
            const hasReady = s.matchIds
              .flat()
              .some((id) => bracket.matches.get(id)!.status === "ready");
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSectionId(s.id)}
                className={cn(
                  "relative h-10 shrink-0 rounded-full border-2 px-4 text-sm font-medium whitespace-nowrap transition-colors",
                  section?.id === s.id
                    ? "border-[#712BB2] bg-[#712BB2] text-white"
                    : "border-base-300 hover:border-[#712BB2]",
                )}
              >
                {sectionLabel(s)}
                {hasReady && section?.id !== s.id && (
                  <span className="absolute top-1 right-1.5 h-2 w-2 rounded-full bg-[#712BB2]" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {section && (
        <div className="bg-base-200/60 border-base-300 rounded-2xl border p-4">
          <BracketGraph
            section={section}
            matches={bracket.matches}
            getName={getName}
            onSelect={onSelect}
          />
        </div>
      )}

      <div>
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <span className="icon-[mdi--trophy-outline] text-lg text-[#712BB2]" />
          Standings
          {bracket.complete && (
            <span className="rounded-full bg-[#712BB2] px-2 py-0.5 text-[10px] font-medium text-white">
              Final
            </span>
          )}
        </h3>
        <ol className="bg-base-100 border-base-300 grid grid-cols-1 overflow-hidden rounded-2xl border sm:grid-cols-2">
          {seeding.map((_, i) => {
            const place = i + 1;
            const id = placeById.get(place);
            return (
              <li
                key={place}
                className="border-base-300 flex min-h-11 items-center gap-3 border-t px-4 py-2 first:border-t-0 sm:[&:nth-child(2)]:border-t-0"
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold tabular-nums",
                    place <= 3 && id
                      ? "bg-[#712BB2] text-white"
                      : "bg-base-200 text-base-content/70",
                  )}
                >
                  {place}
                </span>
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate text-sm",
                    !id && "text-base-content/30",
                  )}
                >
                  {id ? getName(id) : "—"}
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      <ScoreSheet
        open={!!scoring}
        onOpenChange={(v) => !v && setScoring(null)}
        title={
          scoring
            ? (() => {
                const s = sections.find((x) => x.id === scoring.sectionId);
                const label = s
                  ? `${roundLabel(s, scoring.round, roundHasByes(s.matchIds[scoring.round] ?? []))} · ${sectionLabel(s)}`
                  : "Match";
                return scoring.status === "done"
                  ? `Correct score · ${label}`
                  : label;
              })()
            : ""
        }
        player1={
          scoring?.side1.kind === "player" ? getName(scoring.side1.id) : ""
        }
        player2={
          scoring?.side2.kind === "player" ? getName(scoring.side2.id) : ""
        }
        onSubmit={submitScore}
        initial={
          scoring?.status === "done"
            ? [scoring.score1, scoring.score2]
            : undefined
        }
        submitLabel={
          scoring?.status === "done" ? "Save correction" : "Finish match"
        }
        note={
          scoring?.status === "done"
            ? nextMatchStarted(scoring)
              ? "The next match already started, so only the score can change, not the winner."
              : "The old result's rating change is rolled back and recalculated."
            : undefined
        }
        validate={(s1, s2) =>
          scoring?.status === "done" &&
          nextMatchStarted(scoring) &&
          s1 > s2 !== scoring.score1 > scoring.score2
            ? "Winner can't change now"
            : null
        }
      />
    </div>
  );
}

function Notice({
  children,
  soft,
}: React.PropsWithChildren<{ soft?: boolean }>) {
  return (
    <p
      className={cn(
        "flex items-start gap-2 rounded-xl px-4 py-3 text-xs",
        soft ? "bg-base-200" : "border border-[#712BB2]/40 bg-[#712BB2]/10",
      )}
    >
      <span className="icon-[mdi--information-outline] mt-px shrink-0 text-base text-[#712BB2]" />
      <span>{children}</span>
    </p>
  );
}
