import { $events, eventsTypes } from "@/api/events";
import { useQueryClient } from "@tanstack/react-query";

export function useEventGroup(group_id: number) {
  const queryClient = useQueryClient();
  const { data: eventsUser } = $events.useQuery("get", "/users/me");
  const { data: predefined } = $events.useQuery("get", "/users/me/predefined");

  const onSettled = () =>
    queryClient.invalidateQueries({
      queryKey: $events.queryOptions("get", "/users/me").queryKey,
    });

  const add = $events.useMutation("post", "/users/me/favorites", {
    onMutate: ({ params }) => {
      queryClient.setQueryData(
        $events.queryOptions("get", "/users/me").queryKey,
        (oldData: eventsTypes.SchemaViewUser) => {
          if (oldData === undefined) return oldData;
          return {
            ...oldData,
            favorite_event_groups: [
              ...(oldData.favorite_event_groups ?? []),
              params.query.group_id,
            ],
          };
        },
      );
    },
    onSettled,
  });
  const remove = $events.useMutation("delete", "/users/me/favorites", {
    onMutate: ({ params }) => {
      queryClient.setQueryData(
        $events.queryOptions("get", "/users/me").queryKey,
        (prev: eventsTypes.SchemaViewUser) => {
          if (prev === undefined) return prev;
          return {
            ...prev,
            favorite_event_groups: prev.favorite_event_groups?.filter(
              (v) => v !== params.query.group_id,
            ),
          };
        },
      );
    },
    onSettled,
  });
  const hide = $events.useMutation("post", "/users/me/favorites/hide", {
    onMutate: ({ params }) => {
      queryClient.setQueryData(
        $events.queryOptions("get", "/users/me").queryKey,
        (prev: eventsTypes.SchemaViewUser) => {
          if (prev === undefined) return prev;
          if (params.query.hide) {
            return {
              ...prev,
              hidden_event_groups: [
                ...(prev.hidden_event_groups ?? []),
                params.query.group_id,
              ],
            };
          } else {
            return {
              ...prev,
              hidden_event_groups: prev.hidden_event_groups?.filter(
                (v) => v !== params.query.group_id,
              ),
            };
          }
        },
      );
    },
    onSettled,
  });

  const isFavorite = eventsUser?.favorite_event_groups?.includes(group_id);
  const isPredefined = predefined?.event_groups?.includes(group_id) ?? false;
  const isHidden = eventsUser?.hidden_event_groups?.includes(group_id) ?? false;

  const addToFavorites = () => {
    if (isPredefined) return;
    add.mutate({ params: { query: { group_id } } });
  };

  const removeFromFavorites = () => {
    if (isPredefined) return;
    remove.mutate({ params: { query: { group_id } } });
  };

  const switchFavorite = () => {
    if (!isFavorite) {
      addToFavorites();
    } else {
      removeFromFavorites();
    }
  };

  const hideFavorite = () => {
    hide.mutate({ params: { query: { group_id, hide: true } } });
  };

  const unhideFavorite = () => {
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
    isFavorite,
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
