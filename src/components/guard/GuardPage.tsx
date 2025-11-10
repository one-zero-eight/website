import { useState } from "react";
import {
  useServiceAccountEmail,
  useGuardFiles,
  useGuardFile,
  useGuardMutations,
} from "./hooks";
import { SetupContainer } from "./SetupContainer";
import { FilesSection } from "./FilesSection";
import { FilesList } from "./FilesList";
import { FileDetails } from "./FileDetails";

export function GuardPage() {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [filesSearch, setFilesSearch] = useState("");
  const [detailsSearch, setDetailsSearch] = useState("");

  const { serviceEmail } = useServiceAccountEmail();
  const {
    files,
    isLoading: isLoadingFiles,
    error: filesError,
  } = useGuardFiles();
  const { file: selectedFile, isLoading: isLoadingFile } =
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
      body: { role: role as any },
    });

    mutations.invalidateFile(selectedSlug);
    mutations.invalidateFiles();
  };

  const handleUpdateUserRole = async (userId: string, role: string) => {
    if (!selectedSlug) return;

    await mutations.updateUserRole.mutateAsync({
      params: { path: { slug: selectedSlug, user_id: userId } },
      body: { role: role as any },
    });

    mutations.invalidateFile(selectedSlug);
  };

  return (
    <div className="flex grow flex-col gap-4 p-4">
      <div className="w-full max-w-2xl self-center">
        <SetupContainer serviceEmail={serviceEmail} />

        <hr className="border-base-content/20 my-6" />

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
              <div className="text-base-content/70">Loading...</div>
            ) : filesError ? (
              <div className="rounded-sm border-2 border-red-400 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-600 dark:bg-red-900/20 dark:text-red-200">
                Error loading files:{" "}
                {(filesError as any)?.message || "Unknown error"}
              </div>
            ) : files.length > 0 ? (
              <FilesList
                files={files}
                search={filesSearch}
                onShowDetails={handleShowDetails}
              />
            ) : (
              <div className="text-base-content/60">No files found.</div>
            )}
          </FilesSection>
        )}
      </div>
    </div>
  );
}
