import { $clubs } from "@/api/clubs";
import { ClubCard } from "./ClubCard";
import { clubTypesOrder, getClubTypeLabel } from "./utils";

export function ClubsListPage() {
  const { data: clubs, isPending } = $clubs.useQuery("get", "/clubs/");

  if (isPending) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-inactive text-lg">Loading clubs...</div>
      </div>
    );
  }

  if (!clubs || clubs.length === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-inactive text-lg">No clubs found</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex flex-col gap-6">
        {clubTypesOrder.map((type) => (
          <div key={type}>
            <h2 className="text-contrast mb-4 text-xl font-semibold">
              {getClubTypeLabel(type)}
            </h2>
            <div className="flex flex-col gap-6">
              {clubs
                .filter((club) => club.type === type)
                .map((club) => (
                  <ClubCard key={club.id} club={club} />
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
