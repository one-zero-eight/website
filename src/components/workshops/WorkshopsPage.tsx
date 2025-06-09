import React, { useState } from "react";
import "./styles/App.css";
import WorkshopList from "./UI/workshop_tiles/WorkshopList";
import PostForm from "@/components/workshops/UI/post_form/PostForm.tsx";
import Modal from "./UI/modal/ModalWindow";
import Description from "./UI/description_form/Description";
import styles from "./UI/modal/ModalWindow.module.css";
import { workshopsFetch } from "@/api/workshops";
import { useMyAccessToken } from "@/api/helpers/access-token";

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

  // ===== РАБОТА С АВТОРИЗАЦИЕЙ =====
  // Используем хук для работы с токеном доступа
  // token - текущий токен пользователя (null если не авторизован)
  // setToken - функция для сохранения нового токена
  const [token, setToken] = useMyAccessToken();

  // Закомментированные переменные для ручного ввода данных авторизации
  // const [email, setEmail] = useState("");
  // const [password, setPassword] = useState("");

  const openDescription = (workshop: Workshop) => {
    setSelectedWorkshop(workshop);
    setDescriptionVisible(true);
  };

  const createWorkshop = async (newWorkshop: Workshop) => {
    try {
      // ===== КАК ПИСАТЬ ЗАПРОСЫ К БЭКЕНДУ =====

      // 1. ПОДГОТОВКА ДАННЫХ ДЛЯ API
      // Часто фронтенд и бэкенд используют разные названия полей
      // Нужно преобразовать данные из формата фронтенда в формат API
      const apiWorkshop = {
        name: newWorkshop.title, // title -> name
        alias: newWorkshop.body, // body -> alias
        dtstart: combineDateAndTime(newWorkshop.date, newWorkshop.startTime), // объединяем дату и время
        dtend: combineDateAndTime(newWorkshop.date, newWorkshop.endTime),
        place: newWorkshop.room, // room -> place
        capacity: newWorkshop.maxPlaces, // maxPlaces -> capacity
        remain_places: newWorkshop.maxPlaces, // изначально свободных мест столько же
        is_active: newWorkshop.isActive ?? true, // если не указано, то по умолчанию активен
      };

      // 2. ВЫПОЛНЕНИЕ HTTP-ЗАПРОСА
      // workshopsFetch - это наш клиент для работы с API
      // POST - HTTP метод для создания новых ресурсов
      // "/api/workshops/" - эндпоинт (адрес) на бэкенде
      // body - данные которые отправляем на сервер
      const { data, error } = await workshopsFetch.POST("/api/workshops/", {
        body: apiWorkshop,
      });

      // 3. ОБРАБОТКА ОТВЕТА ОТ СЕРВЕРА
      // Сервер может вернуть либо данные (data), либо ошибку (error)
      if (error) {
        // Если произошла ошибка - логируем её и показываем пользователю
        console.error("Workshop creation failed:", error);
        alert(`Workshop creation failed: ${JSON.stringify(error)}`);
      } else {
        // Если всё хорошо - обрабатываем успешный ответ
        console.log("Workshop created successfully:", data);
        alert("Workshop created successfully!");

        // 4. ПРЕОБРАЗОВАНИЕ ДАННЫХ ОБРАТНО
        // Сервер вернул данные в своём формате, нужно преобразовать их
        // обратно в формат нашего фронтенда для отображения
        const localWorkshop: Workshop = {
          id: data.id,
          title: data.name, // name -> title
          body: newWorkshop.body, // сохраняем оригинальное описание
          date: newWorkshop.date, // сохраняем оригинальные данные
          startTime: newWorkshop.startTime,
          endTime: newWorkshop.endTime,
          room: data.place, // place -> room
          maxPlaces: data.capacity, // capacity -> maxPlaces
        };

        // 5. ОБНОВЛЕНИЕ СОСТОЯНИЯ ПРИЛОЖЕНИЯ
        // Добавляем новый воркшоп в локальное состояние
        // Используем spread оператор (...) чтобы создать новый массив
        setWorkshops([...workshops, localWorkshop]);
      }
    } catch (error) {
      // 6. ОБРАБОТКА ИСКЛЮЧЕНИЙ
      // Если произошла критическая ошибка (сеть недоступна, сервер упал и т.д.)
      console.error("Error during workshop creation:", error);
      alert(
        `Error during workshop creation: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };

  // ===== ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ ДЛЯ РАБОТЫ С ДАТАМИ =====
  // Бэкенд часто ожидает даты в формате ISO 8601 (например: 2023-12-25T14:30:00.000Z)
  // Эта функция объединяет отдельные поля даты и времени в один ISO-формат
  const combineDateAndTime = (date: string, time: string): string => {
    if (!date || !time) {
      // Если данные не переданы, возвращаем текущее время
      return new Date().toISOString();
    }
    // Создаём объект Date из строки вида "2023-12-25T14:30"
    const datetime = new Date(`${date}T${time}`);
    // Преобразуем в ISO формат для отправки на сервер
    return datetime.toISOString();
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
  const handleTestRegister = async () => {
    try {
      // ===== ПРИМЕР ЗАПРОСА НА РЕГИСТРАЦИЮ ПОЛЬЗОВАТЕЛЯ =====

      // 1. ОТПРАВЛЯЕМ POST ЗАПРОС НА ЭНДПОИНТ РЕГИСТРАЦИИ
      // POST используется для создания новых ресурсов (в данном случае - нового пользователя)
      const { data, error } = await workshopsFetch.POST("/users/register", {
        body: {
          email: "test-user20", // email пользователя
          password: "test-password4", // пароль пользователя
        },
      });

      // 2. ПРОВЕРЯЕМ РЕЗУЛЬТАТ ЗАПРОСА
      if (error) {
        // Если сервер вернул ошибку (неправильные данные, пользователь уже существует и т.д.)
        console.error("Registration failed:", error);
        alert("Registration failed");
      } else {
        // Если регистрация прошла успешно
        console.log("Registration successful:", data);
        alert(`Registration successful! Token: ${data.access_token}`);

        // 3. СОХРАНЯЕМ ПОЛУЧЕННЫЙ ТОКЕН
        // Токен нужен для авторизованных запросов к API
        // Сохраняем его через специальный хук
        setToken(data.access_token);
      }
    } catch (error) {
      // Обработка критических ошибок (проблемы с сетью и т.д.)
      console.error("Error during registration:", error);
      alert("Error during registration");
    }
  };

  const handleRoleChangeRequest = async () => {
    try {
      // ===== ПРИМЕР АВТОРИЗОВАННОГО ЗАПРОСА С ПАРАМЕТРАМИ =====

      // Логируем текущий токен для отладки
      console.log("Current token:", token);
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
        disabled={!token}
      >
        Set admin
      </button>
      <button
        className="reg-button"
        title="Test register"
        onClick={handleTestRegister}
        style={{ marginRight: "10px" }}
      >
        Test register
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
        token={token}
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
