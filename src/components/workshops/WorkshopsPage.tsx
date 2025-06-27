/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from "react";
import WorkshopList from "./UI/workshop_tiles/WorkshopList";
import PostForm from "@/components/workshops/UI/post_form/PostForm.tsx";
import Modal from "./UI/modal/ModalWindow";
import Description from "./UI/description_form/Description";
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
  remainPlaces?: number;
  isActive?: boolean;
  isRegistrable?: boolean;
};

type User = {
  id: string;
  innohassle_id: string;
  email: string;
  name: string;
  role: "user" | "admin";
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
  // Стэйт для хранения информации о текущем пользователе
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  // Стэйт для принудительного обновления данных участников
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const openDescription = (workshop: Workshop) => {
    setSelectedWorkshop(workshop);
    setDescriptionVisible(true);
  };

  // Функция для обновления данных участников в модальном окне
  const refreshParticipants = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Функция для загрузки информации о текущем пользователе
  const loadCurrentUser = async () => {
    try {
      const { data, error } = await workshopsFetch.GET("/users/me");

      if (error) {
        console.error("Failed to load current user:", error);
        // Если пользователь не авторизован, просто не показываем кнопку изменения роли
        setCurrentUser(null);
        return;
      }

      if (data) {
        setCurrentUser(data);
      }
    } catch (error) {
      console.error("Error loading current user:", error);
      setCurrentUser(null);
    }
  };

  const loadWorkshops = async () => {
    try {
      const { data, error } = await workshopsFetch.GET("/api/workshops/", {
        params: {
          query: {
            limit: 100,
          },
        },
      });
      console.log("Workshops data:", data);
      if (error) {
        console.error("Failed to load workshops:", error);
        alert(
          `Failed to load workshops. Please check your connection and try again.`,
        );
        return;
      }

      if (!data || !Array.isArray(data)) {
        console.error("Invalid data received from API:", data);
        return;
      }

      // Преобразуем данные API в формат Workshop
      const transformedWorkshops: Workshop[] = data.map((workshop) => {
        const parseTime = (isoString: string): string => {
          try {
            const date = new Date(isoString);
            return date.toTimeString().substring(0, 5);
          } catch {
            return (
              isoString.split("T")[1]?.split(".")[0]?.substring(0, 5) || ""
            );
          }
        };
        return {
          id: workshop.id,
          title: workshop.name,
          body: workshop.description,
          date: workshop.dtstart.split("T")[0], // Берем только дату
          startTime: parseTime(workshop.dtstart),
          endTime: parseTime(workshop.dtend),
          room: workshop.place,
          maxPlaces: workshop.capacity,
          remainPlaces: workshop.remain_places, // Добавляем обработку оставшихся мест
          isActive: workshop.is_active,
          isRegistrable: workshop.is_registrable, // Добавляем поле для возможности регистрации
        };
      });

      setWorkshops(transformedWorkshops);
      console.log("Workshops loaded successfully:", transformedWorkshops);
    } catch (error) {
      console.error("Error loading workshops:", error);
      alert(`Unable to load workshops. Please refresh the page and try again.`);
    }
  };

  // Загружаем воркшопы при монтировании компонента
  useEffect(() => {
    loadWorkshops();

    // Загружаем информацию о пользователе с повторной попыткой если нет в датабазе
    const loadUserWithRetry = async () => {
      await loadCurrentUser();

      if (!currentUser) {
        setTimeout(async () => {
          await loadCurrentUser();
        }, 100);
      }
    };

    loadUserWithRetry();
  }, []);
  const createWorkshop = async (newWorkshop: Workshop): Promise<boolean> => {
    try {
      // Преобразуем формат даты и времени в ISO формат для API
      const startDateTime = `${newWorkshop.date}T${newWorkshop.startTime}`;
      const endDateTime = `${newWorkshop.date}T${newWorkshop.endTime}`;

      // Создаем объект запроса в формате API
      const createRequest = {
        name: newWorkshop.title,
        description: newWorkshop.body,
        capacity: newWorkshop.maxPlaces || 500,
        remain_places: newWorkshop.maxPlaces || 500, // Изначально все места свободны
        place: newWorkshop.room || "TBA",
        dtstart: startDateTime,
        dtend: endDateTime,
        is_active: newWorkshop.isActive ?? true, // По умолчанию активный
      };

      const { data, error } = await workshopsFetch.POST("/api/workshops/", {
        body: createRequest,
      });
      if (error) {
        console.error("Failed to create workshop:", error);
        alert(
          `Failed to create workshop. Please check all fields and try again.`,
        );
        return false;
      } else if (data) {
        console.log("Workshop created successfully:", data);

        const parseTime = (isoString: string): string => {
          try {
            const date = new Date(isoString);
            return date.toTimeString().substring(0, 5);
          } catch {
            return (
              isoString.split("T")[1]?.split(".")[0]?.substring(0, 5) || ""
            );
          }
        };

        // Преобразуем ответ API обратно в формат Workshop и добавляем в список
        const createdWorkshop: Workshop = {
          id: data.id,
          title: data.name,
          body: data.description,
          date: data.dtstart.split("T")[0],
          startTime: parseTime(data.dtstart),
          endTime: parseTime(data.dtend),
          room: data.place,
          maxPlaces: data.capacity,
          remainPlaces: data.remain_places || data.capacity,
          isActive: data.is_active,
        };

        setWorkshops((prevWorkshops) => [...prevWorkshops, createdWorkshop]);
        return true;
      }
    } catch (error) {
      console.error("Error creating workshop:", error);
      alert(
        `Failed to create workshop. Please check all fields and try again.`,
      );
      return false;
    }
    return false;
  };
  const removeWorkshop = async (workshop: Workshop) => {
    // Показываем диалог подтверждения перед удалением
    const confirmDelete = window.confirm(
      `Are you sure you want to delete the workshop "${workshop.title}"?\n\nThis action cannot be undone.`
    );

    if (!confirmDelete) {
      return; // Если пользователь отменил, выходим из функции
    }

    try {
      const { data, error } = await workshopsFetch.DELETE(
        `/api/workshops/{workshop_id}`,
        {
          params: {
            path: { workshop_id: workshop.id },
          },
        },
      );
      if (error) {
        console.error("Failed to delete workshop:", error);
        alert(`Failed to delete workshop. Please try again.`);
      } else {
        console.log("Workshop deleted successfully:", data);

        // Удаляем воркшоп из локального состояния
        setWorkshops(workshops.filter((w) => w.id !== workshop.id));
      }
    } catch (error) {
      console.error("Error deleting workshop:", error);
      alert(`Failed to delete workshop. Please try again.`);
    }
  };

  const editWorkshop = (workshop: Workshop) => {
    setEditingWorkshop(workshop);
    setModalVisible(true);
  };

  const updateWorkshop = async (updatedWorkshop: Workshop) => {
    try {
      // Преобразуем формат даты и времени в ISO формат для API
      const startDateTime = `${updatedWorkshop.date}T${updatedWorkshop.startTime}`;
      const endDateTime = `${updatedWorkshop.date}T${updatedWorkshop.endTime}`;

      // Создаем объект запроса в формате API
      const updateRequest = {
        name: updatedWorkshop.title,
        description: updatedWorkshop.body,
        capacity: updatedWorkshop.maxPlaces,
        remain_places:
          updatedWorkshop.remainPlaces || updatedWorkshop.maxPlaces,
        place: updatedWorkshop.room || "TBA",
        dtstart: startDateTime,
        dtend: endDateTime,
        is_active: updatedWorkshop.isActive ?? true,
      };

      const { data, error } = await workshopsFetch.PUT(
        `/api/workshops/{workshop_id}`,
        {
          params: {
            path: { workshop_id: updatedWorkshop.id },
          },
          body: updateRequest,
        },
      );
      if (error) {
        console.error("Failed to update workshop:", error);
        alert(
          `Failed to update workshop. Please check all fields and try again.`,
        );
      } else if (data) {
        console.log("Workshop updated successfully:", data);

        // Перезагружаем данные с сервера для обновления состояния
        await loadWorkshops();

        setEditingWorkshop(null);
        setModalVisible(false);
      }
    } catch (error) {
      console.error("Error updating workshop:", error);
      alert(
        `Failed to update workshop. Please check all fields and try again.`,
      );
    }
  };
  const handleModalClose = () => {
    setModalVisible(false);
    setEditingWorkshop(null);
  };

  const handleRoleChangeRequest = async () => {
    try {
      // Определяем новую роль на основе текущей роли пользователя
      const newRole = currentUser?.role === "admin" ? "user" : "admin";

      console.log(`Changing role to: ${newRole}`);

      const { data, error } = await workshopsFetch.POST("/users/change_role", {
        params: {
          query: {
            role: newRole,
          },
        },
      });
      if (error) {
        console.error("Role change failed:", error);
        alert(`Failed to change role. Please try again.`);
      } else {
        console.log("Role changed successfully:", data);

        // Перезагружаем информацию о пользователе для обновления UI
        await loadCurrentUser();
      }
    } catch (error) {
      console.error("Error during role change:", error);
      alert(`Failed to change role. Please try again.`);
    }
  };
  return (
    <div className="min-h-screen w-full">
      {" "}
      {/* Показываем кнопку изменения роли только если пользователь авторизован */}
      {currentUser && (
        <button
          className={`fixed right-2 z-[1001] cursor-pointer rounded-lg border-none bg-brand-violet px-5 py-3 text-base font-bold text-white shadow-[0_4px_12px_rgba(0,0,0,0.4)] transition-colors duration-200 ease-in-out hover:bg-brand-violet/80 lg:right-6 ${
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
      {currentUser?.role === "admin" && (
        <button
          className="fixed bottom-14 right-2 z-[1001] cursor-pointer rounded-lg border-none bg-brand-violet px-5 py-3 text-base font-bold text-white shadow-[0_4px_12px_rgba(0,0,0,0.4)] transition-colors duration-200 ease-in-out hover:bg-brand-violet/80 lg:bottom-3 lg:right-6"
          title="Add new workshop"
          onClick={() => setModalVisible(true)}
        >
          Add workshop
        </button>
      )}{" "}
      {/* Отрисовка списка воркшопов из UI/workshop_tiles */}
      <WorkshopList
        remove={removeWorkshop}
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
      >
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
                  remainPlaces: editingWorkshop.remainPlaces,
                  isActive: editingWorkshop.isActive,
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
        title={selectedWorkshop?.title}
        className="whitespace-pre-wrap break-words"
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
