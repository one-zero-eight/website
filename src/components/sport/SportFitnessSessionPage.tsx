import { useParams } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import FitnessSessionPage from "./FitnessSessionPage";
import { FitnessTestSessionDetails } from "./services/fitnessTestAPI";

export function SportFitnessSessionPage() {
  const { sessionId } = useParams({
    from: "/_with_menu/sport/fitness-session/$sessionId",
  });
  const [session, setSession] = useState<FitnessTestSessionDetails | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    setLoading(true);
    import("./services/fitnessTestAPI").then(({ fitnessTestAPI }) =>
      fitnessTestAPI
        .getSessionDetails(Number(sessionId))
        .then((session: FitnessTestSessionDetails) => setSession(session))
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false)),
    );
  }, [sessionId]);

  if (loading) {
    return (
      <div
        className="min-h-screen"
        style={{ backgroundColor: "rgb(var(--color-pagebg))" }}
      >
        <main className="mobile-content-bottom-padding px-4 py-8">
          <div className="py-10 text-center">Loading...</div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="min-h-screen"
        style={{ backgroundColor: "rgb(var(--color-pagebg))" }}
      >
        <main className="mobile-content-bottom-padding px-4 py-8">
          <div className="text-error-500 py-10 text-center">{error}</div>
        </main>
      </div>
    );
  }

  if (!session) {
    return (
      <div
        className="min-h-screen"
        style={{ backgroundColor: "rgb(var(--color-pagebg))" }}
      >
        <main className="mobile-content-bottom-padding px-4 py-8">
          <div className="py-10 text-center">Session not found</div>
        </main>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "rgb(var(--color-pagebg))" }}
    >
      <main className="mobile-content-bottom-padding px-4 py-8">
        <FitnessSessionPage session={session} />
      </main>
    </div>
  );
}
