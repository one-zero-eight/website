import DownloadIcon from "@/components/icons/DownloadIcon";
import FavoriteIcon from "@/components/icons/FavoriteIcon";
import { useEventGroup } from "@/lib/event-group";

export type GroupCardProps = {
  name: string;
  group_id?: number;
  onImportClick?: () => void;
  canHide?: boolean;
  children?: React.ReactNode;
};

export function GroupCard({
  name,
  group_id,
  onImportClick,
  canHide = false,
  children,
}: GroupCardProps) {
  const { switchFavorite, isInFavorites, isHidden, switchHideFavorite } =
    useEventGroup(group_id);
  return (
    <div className="bg-light_primary dark:bg-primary dark:hover:bg-primary_hover flex flex-row justify-between items-center sm:text-2xl px-7 py-5 my-2 rounded-3xl min-w-fit min-h-fit">
      <div className="flex flex-col gap-0.5">
        <p className="text-light_text dark:text-text text-left text-xl font-medium w-40">
          {name}
        </p>
        {children}
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
          <DownloadIcon className="fill-light_icon hover:fill-light_icon_hover dark:fill-icon dark:hover:fill-icon_hover" />
        </div>
      </div>
    </div>
  );
}
