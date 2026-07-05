import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/ui/cn";
import { ValidationMatches } from "./ValidationMatches";
import { QualificationMatches } from "./QualificationMatches";

export function TabletennisTournaments() {
  const [mode, setMode] = useState<"validation" | "qualification">(
    "validation",
  );
  const [tournamentCreated, setTournamentCreated] = useState(false);
  const [tournamentKey, setTournamentKey] = useState(0);
  const [players, setPlayers] = useState([{ name: "", id: "" }]);
  const [validationStats, setValidationStats] = useState<
    { playerId: string; wins: number; played: number }[]
  >([]);

  useEffect(() => {
    setPlayers([
      { name: "Aydar Gaifullin", id: "123" },
      { name: "Lenax Fagamutdinov", id: "100" },
      { name: "Matvey Trifonov", id: "99" },
      { name: "Ivan", id: "101" },
      { name: "Olga", id: "102" },
    ]);
  }, []);

  const handleStatsUpdate = useCallback(
    (stats: { playerId: string; wins: number; played: number }[]) => {
      setValidationStats(stats);
    },
    [],
  );

  function handleCreateTournament() {
    setTournamentCreated(true);
    setTournamentKey((prev) => prev + 1);
  }

  function handleEndTournament() {
    setTournamentCreated(false);
    setMode("validation");
  }

  if (!tournamentCreated) {
    return (
      <div className="flex flex-col items-center gap-6 px-7 py-16 md:py-24">
        <span className="icon-[mdi--trophy-outline] text-6xl text-[#712BB2]/30 md:text-7xl" />
        <div className="max-w-md text-center">
          <h2 className="text-base-content text-2xl font-light">
            Table tennis tournament
          </h2>
          <p className="text-base-content/70 mt-2 text-sm md:text-base">
            Create a new tournament to start managing validation matches and
            qualification brackets.
          </p>
        </div>
        <button
          type="button"
          className="rounded-xl border-2 border-[#712BB2] bg-[#712BB2] px-8 py-3 text-sm font-medium text-white transition-all duration-150 hover:outline hover:outline-2 hover:outline-[#712BB2]/50 md:px-10 md:py-4 md:text-base"
          onClick={handleCreateTournament}
        >
          <span className="icon-[mdi--plus] mr-1.5" />
          Create tournament
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="border-base-300 flex shrink-0 flex-row gap-1 overflow-x-auto border-b px-2 whitespace-nowrap">
        <button
          type="button"
          className={cn(
            "px-3 py-2 text-xs font-medium transition-colors md:text-sm",
            mode === "validation"
              ? "border-b-2 border-b-[#712BB2]"
              : "text-base-content/50 hover:text-base-content",
          )}
          onClick={() => setMode("validation")}
        >
          Validation
        </button>
        <button
          type="button"
          className={cn(
            "px-3 py-2 text-xs font-medium transition-colors md:text-sm",
            mode === "qualification"
              ? "border-b-2 border-b-[#712BB2]"
              : "text-base-content/50 hover:text-base-content",
          )}
          onClick={() => setMode("qualification")}
        >
          Qualification
        </button>
        <div className="ml-auto flex items-center">
          <button
            type="button"
            className="border-base-content/30 text-base-content/50 hover:text-base-content hover:bg-base-content/10 rounded-lg border px-2 py-1 text-[10px] transition-colors md:text-xs"
            onClick={handleEndTournament}
          >
            End tournament
          </button>
        </div>
      </div>

      {mode === "validation" && (
        <ValidationMatches
          key={`validation-${tournamentKey}`}
          players={players}
          onStatsUpdate={handleStatsUpdate}
        />
      )}
      {mode === "qualification" && (
        <QualificationMatches
          key={`qualification-${tournamentKey}`}
          players={players}
          validationStats={validationStats}
        />
      )}
    </div>
  );
}
