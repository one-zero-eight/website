/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState } from "react";
import WorkshopList from "./UI/workshop_tiles/WorkshopList";
import PostForm from "@/components/workshops/UI/post_form/PostForm.tsx";
import Modal from "./UI/modal/ModalWindow";
import Description from "./UI/description_form/Description";
import { useToast } from "./toast";
import { useWorkshops, useCurrentUser } from "./hooks";
import type { Workshop } from "./types";

/**
 * Главная страница модуля воркшопов
 * Состояние:
 * - modalVisible: показывать ли модалку создания/редактирования
 * - editingWorkshop: воркшоп для редактирования (null = создание нового)
 * - descriptionVisible: показывать ли модалку с подробным описанием
 * - selectedWorkshop: выбранный воркшоп для просмотра
 * - refreshTrigger: триггер для обновления списка участников
 */
export function WorkshopsPage() {
  const { showConfirm, showSuccess, showError, showWarning } = useToast();

  const {
    workshops,
    loading: workshopsLoading,
    error: workshopsError,
    createWorkshop,
    updateWorkshop,
    removeWorkshop: removeWorkshopAPI,
    refreshWorkshops,
  } = useWorkshops();

  const {
    currentUser,
    loading: userLoading,
    error: userError,
    changeRole,
    isAdmin,
  } = useCurrentUser();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingWorkshop, setEditingWorkshop] = useState<Workshop | null>(null);
  const [descriptionVisible, setDescriptionVisible] = useState(false);
  const [selectedWorkshop, setSelectedWorkshop] = useState<Workshop | null>(
    null,
  );
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  /**
   * Открывает модальное окно с подробным описанием воркшопа
   * @param workshop - воркшоп для отображения
   */
  const openDescription = (workshop: Workshop) => {
    setSelectedWorkshop(workshop);
    setDescriptionVisible(true);
  };

  /**
   * Обновляет список участников и воркшопов
   * Используется после регистрации/отмены регистрации
   */
  const refreshParticipants = () => {
    setRefreshTrigger((prev) => prev + 1);
    refreshWorkshops();
  };

  /**
   * Обработчик создания нового воркшопа
   * Показывает соответствующие уведомления об успехе/ошибке
   * @param newWorkshop - данные нового воркшопа
   * @returns Promise<boolean> - успешность операции
   */
  const handleCreateWorkshop = async (
    newWorkshop: Workshop,
  ): Promise<boolean> => {
    const success = await createWorkshop(newWorkshop);

    if (success) {
      showSuccess(
        "Workshop Created",
        `Workshop "${newWorkshop.title}" has been successfully created.`,
      );
    } else {
      showError(
        "Creation Failed",
        "Failed to create workshop. Please check all fields and try again.",
      );
    }

    return success;
  };

  /**
   * Обработчик удаления воркшопа
   * Показывает диалог подтверждения перед удалением
   * @param workshop - воркшоп для удаления
   */
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
        `Workshop "${workshop.title}" has been successfully deleted.`,
      );
    } else {
      showError(
        "Delete Failed",
        "Failed to delete workshop. Please try again.",
      );
    }
  };

  /**
   * Открывает форму редактирования воркшопа
   * @param workshop - воркшоп для редактирования
   */
  const editWorkshop = (workshop: Workshop) => {
    setEditingWorkshop(workshop);
    setModalVisible(true);
  };

  /**
   * Обработчик обновления существующего воркшопа
   * @param updatedWorkshop - обновленные данные воркшопа
   */
  const handleUpdateWorkshop = async (updatedWorkshop: Workshop) => {
    const success = await updateWorkshop(updatedWorkshop);

    if (success) {
      showSuccess(
        "Workshop Updated",
        "Workshop has been successfully updated.",
      );
      setEditingWorkshop(null);
      setModalVisible(false);
    } else {
      showError(
        "Update Failed",
        "Failed to update workshop. Please check all fields and try again.",
      );
    }
  };

  /**
   * Закрывает модальное окно создания/редактирования и сбрасывает состояние
   */
  const handleModalClose = () => {
    setModalVisible(false);
    setEditingWorkshop(null);
  };

  /**
   * Обработчик смены роли пользователя (admin ↔ user)
   * Используется для тестирования функционала администратора
   */
  const handleRoleChangeRequest = async () => {
    if (!currentUser) return;

    const newRole = currentUser.role === "admin" ? "user" : "admin";
    const success = await changeRole(newRole);

    if (success) {
      showSuccess("Role Changed", `Role successfully changed to ${newRole}.`);
    } else {
      showError(
        "Role Change Failed",
        "Failed to change role. Please try again.",
      );
    }
  };

  // Показываем ошибки если есть (автоматически через toast)
  if (workshopsError) {
    showError("Loading Failed", workshopsError);
  }

  if (userError) {
    showError("User Loading Failed", userError);
  }
  return (
    <div className="min-h-screen w-full">
      {/* Кнопка смены роли (admin ↔ user) - показывается только авторизованным пользователям */}
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

      {/* Кнопка добавления воркшопа - показывается только администраторам */}
      {isAdmin && (
        <button
          className="fixed bottom-14 right-2 z-[10] cursor-pointer rounded-lg border-none bg-brand-violet px-5 py-3 text-base font-bold text-white shadow-[0_4px_12px_rgba(0,0,0,0.4)] transition-colors duration-200 ease-in-out hover:bg-brand-violet/80 lg:bottom-3 lg:right-6"
          title="Add new workshop"
          onClick={() => setModalVisible(true)}
        >
          Add workshop
        </button>
      )}

      {/* Основной компонент со списком воркшопов */}
      <WorkshopList
        remove={handleRemoveWorkshop}
        edit={editWorkshop}
        workshops={workshops}
        openDescription={openDescription}
        currentUserRole={currentUser?.role || "user"}
        refreshParticipants={refreshParticipants}
      />

      {/* Модальное окно для создания/редактирования воркшопа */}
      <Modal
        visible={modalVisible}
        onClose={handleModalClose}
        title={editingWorkshop ? "Edit workshop" : "Create workshop"}
        zIndex={20}
      >
        {/* Форма создания/редактирования воркшопа
            При редактировании передаются данные существующего воркшопа */}
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

      {/* Модальное окно с подробным описанием воркшопа */}
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
