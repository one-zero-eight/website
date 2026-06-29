import { ScoreTable } from "./DrawTable";

export function TabletennisPage() {
  return (
    <>
      <div>
        <ProfileName name="Aydar Gaifullin" />
        <div>
          <InfoTiles />
        </div>
      </div>
    </>
  );
}

function ProfileName({ name }: { name: string }) {
  return (
    <>
      <div>
        <h1 className="text-base-content font-regular my-5 px-7 text-2xl md:text-3xl">
          {name}
        </h1>
      </div>
    </>
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
    <>
      <div className="my-2 flex justify-between">
        <div>{discription}</div>
        <div>{info}</div>
      </div>
      <Line />
    </>
  );
}

function Line() {
  return (
    <>
      <div className="my-4 flex justify-center">
        <div className="h-[1px] w-[100%] bg-[#712BB2]" />
      </div>
    </>
  );
}

function PlateTemplate({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="bg-base-200 rounded-lg px-10 py-7">{children}</div>
    </>
  );
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
    <>
      <PlateTemplate>
        <div>
          <InfoPlate discription="Status" info={status}></InfoPlate>
          <InfoPlate
            discription="Current score"
            info={String(score)}
          ></InfoPlate>
          <InfoPlate discription="Wins" info={String(winGames)}></InfoPlate>
          <InfoPlate
            discription="Loses"
            info={String(totalGames - winGames)}
          ></InfoPlate>
          <InfoPlate
            discription="Win rate"
            info={String(winGames / totalGames)}
          ></InfoPlate>
          <InfoPlate discription="Place" info={String(place)}></InfoPlate>
        </div>
      </PlateTemplate>
    </>
  );
}

function InfoTiles() {
  return (
    <div className="mx-5 columns-1 gap-4 md:columns-2">
      <div className="mb-4 break-inside-avoid">
        <ProfileInfo
          status="Beginner"
          score={100}
          totalGames={100}
          winGames={50}
          place={1}
        />
      </div>
      <div className="mb-4 break-inside-avoid">
        <ScoreTable></ScoreTable>
      </div>
    </div>
  );
}
