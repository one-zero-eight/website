/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState } from "react";
import WorkshopList from "./UI/workshop_tiles/WorkshopList";
import PostForm from "@/components/workshops/UI/post_form/PostForm.tsx";
import Modal from "./UI/modal/ModalWindow";
import Description from "./UI/description_form/Description";
import { useToast } from "./toast";
import { useWorkshops, useCurrentUser } from "./hooks";
import type { Workshop } from "./types";

export function WorkshopsPage() {
  const { showConfirm, showSuccess, showError, showWarning } = useToast();
  
  const {
    workshops,
    loading: workshopsLoading,
    error: workshopsError,
    createWorkshop,
    updateWorkshop,
    removeWorkshop: removeWorkshopAPI,
    refreshWorkshops
  } = useWorkshops();

  const {
    currentUser,
    loading: userLoading,
    error: userError,
    changeRole,
    isAdmin
  } = useCurrentUser();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingWorkshop, setEditingWorkshop] = useState<Workshop | null>(null);
  const [descriptionVisible, setDescriptionVisible] = useState(false);
  const [selectedWorkshop, setSelectedWorkshop] = useState<Workshop | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const openDescription = (workshop: Workshop) => {
    setSelectedWorkshop(workshop);
    setDescriptionVisible(true);
  };

  const refreshParticipants = () => {
    setRefreshTrigger((prev) => prev + 1);
    refreshWorkshops();
  };

  const handleCreateWorkshop = async (newWorkshop: Workshop): Promise<boolean> => {
    const success = await createWorkshop(newWorkshop);
    
    if (success) {
      showSuccess(
        "Workshop Created",
        `Workshop "${newWorkshop.title}" has been successfully created.`
      );
    } else {
      showError(
        "Creation Failed",
        "Failed to create workshop. Please check all fields and try again."
      );
    }
    
    return success;
  };

  const handleRemoveWorkshop = async (workshop: Workshop) => {
    const confirmed = await showConfirm({
      title: "Delete Workshop",
      message: `Are you sure you want to delete the workshop "${workshop.title}"?\n\nThis action cannot be undone.`,
      confirmText: "Delete",
      cancelText: "Cancel",
      type: "error",
    });

    if (!confirmed) {
      return;
    }

    const success = await removeWorkshopAPI(workshop);
    
    if (success) {
      showSuccess(
        "Workshop Deleted",
        `Workshop "${workshop.title}" has been successfully deleted.`
      );
    } else {
      showError(
        "Delete Failed",
        "Failed to delete workshop. Please try again."
      );
    }
  };

  const editWorkshop = (workshop: Workshop) => {
    setEditingWorkshop(workshop);
    setModalVisible(true);
  };

  const handleUpdateWorkshop = async (updatedWorkshop: Workshop) => {
    const success = await updateWorkshop(updatedWorkshop);
    
    if (success) {
      showSuccess(
        "Workshop Updated",
        "Workshop has been successfully updated."
      );
      setEditingWorkshop(null);
      setModalVisible(false);
    } else {
      showError(
        "Update Failed",
        "Failed to update workshop. Please check all fields and try again."
      );
    }
  };

  const handleModalClose = () => {
    setModalVisible(false);
    setEditingWorkshop(null);
  };

  const handleRoleChangeRequest = async () => {
    if (!currentUser) return;
    
    const newRole = currentUser.role === "admin" ? "user" : "admin";
    const success = await changeRole(newRole);
    
    if (success) {
      showSuccess("Role Changed", `Role successfully changed to ${newRole}.`);
    } else {
      showError(
        "Role Change Failed",
        "Failed to change role. Please try again."
      );
    }
  };

  // Показываем ошибки если есть
  if (workshopsError) {
    showError("Loading Failed", workshopsError);
  }

  if (userError) {
    showError("User Loading Failed", userError);
  }
  return (
    <div className="min-h-screen w-full">
      {" "}
      {/* Показываем кнопку изменения роли только если пользователь авторизован */}
      {currentUser && (
        <button
          className={`fixed right-2 z-[10] cursor-pointer rounded-lg border-none bg-brand-violet px-5 py-3 text-base font-bold text-white shadow-[0_4px_12px_rgba(0,0,0,0.4)] transition-colors duration-200 ease-in-out hover:bg-brand-violet/80 lg:right-6 ${
            currentUser.role === "admin"
              ? "bottom-28 lg:bottom-16" // 112px на мобиле, 64px на десктопе
              : "bottom-20 lg:bottom-3" // 80px на мобиле, 12px на десктопе
          }`}
          title={`Set ${currentUser.role === "admin" ? "user" : "admin"} role`}
          onClick={handleRoleChangeRequest}
        >
          Set {currentUser.role === "admin" ? "user" : "admin"}
        </button>
      )}
      {/* Показываем кнопку добавления воркшопа только для администраторов */}
      {isAdmin && (
        <button
          className="fixed bottom-14 right-2 z-[10] cursor-pointer rounded-lg border-none bg-brand-violet px-5 py-3 text-base font-bold text-white shadow-[0_4px_12px_rgba(0,0,0,0.4)] transition-colors duration-200 ease-in-out hover:bg-brand-violet/80 lg:bottom-3 lg:right-6"
          title="Add new workshop"
          onClick={() => setModalVisible(true)}
        >
          Add workshop
        </button>
      )}{" "}
      {/* Отрисовка списка воркшопов из UI/workshop_tiles */}
      <WorkshopList
        remove={handleRemoveWorkshop}
        edit={editWorkshop}
        workshops={workshops}
        openDescription={openDescription}
        currentUserRole={currentUser?.role || "user"}
        refreshParticipants={refreshParticipants}
      />{" "}
      {/* Модалка для создания нового воркшопа чекай UI/modal */}
      <Modal
        visible={modalVisible}
        onClose={handleModalClose}
        title={editingWorkshop ? "Edit workshop" : "Create workshop"}
        zIndex={20}
      >
        {/* Форма для создания/редакта воркшопа чекай PostForm.tsx */}
        {/* Тут тернарка подставляет данные если ты в режиме редактирования */}
        <PostForm
          create={handleCreateWorkshop}
          initialWorkshop={
            editingWorkshop
              ? {
                  title: editingWorkshop.title,
                  body: editingWorkshop.body,
                  date: editingWorkshop.date,
                  startTime: editingWorkshop.startTime,
                  endTime: editingWorkshop.endTime,
                  room: editingWorkshop.room,
                  maxPlaces: editingWorkshop.maxPlaces,
                  remainPlaces: editingWorkshop.remainPlaces,
                  isActive: editingWorkshop.isActive,
                }
              : undefined
          }
          isEditing={!!editingWorkshop}
          onUpdate={handleUpdateWorkshop}
          existingId={editingWorkshop?.id}
          onClose={handleModalClose}
        />
      </Modal>
      <Modal
        visible={descriptionVisible}
        onClose={() => setDescriptionVisible(false)}
        title={selectedWorkshop?.title}
        className="whitespace-pre-wrap break-words"
      >
        <Description
          workshop={selectedWorkshop}
          refreshTrigger={refreshTrigger}
          remove={handleRemoveWorkshop}
          edit={editWorkshop}
          currentUserRole={currentUser?.role || "user"}
          refreshParticipants={refreshParticipants}
        />
      </Modal>
      {/*<a
        href="https://t.me/maximf3"
        target="_blank"
        className="group flex flex-row gap-4 rounded-2xl bg-primary px-4 py-6 hover:bg-secondary"
      >
        <div className="w-12">
          <span className="icon-[ic--baseline-telegram] text-5xl text-brand-violet" />
        </div>
        <div className="flex flex-col gap-2">
          <p className="flex items-center text-2xl font-semibold text-contrast">
            Contact us
            <span className="icon-[material-symbols--open-in-new-rounded] ml-1" />
          </p>
          <p className="text-lg text-contrast/75">
            If you have any questions or suggestions, feel free to contact the
            developers.
          </p>
        </div>
      </a>*/}
    </div>
  );
}
