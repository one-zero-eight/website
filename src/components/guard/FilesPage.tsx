import { guardTypes } from "@/api/guard";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import { useState } from "react";
import { FileDetails } from "./FileDetails";
import { FilesList } from "./FilesList";
import { FilesSection } from "./FilesSection";
import { useGuardFile, useGuardFiles, useGuardMutations } from "./hooks";

export function FilesPage() {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [filesSearch, setFilesSearch] = useState("");
  const [detailsSearch, setDetailsSearch] = useState("");

  const {
    files,
    isPending: isLoadingFiles,
    error: filesError,
  } = useGuardFiles();
  const { file: selectedFile, isPending: isLoadingFile } =
    useGuardFile(selectedSlug);
  const mutations = useGuardMutations();

  const handleShowDetails = (slug: string) => {
    setSelectedSlug(slug);
    setDetailsSearch("");
  };

  const handleBack = () => {
    setSelectedSlug(null);
    setDetailsSearch("");
  };

  const handleDelete = async () => {
    if (!selectedSlug) return;

    await mutations.deleteFile.mutateAsync({
      params: { path: { slug: selectedSlug } },
    });

    mutations.invalidateFiles();
    setSelectedSlug(null);
  };

  const handleUpdateTitle = async (newTitle: string) => {
    if (!selectedSlug) return;

    await mutations.updateFile.mutateAsync({
      params: { path: { slug: selectedSlug } },
      body: { title: newTitle },
    });

    mutations.invalidateFile(selectedSlug);
    mutations.invalidateFiles();
  };

  const handleBan = async (userId: string) => {
    if (!selectedSlug) return;

    await mutations.banUser.mutateAsync({
      params: { path: { slug: selectedSlug } },
      body: { user_id: userId },
    });

    mutations.invalidateFile(selectedSlug);
  };

  const handleUnban = async (userId: string) => {
    if (!selectedSlug) return;

    await mutations.unbanUser.mutateAsync({
      params: { path: { slug: selectedSlug, user_id: userId } },
    });

    mutations.invalidateFile(selectedSlug);
  };

  const handleUpdateDefaultRole = async (role: string) => {
    if (!selectedSlug) return;

    await mutations.updateDefaultRole.mutateAsync({
      params: { path: { slug: selectedSlug } },
      body: { role: role as guardTypes.UpdateDefaultRoleRequestRole },
    });

    mutations.invalidateFile(selectedSlug);
    mutations.invalidateFiles();
  };

  const handleUpdateUserRole = async (userId: string, role: string) => {
    if (!selectedSlug) return;

    await mutations.updateUserRole.mutateAsync({
      params: { path: { slug: selectedSlug, user_id: userId } },
      body: { role: role as guardTypes.UpdateUserRoleRequestRole },
    });

    mutations.invalidateFile(selectedSlug);
  };

  return (
    <div className="@container/content mx-auto flex w-full max-w-[720px] flex-col gap-4 px-4 py-8">
      {selectedSlug ? (
        <FileDetails
          slug={selectedSlug}
          file={selectedFile}
          isLoading={isLoadingFile}
          search={detailsSearch}
          onSearchChange={setDetailsSearch}
          onBack={handleBack}
          onDelete={handleDelete}
          onUpdateTitle={handleUpdateTitle}
          onBan={handleBan}
          onUnban={handleUnban}
          onUpdateDefaultRole={handleUpdateDefaultRole}
          onUpdateUserRole={handleUpdateUserRole}
        />
      ) : (
        <FilesSection search={filesSearch} onSearchChange={setFilesSearch}>
          {isLoadingFiles ? (
            <div className="flex flex-col gap-3">
              <div className="skeleton h-16 w-full" />
              <div className="skeleton h-16 w-full" />
              <div className="skeleton h-16 w-full" />
            </div>
          ) : filesError ? (
            <div className="alert alert-error alert-soft">
              <span>
                Error loading files: {formatApiErrorMessage(filesError)}
              </span>
            </div>
          ) : files.length > 0 ? (
            <FilesList
              files={files}
              search={filesSearch}
              onShowDetails={handleShowDetails}
            />
          ) : (
            <p className="text-base-content/60">No files found.</p>
          )}
        </FilesSection>
      )}
    </div>
  );
}
