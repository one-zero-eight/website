/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from "react";
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
  remainPlaces?: number; // Добавляем поле для оставшихся мест
  isActive?: boolean;
};
/*jefjkd*/
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

  const openDescription = (workshop: Workshop) => {
    setSelectedWorkshop(workshop);
    setDescriptionVisible(true);
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

      if (error) {
        console.error("Failed to load workshops:", error);
        alert(`Failed to load workshops: ${JSON.stringify(error)}`);
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
          remainPlaces: workshop.remain_places || 0, // Добавляем обработку оставшихся мест
          isActive: workshop.is_active,
        };
      });

      setWorkshops(transformedWorkshops);
    } catch (error) {
      console.error("Error loading workshops:", error);
      alert(
        `Error loading workshops: ${error instanceof Error ? error.message : String(error)}`,
      );
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

  const createWorkshop = async (newWorkshop: Workshop) => {
    try {
      // Преобразуем формат даты и времени в ISO формат для API
      const startDateTime = `${newWorkshop.date}T${newWorkshop.startTime}`;
      const endDateTime = `${newWorkshop.date}T${newWorkshop.endTime}`;

      // Создаем объект запроса в формате API
      const createRequest = {
        name: newWorkshop.title,
        description: newWorkshop.body,
        capacity: newWorkshop.maxPlaces || 500,
        remain_places: newWorkshop.maxPlaces, // Изначально все места свободны
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
        alert(`Failed to create workshop: ${JSON.stringify(error)}`);
      } else if (data) {
        console.log("Workshop created successfully:", data);
        alert("Workshop created successfully!");

        // Преобразуем ответ API обратно в формат Workshop и добавляем в список
        const createdWorkshop: Workshop = {
          id: data.id,
          title: data.name,
          body: data.description,
          date: data.dtstart.split("T")[0],
          startTime: data.dtstart.split("T")[1]?.split(".")[0] || "",
          endTime: data.dtend.split("T")[1]?.split(".")[0] || "",
          room: data.place,
          maxPlaces: data.capacity,
          remainPlaces: data.remain_places || data.capacity, // Используем remain_places или capacity как fallback
          isActive: data.is_active,
        };

        setWorkshops((prevWorkshops) => [...prevWorkshops, createdWorkshop]);
      }
    } catch (error) {
      console.error("Error creating workshop:", error);
      alert(
        `Error creating workshop: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };

  const removeWorkshop = async (workshop: Workshop) => {
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
        alert(`Failed to delete workshop: ${JSON.stringify(error)}`);
      } else {
        console.log("Workshop deleted successfully:", data);
        alert("Workshop deleted successfully!");

        // Удаляем воркшоп из локального состояния
        setWorkshops(workshops.filter((w) => w.id !== workshop.id));
      }
    } catch (error) {
      console.error("Error deleting workshop:", error);
      alert(
        `Error deleting workshop: ${error instanceof Error ? error.message : String(error)}`,
      );
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
        alert(`Failed to update workshop: ${JSON.stringify(error)}`);
      } else if (data) {
        console.log("Workshop updated successfully:", data);
        alert("Workshop updated successfully!");

        // Перезагружаем данные с сервера для обновления состояния
        await loadWorkshops();

        setEditingWorkshop(null);
        setModalVisible(false);
      }
    } catch (error) {
      console.error("Error updating workshop:", error);
      alert(
        `Error updating workshop: ${error instanceof Error ? error.message : String(error)}`,
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
        alert(`Role change failed: ${JSON.stringify(error)}`);
      } else {
        console.log("Role changed successfully:", data);
        alert(`Role changed to ${newRole} successfully!`);

        // Перезагружаем информацию о пользователе для обновления UI
        await loadCurrentUser();
      }
    } catch (error) {
      console.error("Error during role change:", error);
      alert(
        `Error during role change: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };

  return (
    <div className="App">
      {/* Показываем кнопку изменения роли только если пользователь авторизован */}
      {currentUser && (
        <button
          className="fab-button"
          title={`Set ${currentUser.role === "admin" ? "user" : "admin"} role`}
          onClick={handleRoleChangeRequest}
          style={{
            bottom: currentUser.role === "admin" ? "80px" : "24px",
          }}
        >
          Set {currentUser.role === "admin" ? "user" : "admin"}
        </button>
      )}
      {/* Показываем кнопку добавления воркшопа только для администраторов */}
      {currentUser?.role === "admin" && (
        <button
          className="fab-button"
          title="Add new workshop"
          onClick={() => setModalVisible(true)}
          style={{
            bottom: "24px",
          }}
        >
          Add workshop
        </button>
      )}{" "}
      {/* Отрисовка списка воркшопов из UI/workshop_tiles */}
      <WorkshopList
        remove={removeWorkshop}
        edit={editWorkshop}
        workshops={workshops}
        title={"Workshops list"}
        openDescription={openDescription}
        currentUserRole={currentUser?.role || "user"}
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
                  remainPlaces: editingWorkshop.remainPlaces,
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
