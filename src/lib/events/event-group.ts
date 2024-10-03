import { $events, eventsTypes } from "@/api/events";
import { useQueryClient } from "@tanstack/react-query";

export function useEventGroup(group_id: number) {
  const queryClient = useQueryClient();
  const { data: eventsUser } = $events.useQuery("get", "/users/me");
  const { data: predefined } = $events.useQuery("get", "/users/me/predefined");

  const onSettled = () => {
    return Promise.all([
      queryClient.invalidateQueries({
        queryKey: $events.queryOptions("get", "/users/me").queryKey,
      }),
    ]);
  };

  const add = $events.useMutation("post", "/users/me/favorites", {
    onSettled,
  });
  const remove = $events.useMutation("delete", "/users/me/favorites", {
    onSettled,
  });
  const hide = $events.useMutation("post", "/users/me/favorites/hide", {
    onSettled,
  });

  const isFavorite = eventsUser?.favorite_event_groups?.includes(group_id);
  const isPredefined = predefined?.event_groups?.includes(group_id) ?? false;
  let isInFavorites = !!isFavorite;
  let isHidden = eventsUser?.hidden_event_groups?.includes(group_id) ?? false;
  // Use optimistic updates for mutations
  if (
    remove.isPending &&
    remove.variables?.params.query.group_id === group_id
  ) {
    isInFavorites = false;
  }
  if (add.isPending && add.variables?.params.query.group_id === group_id) {
    isInFavorites = true;
  }
  if (hide.isPending && hide.variables?.params.query.group_id === group_id) {
    isHidden = hide.variables?.params.query.hide ?? isHidden;
  }

  const addToFavorites = () => {
    if (group_id === undefined || isPredefined) return;
    add.mutate({ params: { query: { group_id } } });
  };

  const removeFromFavorites = () => {
    if (group_id === undefined || isPredefined) return;
    remove.mutate({ params: { query: { group_id } } });
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
    hide.mutate({ params: { query: { group_id, hide: true } } });
  };

  const unhideFavorite = () => {
    if (group_id === undefined) return;
    hide.mutate({ params: { query: { group_id, hide: false } } });
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
  event_group: eventsTypes.SchemaViewEventGroup,
  tag_type: string,
) {
  if (event_group.tags === undefined) return undefined;
  return event_group.tags.find((v) => v.type === tag_type);
}

export function getAllTagsByType(
  event_group: eventsTypes.SchemaViewEventGroup,
  tag_type: string,
) {
  if (event_group.tags === undefined) return [];
  return event_group.tags.filter((v) => v.type === tag_type);
}

export function useMyMusicRoom() {
  return $events.useQuery("get", "/users/me/music-room.ics", {
    parseAs: "text",
  });
}
