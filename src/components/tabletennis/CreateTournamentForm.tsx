import { useState } from "react";
import { Trans, useLingui } from "@lingui/react/macro";
import { msg } from "@lingui/core/macro";
import { $tabletennis } from "@/api/tabletennis";
import {
  formatApiErrorDescriptor,
  isApiHttpError,
} from "@/api/helpers/create-query-client";
import { useToast } from "@/components/toast";
import {
  type PlayerOption,
  PlayersField,
  failedPlayersOf,
  usePlayersField,
} from "./PlayersField";

/** "2026-10-09" in the viewer's time zone, the value format of <input type="date"> */
function todayInputValue(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function CreateTournamentForm({
  options,
  onCreated,
  onCancel,
}: {
  options: PlayerOption[];
  onCreated: (tourId: string) => void;
  onCancel: () => void;
}) {
  const { t } = useLingui();
  const [name, setName] = useState("");
  const [tourDate, setTourDate] = useState("");
  const field = usePlayersField(options);
  const { showError } = useToast();

  const { mutate: createTour, isPending: creating } = $tabletennis.useMutation(
    "post",
    "/reg-tour",
    {
      onSuccess: (data) =>
        onCreated((data as { tournament_id: string }).tournament_id),
      onError: (error) => {
        const failed = failedPlayersOf(error);
        if (failed) {
          field.applyFailed(failed);
          showError(
            msg`Tournament not created`,
            msg`Some players were not found, see the list below`,
          );
        } else if (isApiHttpError(error) && error.httpCode === 403) {
          showError(
            msg`Access denied`,
            msg`Only administrators can create tournaments`,
          );
        } else {
          showError(msg`Error`, formatApiErrorDescriptor(error));
        }
      },
    },
  );

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || field.count < 2) return;
    const body = field.prepare();
    if (!body) return;
    // without a date (or with today's) the backend stamps the current time; a past date is
    // only shown in the archive, the rating is still counted in the order games are played
    const date =
      tourDate && tourDate !== todayInputValue()
        ? `${tourDate}T12:00:00Z`
        : undefined;
    createTour({
      params: { query: { name: name.trim(), date } },
      body,
    });
  }

  return (
    <div className="flex items-center justify-center px-4 py-10 md:py-16">
      <form
        onSubmit={handleCreate}
        className="bg-base-200 w-full max-w-md rounded-lg p-5 md:p-8"
      >
        <h2 className="mb-6 text-2xl font-light">
          <Trans>Create tournament</Trans>
        </h2>
        <div className="flex flex-col gap-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t`Tournament name`}
            className="input input-bordered w-full"
            maxLength={100}
            required
          />
          <label className="flex flex-col gap-1">
            <span className="text-base-content/70 text-sm">
              <Trans>
                Date{" "}
                <span className="text-base-content/40">
                  (optional, today if empty)
                </span>
              </Trans>
            </span>
            <input
              type="date"
              value={tourDate}
              onChange={(e) => setTourDate(e.target.value)}
              className="input input-bordered h-12 w-full"
            />
          </label>
          <PlayersField field={field} options={options} multiline />
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-ghost" onClick={onCancel}>
              <Trans>Cancel</Trans>
            </button>
            <button
              type="submit"
              className="rounded-xl border-2 border-[#712BB2] bg-[#712BB2] px-6 py-2 text-sm font-medium text-white transition-all duration-150 hover:outline hover:outline-2 hover:outline-[#712BB2]/50 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={creating || !name.trim() || field.count < 2}
            >
              {creating ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                <Trans>Create</Trans>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
