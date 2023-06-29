import DownloadIcon from "@/components/icons/DownloadIcon";
import FavoriteIcon from "@/components/icons/FavoriteIcon";

export type GroupCardProps = {
  name: string;
  favorite: boolean;
  onFavoriteClick?: () => void;
  onImportClick?: () => void;
  children?: React.ReactNode;
};

export function GroupCard({
  favorite,
  name,
  onFavoriteClick,
  onImportClick,
  children,
}: GroupCardProps) {
  return (
    <div className="bg-background hover:bg-hover_color flex flex-row justify-between items-center sm:text-2xl px-7 py-5 my-2 rounded-3xl min-w-fit min-h-fit">
      <div className="flex flex-col gap-0.5">
        <p className="text-left text-xl font-medium w-56">{name}</p>
        {children}
      </div>
      <div className="flex flex-row gap-2 select-none w-fit">
        <div onClick={onFavoriteClick} className="cursor-pointer rounded-full">
          <FavoriteIcon active={favorite} />
        </div>
        <div onClick={onImportClick} className="cursor-pointer rounded-full">
          <DownloadIcon fill={`rgba(256, 256, 256, 0.75)`} />
        </div>
      </div>
    </div>
  );
}
