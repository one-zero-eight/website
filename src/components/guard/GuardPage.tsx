import { useState } from "react";
import { useMe } from "@/api/accounts/user.ts";
import { AuthWall } from "@/components/common/AuthWall.tsx";
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
  const { me } = useMe();
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [filesSearch, setFilesSearch] = useState("");
  const [detailsSearch, setDetailsSearch] = useState("");

  const { serviceEmail } = useServiceAccountEmail();
  const { files, isLoading: isLoadingFiles } = useGuardFiles();
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

  if (!me) {
    return <AuthWall />;
  }

  return (
    <div className="flex grow flex-col gap-4 p-4">
      <div className="w-full max-w-2xl self-center">
        <SetupContainer serviceEmail={serviceEmail} />

        <hr className="my-6 border-contrast/20" />

        {selectedSlug ? (
          <FileDetails
            slug={selectedSlug}
            file={selectedFile}
            isLoading={isLoadingFile}
            search={detailsSearch}
            onSearchChange={setDetailsSearch}
            onBack={handleBack}
            onDelete={handleDelete}
            onBan={handleBan}
            onUnban={handleUnban}
          />
        ) : (
          <FilesSection search={filesSearch} onSearchChange={setFilesSearch}>
            {isLoadingFiles ? (
              <div className="text-contrast/70">Loading...</div>
            ) : files.length > 0 ? (
              <FilesList
                files={files}
                search={filesSearch}
                onShowDetails={handleShowDetails}
              />
            ) : (
              <div className="text-contrast/60">No files found.</div>
            )}
          </FilesSection>
        )}
      </div>
    </div>
  );
}
