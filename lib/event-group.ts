import {
  getUsersGetMeQueryKey,
  useUsersAddFavorite,
  useUsersDeleteFavorite,
  useUsersGetMe,
  useUsersHideFavorite,
} from "@/lib/events";
import { useQueryClient } from "@tanstack/react-query";

export function useEventGroup(group_id?: number) {
  const queryClient = useQueryClient();
  const { data: userData } = useUsersGetMe();

  const onSettled = async () => {
    return await queryClient.invalidateQueries({
      queryKey: getUsersGetMeQueryKey(),
    });
  };

  const add = useUsersAddFavorite({ mutation: { onSettled } });
  const remove = useUsersDeleteFavorite({ mutation: { onSettled } });
  const hide = useUsersHideFavorite({ mutation: { onSettled } });

  const userFavoriteGroup = userData?.favorites?.find(
    (v) => v.group.id === group_id
  );
  const isPredefined = userFavoriteGroup?.predefined ?? false;
  let isInFavorites = !!userFavoriteGroup;
  let isHidden = userFavoriteGroup?.hidden ?? false;
  // Use optimistic updates for mutations
  if (remove.isLoading && remove.variables?.params.group_id === group_id) {
    isInFavorites = false;
  }
  if (add.isLoading && add.variables?.params.group_id === group_id) {
    isInFavorites = true;
  }
  if (hide.isLoading && hide.variables?.params.group_id === group_id) {
    isHidden = hide.variables?.params.hide ?? isHidden;
  }

  const addToFavorites = async () => {
    if (group_id === undefined || isPredefined) return;
    await add.mutate({ params: { group_id: group_id } });
  };

  const removeFromFavorites = async () => {
    if (group_id === undefined || isPredefined) return;
    await remove.mutate({ params: { group_id: group_id } });
  };

  const switchFavorite = async () => {
    if (!isInFavorites) {
      await addToFavorites();
    } else {
      await removeFromFavorites();
    }
  };

  const hideFavorite = async () => {
    if (group_id === undefined) return;
    await hide.mutate({ params: { group_id: group_id, hide: true } });
  };

  const unhideFavorite = async () => {
    if (group_id === undefined) return;
    await hide.mutate({ params: { group_id: group_id, hide: false } });
  };

  const switchHideFavorite = async () => {
    if (!isHidden) {
      await hideFavorite();
    } else {
      await unhideFavorite();
    }
  };

  return {
    group_id,
    isHidden,
    isInFavorites,
    isPredefined,
    addToFavorites,
    removeFromFavorites,
    switchFavorite,
    hideFavorite,
    unhideFavorite,
    switchHideFavorite,
  };
}
