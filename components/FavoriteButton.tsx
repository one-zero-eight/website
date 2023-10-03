import FavoriteIcon from "@/components/icons/FavoriteIcon";
import { PredefinedIcon } from "@/components/icons/PredefinedIcon";
import Tooltip from "@/components/Tooltip";
import { useEventGroup } from "@/lib/event-group";
import { useUsersGetMe } from "@/lib/events";
import { useRouter } from "next/navigation";
import { useWindowSize } from "usehooks-ts";

export default function FavoriteButton({ groupId }: { groupId: number }) {
  const router = useRouter();
  const { width } = useWindowSize();
  const { switchFavorite, isInFavorites, isPredefined } =
    useEventGroup(groupId);
  const { data: user, isError } = useUsersGetMe();

  return (
    <Tooltip
      content={
        isPredefined
          ? "Your group from official lists"
          : isInFavorites
          ? "In favorites"
          : "Add to favorites"
      }
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (isError || !user) {
            router.push("/account/sign-in");
          } else {
            switchFavorite && switchFavorite();
          }
        }}
        className={`rounded-2xl p-2 hover:bg-secondary-hover hover:fill-icon-hover/75 ${
          isInFavorites ? "fill-[#F0B132]" : "fill-icon-main/5"
        }`}
      >
        {isPredefined ? (
          <PredefinedIcon
            width={width >= 640 ? 40 : 36}
            height={width >= 640 ? 40 : 36}
          />
        ) : (
          <FavoriteIcon
            active={isInFavorites}
            width={width >= 640 ? 40 : 36}
            height={width >= 640 ? 40 : 36}
          />
        )}
      </button>
    </Tooltip>
  );
}
