import { useState } from "react";
import { $tabletennis, tabletennisTypes } from "@/api/tabletennis";
import {
  formatApiErrorMessage,
  isApiHttpError,
} from "@/api/helpers/create-query-client";
import { useToast } from "@/components/toast";
import { ScoreTable } from "./DrawTable";

type SchemaPlayer = tabletennisTypes.SchemaPlayer;

export function TabletennisPage() {
  const { data, isPending, isError, error, refetch } = $tabletennis.useQuery(
    "get",
    "/get_player",
  );

  if (isPending) return <div className="skeleton h-48 w-full" />;

  if (isError && isApiHttpError(error) && error.httpCode === 404) {
    return <RegisterForm onRegistered={() => refetch()} />;
  }

  if (isError) {
    return (
      <p className="text-error py-8 text-center">
        {formatApiErrorMessage(error)}
      </p>
    );
  }

  const player = data as SchemaPlayer;

  return (
    <div>
      <ProfileName name={player.nickname} />
      <div>
        <InfoTiles player={player} />
      </div>
    </div>
  );
}

function RegisterForm({ onRegistered }: { onRegistered: () => void }) {
  const [nick, setNick] = useState("");
  const { showError } = useToast();
  const { mutate, isPending } = $tabletennis.useMutation("post", "/reg", {
    onSuccess: () => onRegistered(),
    onError: (error) => showError("Error", formatApiErrorMessage(error)),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (nick.trim()) {
      mutate({ params: { query: { nick: nick.trim() } } });
    }
  }

  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="bg-base-200 mx-4 w-full max-w-md rounded-lg p-8">
        <h2 className="mb-4 text-2xl font-semibold">
          Register as Table Tennis Player
        </h2>
        <p className="text-base-content/70 mb-4">
          You need to register with a nickname to use the table tennis features.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="text"
            value={nick}
            onChange={(e) => setNick(e.target.value)}
            placeholder="Enter your nickname"
            className="input input-bordered w-full"
            maxLength={50}
            required
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isPending || !nick.trim()}
          >
            {isPending ? (
              <span className="loading loading-spinner loading-sm" />
            ) : (
              "Register"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

function ProfileName({ name }: { name: string }) {
  return (
    <div>
      <h1 className="text-base-content font-regular my-5 px-7 text-2xl md:text-3xl">
        {name}
      </h1>
    </div>
  );
}

function InfoPlate({
  discription,
  info,
}: {
  discription: string;
  info: string;
}) {
  return (
    <div className="my-2 flex justify-between">
      <div>{discription}</div>
      <div>{info}</div>
    </div>
  );
}

function Line() {
  return (
    <div className="my-4 flex justify-center">
      <div className="h-[1px] w-[100%] bg-[#712BB2]" />
    </div>
  );
}

function PlateTemplate({ children }: { children: React.ReactNode }) {
  return <div className="bg-base-200 rounded-lg px-10 py-7">{children}</div>;
}

function ProfileInfo({
  status,
  score,
  totalGames,
  winGames,
  place,
}: {
  status: string;
  score: number;
  totalGames: number;
  winGames: number;
  place: number;
}) {
  return (
    <PlateTemplate>
      <div>
        <InfoPlate discription="Status" info={status} />
        <Line />
        <InfoPlate discription="Current score" info={String(score)} />
        <Line />
        <InfoPlate discription="Wins" info={String(winGames)} />
        <Line />
        <InfoPlate discription="Loses" info={String(totalGames - winGames)} />
        <Line />
        <InfoPlate
          discription="Win rate"
          info={
            totalGames > 0
              ? `${((winGames / totalGames) * 100).toFixed(1)}%`
              : "0%"
          }
        />
        <Line />
        <InfoPlate discription="Place" info={String(place)} />
      </div>
    </PlateTemplate>
  );
}

function InfoTiles({ player }: { player: SchemaPlayer }) {
  const totalGames = player.wins + player.losses;

  return (
    <div className="mx-5 columns-1 gap-4 md:columns-2">
      <div className="mb-4 break-inside-avoid">
        <ProfileInfo
          status={player.status}
          score={player.rating}
          totalGames={totalGames}
          winGames={player.wins}
          place={1}
        />
      </div>
      <div className="mb-4 break-inside-avoid">
        <ScoreTable />
      </div>
    </div>
  );
}
