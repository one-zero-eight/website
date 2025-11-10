import { $guard } from "@/api/guard";
import { guardTypes } from "@/api/guard";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Query keys for Guard API
 */
export const guardQueryKeys = {
  serviceEmail: () =>
    ["guard", "get", "/google/service-account-email"] as const,
  files: () => ["guard", "get", "/google/files"] as const,
  file: (slug: string) =>
    [
      "guard",
      "get",
      "/google/files/{slug}",
      { params: { path: { slug } } },
    ] as const,
};

/**
 * Hook for querying service account email
 */
export function useServiceAccountEmail() {
  const query = $guard.useQuery("get", "/google/service-account-email");
  return {
    serviceEmail: query.data?.email || "",
    isLoading: query.isLoading,
  };
}

/**
 * Hook for querying files list
 */
export function useGuardFiles() {
  const query = $guard.useQuery("get", "/google/files");

  return {
    files: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
  };
}

/**
 * Hook for querying single file by slug
 */
export function useGuardFile(slug: string | null) {
  const query = $guard.useQuery(
    "get",
    "/google/files/{slug}",
    slug
      ? {
          params: { path: { slug } },
        }
      : ({} as any),
    { enabled: !!slug },
  );

  return {
    file: query.data,
    isLoading: query.isLoading,
  };
}

/**
 * Hook for all Guard mutations
 */
export function useGuardMutations() {
  const queryClient = useQueryClient();

  const createFileMutation = $guard.useMutation("post", "/google/files");
  const copyFileMutation = $guard.useMutation("post", "/google/files/copy");
  const updateFileMutation = $guard.useMutation(
    "patch",
    "/google/files/{slug}",
  );
  const deleteFileMutation = $guard.useMutation(
    "delete",
    "/google/files/{slug}",
  );
  const cleanupFileMutation = $guard.useMutation(
    "post",
    "/google/files/{slug}/cleanup",
  );
  const banUserMutation = $guard.useMutation(
    "post",
    "/google/files/{slug}/bans",
  );
  const unbanUserMutation = $guard.useMutation(
    "delete",
    "/google/files/{slug}/bans/{user_id}",
  );
  const updateDefaultRoleMutation = $guard.useMutation(
    "put",
    "/google/files/{slug}/role",
  );
  const updateUserRoleMutation = $guard.useMutation(
    "put",
    "/google/files/{slug}/joins/{user_id}/role",
  );

  return {
    createFile: {
      mutate: createFileMutation.mutate,
      mutateAsync: createFileMutation.mutateAsync,
      isPending: createFileMutation.isPending,
    },
    copyFile: {
      mutate: copyFileMutation.mutate,
      mutateAsync: copyFileMutation.mutateAsync,
      isPending: copyFileMutation.isPending,
    },
    updateFile: {
      mutate: updateFileMutation.mutate,
      mutateAsync: updateFileMutation.mutateAsync,
      isPending: updateFileMutation.isPending,
    },
    deleteFile: {
      mutate: deleteFileMutation.mutate,
      mutateAsync: deleteFileMutation.mutateAsync,
      isPending: deleteFileMutation.isPending,
    },
    cleanupFile: {
      mutate: cleanupFileMutation.mutate,
      mutateAsync: cleanupFileMutation.mutateAsync,
      isPending: cleanupFileMutation.isPending,
    },
    banUser: {
      mutate: banUserMutation.mutate,
      mutateAsync: banUserMutation.mutateAsync,
      isPending: banUserMutation.isPending,
    },
    unbanUser: {
      mutate: unbanUserMutation.mutate,
      mutateAsync: unbanUserMutation.mutateAsync,
      isPending: unbanUserMutation.isPending,
    },
    updateDefaultRole: {
      mutate: updateDefaultRoleMutation.mutate,
      mutateAsync: updateDefaultRoleMutation.mutateAsync,
      isPending: updateDefaultRoleMutation.isPending,
    },
    updateUserRole: {
      mutate: updateUserRoleMutation.mutate,
      mutateAsync: updateUserRoleMutation.mutateAsync,
      isPending: updateUserRoleMutation.isPending,
    },
    invalidateFiles: () =>
      queryClient.invalidateQueries({ queryKey: guardQueryKeys.files() }),
    invalidateFile: (slug: string) =>
      queryClient.invalidateQueries({ queryKey: guardQueryKeys.file(slug) }),
  };
}

/**
 * Type helpers
 */
export type FileRole = guardTypes.CreateFileRequestDefault_role;
export type FileType = guardTypes.CreateFileRequestFile_type;

export const FileRole = guardTypes.CreateFileRequestDefault_role;
export const FileType = guardTypes.CreateFileRequestFile_type;
