/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState } from "react";
import "./styles/App.css";
import WorkshopList from "./UI/workshop_tiles/WorkshopList";
import PostForm from "@/components/workshops/UI/post_form/PostForm.tsx";
import Modal from "./UI/modal/ModalWindow";
import Description from "./UI/description_form/Description";
import styles from "./UI/modal/ModalWindow.module.css";
import { workshopsFetch } from "@/api/workshops";

type Workshop = {
  id: string;
  title: string;
  body: string;
  date: string;
  startTime: string;
  endTime: string;
  room: string;
  maxPlaces: number;
  isActive?: boolean;
};

export function WorkshopsPage() {
  // ===== СОСТОЯНИЕ КОМПОНЕНТА =====
  // Стэйт для хранения списка воркшопов
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  // Стэйт для управления видимостью модального окна
  const [modalVisible, setModalVisible] = useState(false);
  // Стэйт для редактируемого воркшопа
  const [editingWorkshop, setEditingWorkshop] = useState<Workshop | null>(null);
  const [descriptionVisible, setDescriptionVisible] = useState(false);
  const [selectedWorkshop, setSelectedWorkshop] = useState<Workshop | null>(
    null,
  );

  const openDescription = (workshop: Workshop) => {
    setSelectedWorkshop(workshop);
    setDescriptionVisible(true);
  };

  const createWorkshop = async (newWorkshop: Workshop) => {
    // TODO: Добавить логику создания воркшопа
  };

  const removeWorkshop = (workshop: Workshop) => {
    setWorkshops(workshops.filter((w) => w.id !== workshop.id));
  };

  const editWorkshop = (workshop: Workshop) => {
    setEditingWorkshop(workshop);
    setModalVisible(true);
  };

  const updateWorkshop = (updatedWorkshop: Workshop) => {
    setWorkshops(
      workshops.map((w) => (w.id === updatedWorkshop.id ? updatedWorkshop : w)),
    );
    setEditingWorkshop(null);
    setModalVisible(false);
  };
  const handleModalClose = () => {
    setModalVisible(false);
    setEditingWorkshop(null);
  };

  const handleRoleChangeRequest = async () => {
    try {
      // ===== ПРИМЕР АВТОРИЗОВАННОГО ЗАПРОСА С ПАРАМЕТРАМИ =====

      // Логируем текущий токен для отладки
      console.log("Making role change request...");

      // 1. ОТПРАВЛЯЕМ ЗАПРОС С ПАРАМЕТРАМИ ЗАПРОСА (query parameters)
      // Параметры запроса добавляются к URL в виде ?role=admin
      // Токен автоматически добавляется библиотекой workshopsFetch
      const { data, error } = await workshopsFetch.POST("/users/change_role", {
        params: {
          query: {
            role: "admin", // Параметр запроса: какую роль установить
          },
        },
      });

      // 2. ОБРАБОТКА ОТВЕТА
      if (error) {
        // Возможные ошибки: нет прав, неверный токен, роль не существует
        console.error("Role change failed:", error);
        alert(`Role change failed: ${JSON.stringify(error)}`);
      } else {
        // Успешное изменение роли
        console.log("Role changed successfully:", data);
        alert("Admin role granted successfully!");
      }
    } catch (error) {
      // Критические ошибки
      console.error("Error during role change:", error);
      alert(
        `Error during role change: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };

  return (
    <div className="App">
      <button
        className="admin-button"
        title="Set admin role"
        onClick={handleRoleChangeRequest}
        style={{ marginRight: "10px" }}
      >
        Set admin
      </button>
      <button
        className="fab-button"
        title="Add new workshop"
        onClick={() => setModalVisible(true)}
      >
        Add workshop
      </button>{" "}
      {/* Отрисовка списка воркшопов из UI/workshop_tiles */}
      <WorkshopList
        remove={removeWorkshop}
        edit={editWorkshop}
        workshops={workshops}
        title={"Workshops list"}
        openDescription={openDescription}
      />
      {/* Модалка для создания нового воркшопа чекай UI/modal */}
      <Modal visible={modalVisible} onClose={handleModalClose}>
        {/* Форма для создания/редакта воркшопа чекай PostForm.tsx */}
        {/* Тут тернарка подставляет данные если ты в режиме редактирования */}
        <PostForm
          create={createWorkshop}
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
                }
              : undefined
          }
          isEditing={!!editingWorkshop}
          onUpdate={updateWorkshop}
          existingId={editingWorkshop?.id}
          onClose={handleModalClose}
        />
      </Modal>
      <Modal
        visible={descriptionVisible}
        onClose={() => setDescriptionVisible(false)}
        className={styles["modal-content-special"]}
      >
        <Description workshop={selectedWorkshop} />
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
