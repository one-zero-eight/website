import { $tabletennis, tabletennisTypes } from "@/api/tabletennis";
import {
  formatApiErrorMessage,
  isApiHttpError,
} from "@/api/helpers/create-query-client";
import { SignInButton } from "@/components/common/SignInButton";
import { Registration } from "./Registration";
import { ScoreTable, type RatingPoint } from "./DrawTable";

type SchemaPlayer = tabletennisTypes.SchemaPlayer;

export function TabletennisPage() {
  const { data, isPending, isError, error, refetch } = $tabletennis.useQuery(
    "get",
    "/get-player",
  );

  if (isPending) return <div className="skeleton h-48 w-full" />;

  if (isError && isApiHttpError(error) && error.httpCode === 401) {
    return (
      <div className="px-4 py-12">
        <h2 className="mb-4 text-3xl font-medium">Sign in to get access</h2>
        <p className="text-base-content/75 mb-4 text-lg">
          Use your Innopolis account to access table tennis features.
        </p>
        <SignInButton />
      </div>
    );
  }

  if (isError && isApiHttpError(error) && error.httpCode === 404) {
    return <Registration onRegistered={() => refetch()} />;
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
  const ratingsData: RatingPoint[] = Object.entries(player.ratings ?? {}).map(
    ([date, score]) => ({ date, score }),
  );

  return (
    <div className="mx-5 grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="mb-4">
        <ProfileInfo
          status={player.status}
          score={player.rating}
          totalGames={totalGames}
          winGames={player.wins}
          place={1}
        />
      </div>
      <div className="mb-4">
        <ScoreTable data={ratingsData} />
      </div>
    </div>
  );
}
