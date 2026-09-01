import { $schedule, scheduleTypes } from "@/api/schedule/index.ts";
import { useQueryClient } from "@tanstack/react-query";

export function useEventGroup(groupAlias: string) {
  const queryClient = useQueryClient();
  const { data: scheduleUser } = $schedule.useQuery("get", "/users/me");
  const { data: predefined } = $schedule.useQuery(
    "get",
    "/users/me/predefined",
  );

  const onSettled = () =>
    queryClient.invalidateQueries({
      queryKey: $schedule.queryOptions("get", "/users/me").queryKey,
    });

  const add = $schedule.useMutation("post", "/users/me/favorites", {
    onMutate: ({ params }) => {
      queryClient.setQueryData(
        $schedule.queryOptions("get", "/users/me").queryKey,
        (oldData) => {
          if (oldData === undefined) return oldData;
          return {
            ...oldData,
            favorite_event_groups: [
              ...(oldData.favorite_event_groups ?? []),
              params.query.group_alias,
            ],
          };
        },
      );
    },
    onSettled,
  });
  const remove = $schedule.useMutation("delete", "/users/me/favorites", {
    onMutate: ({ params }) => {
      queryClient.setQueryData(
        $schedule.queryOptions("get", "/users/me").queryKey,
        (prev) => {
          if (prev === undefined) return prev;
          return {
            ...prev,
            favorite_event_groups: prev.favorite_event_groups?.filter(
              (v) => v !== params.query.group_alias,
            ),
          };
        },
      );
    },
    onSettled,
  });
  const hide = $schedule.useMutation("post", "/users/me/favorites/hide", {
    onMutate: ({ params }) => {
      queryClient.setQueryData(
        $schedule.queryOptions("get", "/users/me").queryKey,
        (prev) => {
          if (prev === undefined) return prev;
          if (params.query.hide) {
            return {
              ...prev,
              hidden_event_groups: [
                ...(prev.hidden_event_groups ?? []),
                params.query.group_alias,
              ],
            };
          } else {
            return {
              ...prev,
              hidden_event_groups: prev.hidden_event_groups?.filter(
                (v) => v !== params.query.group_alias,
              ),
            };
          }
        },
      );
    },
    onSettled,
  });

  const isFavorite =
    scheduleUser?.favorite_event_groups?.includes(groupAlias) ?? false;
  const isPredefined = predefined?.event_groups?.includes(groupAlias) ?? false;
  const isHidden =
    scheduleUser?.hidden_event_groups?.includes(groupAlias) ?? false;

  const addToFavorites = () => {
    if (isPredefined) return;
    add.mutate({ params: { query: { group_alias: groupAlias } } });
  };

  const removeFromFavorites = () => {
    if (isPredefined) return;
    remove.mutate({ params: { query: { group_alias: groupAlias } } });
  };

  const switchFavorite = () => {
    if (!isFavorite) {
      addToFavorites();
    } else {
      removeFromFavorites();
    }
  };

  const hideFavorite = () => {
    hide.mutate({
      params: { query: { group_alias: groupAlias, hide: true } },
    });
  };

  const unhideFavorite = () => {
    hide.mutate({
      params: { query: { group_alias: groupAlias, hide: false } },
    });
  };

  const switchHideFavorite = () => {
    if (!isHidden) {
      hideFavorite();
    } else {
      unhideFavorite();
    }
  };

  return {
    groupAlias,
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
  event_group: scheduleTypes.SchemaViewEventGroup,
  tag_type: string,
) {
  if (event_group.tags === undefined) return undefined;
  return event_group.tags.find((v) => v.type === tag_type);
}

export function getAllTagsByType(
  event_group: scheduleTypes.SchemaViewEventGroup,
  tag_type: string,
) {
  if (event_group.tags === undefined) return [];
  return event_group.tags.filter((v) => v.type === tag_type);
}

export function useMyMusicRoom() {
  return $schedule.useQuery("get", "/users/me/music-room.ics", {
    parseAs: "text",
  });
}
