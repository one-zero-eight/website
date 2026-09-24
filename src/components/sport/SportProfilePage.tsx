import {
  MedicalGroupUploadModal,
  MedicalReferenceUploadModal,
  SportIdentityInfo,
} from "@/components/sport/SportOverviewSection.tsx";
import { useSportProfile } from "@/components/sport/sport-profile.ts";
import { useState } from "react";

export function SportProfilePage() {
  const { profile, isCollege, isTrainer, studentStatus } = useSportProfile();
  const [medicalGroupModalOpen, setMedicalGroupModalOpen] = useState(false);
  const [medicalReferenceModalOpen, setMedicalReferenceModalOpen] =
    useState(false);

  const roleLabels = [
    profile?.student_info ? (isCollege ? "College" : "Student") : null,
    isTrainer ? "Trainer" : null,
  ].filter((label): label is string => !!label);
  const normalizedStatus = studentStatus?.trim().toLowerCase() ?? "";
  const enrollmentStatus =
    studentStatus && normalizedStatus && normalizedStatus !== "normal"
      ? studentStatus
      : null;

  return (
    <div className="flex flex-col gap-4">
      {profile?.full_name ? (
        <h3 className="text-2xl font-medium">{profile.full_name}</h3>
      ) : null}
      <SportIdentityInfo
        roleLabels={roleLabels}
        enrollmentStatus={enrollmentStatus}
        medicalGroup={profile?.student_info?.medical_group}
        onChangeMedicalGroup={() => setMedicalGroupModalOpen(true)}
      />
      <div>
        <button
          type="button"
          className="btn btn-outline btn-sm border-base-content text-base-content hover:bg-base-content hover:text-base-100"
          onClick={() => setMedicalReferenceModalOpen(true)}
        >
          Submit medical leave reference
        </button>
      </div>
      <MedicalGroupUploadModal
        open={medicalGroupModalOpen}
        onOpenChange={setMedicalGroupModalOpen}
      />
      <MedicalReferenceUploadModal
        open={medicalReferenceModalOpen}
        onOpenChange={setMedicalReferenceModalOpen}
      />
    </div>
  );
}
