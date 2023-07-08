import {
  getUsersGetMeQueryKey,
  useUsersAddFavorite,
  useUsersDeleteFavorite,
  useUsersGetMe,
} from "@/lib/events";
import { useQueryClient } from "@tanstack/react-query";

export function useEventGroup(group_id?: number) {
  const queryClient = useQueryClient();
  const { data: userData } = useUsersGetMe();

  const {
    mutate: addFavoriteMutate,
    variables: addFavoriteVariables,
    isLoading: addFavoriteIsLoading,
  } = useUsersAddFavorite({
    mutation: {
      onSettled: async () => {
        return await queryClient.invalidateQueries({
          queryKey: getUsersGetMeQueryKey(),
        });
      },
    },
  });
  const {
    mutate: removeFavoriteMutate,
    variables: removeFavoriteVariables,
    isLoading: removeFavoriteIsLoading,
  } = useUsersDeleteFavorite({
    mutation: {
      onSettled: async () => {
        return await queryClient.invalidateQueries({
          queryKey: getUsersGetMeQueryKey(),
        });
      },
    },
  });

  const userFavoriteGroup = userData?.favorites?.find(
    (v) => v.group.id === group_id
  );
  const isPredefined = userFavoriteGroup?.predefined ?? false;
  let isInFavorites = !!userFavoriteGroup;
  // Use optimistic updates for mutations
  if (
    removeFavoriteIsLoading &&
    removeFavoriteVariables?.params.group_id === group_id
  ) {
    isInFavorites = false;
  }
  if (
    addFavoriteIsLoading &&
    addFavoriteVariables?.params.group_id === group_id
  ) {
    isInFavorites = true;
  }

  const addToFavorites = async () => {
    if (group_id === undefined || isPredefined) return;
    await addFavoriteMutate({ params: { group_id: group_id } });
  };

  const removeFromFavorites = async () => {
    if (group_id === undefined || isPredefined) return;
    await removeFavoriteMutate({ params: { group_id: group_id } });
  };

  const switchFavorite = async () => {
    if (!isInFavorites) {
      await addToFavorites();
    } else {
      await removeFromFavorites();
    }
  };

  return {
    group_id,
    isInFavorites,
    isPredefined,
    addToFavorites,
    removeFromFavorites,
    switchFavorite,
  };
}
