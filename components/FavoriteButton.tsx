import Tooltip from "@/components/Tooltip";
import { useEventGroup } from "@/lib/event-group";
import { useUsersGetMe } from "@/lib/events";
import { useRouter } from "next/navigation";

export default function FavoriteButton({ groupId }: { groupId: number }) {
  const router = useRouter();
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
        className="h-fit rounded-2xl p-2 text-4xl text-icon-main/50 hover:bg-secondary-hover hover:text-icon-hover/75"
      >
        {isPredefined ? (
          <span className="icon-[material-symbols--stars-outline] text-[#F0B132] dark:text-[#F0B132]/70" />
        ) : isInFavorites ? (
          <span className="icon-[material-symbols--star] text-[#F0B132]" />
        ) : (
          <span className="icon-[material-symbols--star-outline]" />
        )}
      </button>
    </Tooltip>
  );
}
