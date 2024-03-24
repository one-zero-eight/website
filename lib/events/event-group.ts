import { events } from "@/lib/events/index";
import { useQueryClient } from "@tanstack/react-query";

export function useEventGroup(group_id: number) {
  const queryClient = useQueryClient();
  const { data: predefined } = events.useUsersGetPredefined();
  const { data: eventsUser } = events.useUsersGetMe();

  const onSettled = () => {
    return Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["events", ...events.getUsersGetMeQueryKey()],
      }),
    ]);
  };

  const add = events.useUsersAddFavorite({ mutation: { onSettled } });
  const remove = events.useUsersDeleteFavorite({ mutation: { onSettled } });
  const hide = events.useUsersHideFavorite({ mutation: { onSettled } });

  const isFavorite = eventsUser?.favorite_event_groups?.includes(group_id);
  const isPredefined = predefined?.event_groups?.includes(group_id) ?? false;
  let isInFavorites = !!isFavorite;
  let isHidden = eventsUser?.hidden_event_groups?.includes(group_id) ?? false;
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
  event_group: events.ViewEventGroup,
  tag_type: string,
) {
  if (event_group.tags === undefined) return undefined;
  return event_group.tags.find((v) => v.type === tag_type);
}

export function getAllTagsByType(
  event_group: events.ViewEventGroup,
  tag_type: string,
) {
  if (event_group.tags === undefined) return [];
  return event_group.tags.filter((v) => v.type === tag_type);
}

export function useMyMusicRoom() {
  const musicRoomSchedule = events.useIcsGetMusicRoomCurrentUserSchedule();

  return {
    musicRoomSchedule,
  };
}
