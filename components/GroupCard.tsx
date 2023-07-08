import DownloadIcon from "@/components/icons/DownloadIcon";
import FavoriteIcon from "@/components/icons/FavoriteIcon";
import { useEventGroup } from "@/lib/event-group";
import { ViewEventGroupSatellite } from "@/lib/events";

export type GroupCardProps = {
  name: string;
  group_id?: number;
  onImportClick?: () => void;
  canHide?: boolean;
  satellite?: ViewEventGroupSatellite;
  displaySatellite?: string[];
};

export function GroupCard({
  name,
  group_id,
  onImportClick,
  canHide = false,
  satellite,
  displaySatellite,
}: GroupCardProps) {
  const { switchFavorite, isInFavorites, isHidden, switchHideFavorite } =
    useEventGroup(group_id);
  return (
    <div className="bg-primary-main hover:bg-primary-hover flex flex-row justify-between items-center sm:text-2xl px-7 py-5 my-2 rounded-3xl min-w-fit min-h-fit">
      <div className="flex flex-col gap-0.5">
        <p className="text-text-main text-left text-xl font-medium w-40">
          {name}
        </p>
        {satellite &&
          displaySatellite &&
          displaySatellite.map((v) => (
            <p className="text-xl text-inactive text-left font-medium" key={v}>
              {satellite[v]}
            </p>
          ))}
      </div>
      <div className="flex flex-row gap-2 place-items-center select-none w-fit">
        {canHide && (
          <div
            onClick={switchHideFavorite}
            className="cursor-pointer rounded-full"
          >
            <FavoriteIcon active={isHidden} />
          </div>
        )}
        <div onClick={switchFavorite} className="cursor-pointer rounded-full">
          <FavoriteIcon active={isInFavorites} />
        </div>
        <div onClick={onImportClick} className="cursor-pointer rounded-full">
          <DownloadIcon className="fill-icon-main/50 hover:fill-icon-hover/75" />
        </div>
      </div>
    </div>
  );
}
