import {
  getUsersGetMeQueryKey,
  useUsersAddFavorite,
  useUsersDeleteFavorite,
  useUsersGetMe,
  useUsersHideFavorite,
  ViewEventGroup,
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

  const userFavoriteGroup = userData?.favorites_association?.find(
    (v) => v.event_group.id === group_id,
  );
  const isPredefined = userFavoriteGroup?.predefined ?? false;
  let isInFavorites = !!userFavoriteGroup;
  let isHidden = userFavoriteGroup?.hidden ?? false;
  // Use optimistic updates for mutations
  if (remove.isPending && remove.variables?.params.group_id === group_id) {
    isInFavorites = false;
  }
  if (add.isPending && add.variables?.params.group_id === group_id) {
    isInFavorites = true;
  }
  if (hide.isPending && hide.variables?.params.group_id === group_id) {
    isHidden = hide.variables?.params.hide ?? isHidden;
  }

  const addToFavorites = () => {
    if (group_id === undefined || isPredefined) return;
    add.mutate({ params: { group_id: group_id } });
  };

  const removeFromFavorites = () => {
    if (group_id === undefined || isPredefined) return;
    remove.mutate({ params: { group_id: group_id } });
  };

  const switchFavorite = () => {
    if (!isInFavorites) {
      addToFavorites();
    } else {
      removeFromFavorites();
    }
  };

  const hideFavorite = () => {
    if (group_id === undefined) return;
    hide.mutate({ params: { group_id: group_id, hide: true } });
  };

  const unhideFavorite = () => {
    if (group_id === undefined) return;
    hide.mutate({ params: { group_id: group_id, hide: false } });
  };

  const switchHideFavorite = () => {
    if (!isHidden) {
      hideFavorite();
    } else {
      unhideFavorite();
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

export function getFirstTagByType(
  event_group: ViewEventGroup,
  tag_type: string,
) {
  if (event_group.tags === undefined) return undefined;
  return event_group.tags.find((v) => v.type === tag_type);
}

export function getAllTagsByType(
  event_group: ViewEventGroup,
  tag_type: string,
) {
  if (event_group.tags === undefined) return [];
  return event_group.tags.filter((v) => v.type === tag_type);
}
