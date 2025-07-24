/* eslint-disable @typescript-eslint/no-unused-vars */
import React from "react";
import { useState, useEffect } from "react";
import WorkshopInput from "../input/WorkshopInput";
import WorkshopTextArea from "../input/WorkshopTextArea";
import DateTimePlacePicker from "../date/DateTimePlacePicker";
import { useToast } from "../../toast";
import type { Workshop, PostFormProps } from "../../types";

/**
 * Форма создания и редактирования воркшопов
 */
const PostForm: React.FC<PostFormProps> = ({
  create,
  initialWorkshop,
  isEditing = false,
  onUpdate,
  existingId,
  onClose,
}) => {
  /*
   * Состояние формы воркшопа
   * Если initialWorkshop не передан, используются значения по умолчанию
   */
  const [workshop, setWorkshop] = useState({
    title: initialWorkshop?.title || "",
    body: initialWorkshop?.body || "",
    date: initialWorkshop?.date || "",
    startTime: initialWorkshop?.startTime || "",
    endTime: initialWorkshop?.endTime || "",
    room: initialWorkshop?.room || "",
    maxPlaces: initialWorkshop?.maxPlaces || 0,
    remainPlaces: initialWorkshop?.remainPlaces,
    isActive: initialWorkshop?.isActive ?? true,
  });

  const [errors, setErrors] = useState<{
    title?: string;
    date?: string;
    startTime?: string;
    endTime?: string;
    time?: string;
  }>({});

  const storageKey = isEditing ? null : "workshop-form-draft";

  const { showConfirm, showSuccess, showError, showWarning } = useToast();

  // Загружаем сохраненные данные при монтировании компонента (только для создания)
  useEffect(() => {
    if (!isEditing && storageKey) {
      const savedData = localStorage.getItem(storageKey);
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        setWorkshop(parsedData);
      }
    }
  }, [isEditing, storageKey]);

  // Сохраняем данные в localStorage при изменении формы (только для создания)
  useEffect(() => {
    if (!isEditing && storageKey) {
      // Сохраняем только если есть хотя бы одно заполненное поле
      const hasContent =
        workshop.title ||
        workshop.body ||
        workshop.date ||
        workshop.startTime ||
        workshop.endTime ||
        workshop.room ||
        workshop.maxPlaces > 0;

      if (hasContent) {
        localStorage.setItem(storageKey, JSON.stringify(workshop));
      }
    }
  }, [workshop, isEditing, storageKey]);

  // Функция для очистки сохраненных данных
  const clearSavedData = () => {
    if (storageKey) {
      localStorage.removeItem(storageKey);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    // Проверка обязательных полей
    if (!workshop.title.trim()) {
      newErrors.title = "Title is required";
      showError("Validation Error", "Title is required");
    }

    if (!workshop.date) {
      newErrors.date = "Date is required";
      showError("Validation Error", "Date is required");
    }

    if (!workshop.startTime) {
      newErrors.startTime = "Start time is required";
      showError("Validation Error", "Start time is required");
    }

    if (!workshop.endTime) {
      newErrors.endTime = "End time is required";
      showError("Validation Error", "End time is required");
    }

    // Проверка даты и времени (не должна быть в прошлом)
    if (workshop.date && workshop.startTime) {
      const workshopDateTime = new Date(
        `${workshop.date}T${workshop.startTime}`,
      );
      const now = new Date();

      if (workshopDateTime < now) {
        newErrors.date = "Workshop cannot be scheduled in the past";
        showError(
          "Validation Error",
          "Workshop cannot be scheduled in the past",
        );
      }
    } else if (workshop.date) {
      // Если только дата указана, проверяем только дату
      const workshopDate = new Date(workshop.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (workshopDate < today) {
        newErrors.date = "Workshop cannot be scheduled in the past";
        showError(
          "Validation Error",
          "Workshop cannot be scheduled in the past",
        );
      }
    }

    // Проверка времени (время начала должно быть меньше времени окончания)
    if (workshop.startTime && workshop.endTime) {
      const startTime = new Date(`2000-01-01T${workshop.startTime}`);
      const endTime = new Date(`2000-01-01T${workshop.endTime}`);

      if (startTime >= endTime) {
        newErrors.time = "Start time must be earlier than end time";
        showError(
          "Validation Error",
          "Start time must be earlier than end time",
        );
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const addNewWorkshop = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Валидация формы
    if (!validateForm()) {
      return;
    }

    if (isEditing && onUpdate && existingId) {
      {
        /* Режим редактирования */
      }
      const updatedWorkshop = {
        ...workshop,
        id: existingId,
        room: workshop.room.trim() || "TBA", // Подставляем TBA если поле пустое
        maxPlaces: workshop.maxPlaces || 0,
        remainPlaces: workshop.remainPlaces,
      };
      onUpdate(updatedWorkshop);

      // Закрываем форму после обновления
      if (onClose) {
        onClose();
      }
    } else {
      {
        /* Режим создания нового воркшопа */
      }
      const newWorkshop = {
        ...workshop,
        id: Date.now().toString(),
        room: workshop.room.trim() || "TBA", // Подставляем TBA если поле пустое
        maxPlaces: workshop.maxPlaces || 0,
      };
      try {
        const success = await create(newWorkshop);
        if (success) {
          clearSavedData();
          setWorkshop({
            title: "",
            body: "",
            date: "",
            startTime: "",
            endTime: "",
            room: "",
            maxPlaces: 0,
            remainPlaces: undefined,
            isActive: true,
          });
          setErrors({});
          if (onClose) {
            onClose();
          }
        }
      } catch (error) {
        // При ошибке модалка остается открытой
      }
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setWorkshop({ ...workshop, title: e.target.value });
    // Очищаем ошибку заголовка при изменении
    if (errors.title) {
      setErrors({ ...errors, title: undefined });
    }
  };

  const handleDateChange = (date: string) => {
    setWorkshop({ ...workshop, date });
    // Очищаем ошибки даты при изменении
    if (errors.date) {
      setErrors({ ...errors, date: undefined });
    }
  };

  const handleStartTimeChange = (startTime: string) => {
    setWorkshop({ ...workshop, startTime });
    // Очищаем ошибки времени при изменении
    if (errors.startTime || errors.time) {
      setErrors({ ...errors, startTime: undefined, time: undefined });
    }
  };

  const handleEndTimeChange = (endTime: string) => {
    setWorkshop({ ...workshop, endTime });
    // Очищаем ошибки времени при изменении
    if (errors.endTime || errors.time) {
      setErrors({ ...errors, endTime: undefined, time: undefined });
    }
  };
  const isUnlimited = workshop.maxPlaces === 500;

  const handleUnlimitedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setWorkshop({
      ...workshop,
      maxPlaces: checked ? 500 : 0,
      remainPlaces: checked ? 500 : undefined,
    });
  };

  const handleClearForm = () => {
    // Очищаем все поля формы
    setWorkshop({
      title: "",
      body: "",
      date: "",
      startTime: "",
      endTime: "",
      room: "",
      maxPlaces: 0,
      remainPlaces: undefined,
      isActive: true,
    });

    // Очищаем все ошибки
    setErrors({});

    // Очищаем сохраненные данные в localStorage
    clearSavedData();
  };

  return (
    <form onSubmit={addNewWorkshop}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium uppercase tracking-wider text-gray-800 dark:text-white">
          Title <span className="text-red-500">*</span>
        </label>
        {!isEditing && (
          <button
            type="button"
            className="rounded-lg border border-red-400 bg-red-200 px-3 py-1 text-xs font-medium text-red-900 hover:bg-red-300 dark:border-red-600 dark:bg-red-900 dark:text-red-300 dark:hover:bg-red-950"
            onClick={handleClearForm}
          >
            Clear Form
          </button>
        )}
      </div>
      <WorkshopInput
        value={workshop.title}
        onChange={handleTitleChange}
        type="text"
        placeholder="Title"
      />
      {errors.title && (
        <p className="mt-1 text-sm text-red-500 dark:text-red-400">
          {errors.title}
        </p>
      )}
      <label className="text-xs font-medium uppercase tracking-wider text-gray-800 dark:text-white">
        Description
      </label>
      <WorkshopTextArea
        value={workshop.body}
        onChange={(e) => setWorkshop({ ...workshop, body: e.target.value })}
        placeholder="Description"
        rows={4}
      />
      <DateTimePlacePicker
        date={workshop.date}
        startTime={workshop.startTime}
        endTime={workshop.endTime}
        room={workshop.room}
        maxPlaces={workshop.maxPlaces}
        onDateChange={handleDateChange}
        onStartTimeChange={handleStartTimeChange}
        onEndTimeChange={handleEndTimeChange}
        onRoomChange={(room) => setWorkshop({ ...workshop, room })}
        onMaxPlacesChange={(maxPlaces) =>
          setWorkshop({ ...workshop, maxPlaces })
        }
        isPlacesDisabled={isUnlimited}
      />
      {/* Отображение ошибок валидации */}
      {errors.date && (
        <p className="mt-1 text-sm text-red-500 dark:text-red-400">
          {errors.date}
        </p>
      )}
      {errors.startTime && (
        <p className="mt-1 text-sm text-red-500 dark:text-red-400">
          {errors.startTime}
        </p>
      )}
      {errors.endTime && (
        <p className="mt-1 text-sm text-red-500 dark:text-red-400">
          {errors.endTime}
        </p>
      )}
      {errors.time && (
        <p className="mt-1 text-sm text-red-500 dark:text-red-400">
          {errors.time}
        </p>
      )}
      <div className="my-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isActive"
            checked={workshop.isActive}
            onChange={(e) =>
              setWorkshop({ ...workshop, isActive: e.target.checked })
            }
            className="w-auto"
          />
          <label
            htmlFor="isActive"
            className="m-0 text-xs font-medium uppercase tracking-wider text-gray-800 dark:text-white"
          >
            Active Workshop
          </label>{" "}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isUnlimited"
            checked={isUnlimited}
            onChange={handleUnlimitedChange}
            className="w-auto"
          />
          <label
            htmlFor="isUnlimited"
            className="m-0 text-xs font-medium uppercase tracking-wider text-gray-800 dark:text-white"
          >
            Unlimited Places
          </label>
        </div>
      </div>
      <div className="flex flex-row gap-2">
        <button
          type="button"
          className="flex w-full items-center justify-center gap-4 rounded-2xl bg-gray-200 px-4 py-2 text-lg font-medium text-gray-800 hover:bg-gray-300 dark:bg-primary-hover dark:text-white dark:hover:bg-primary"
          onClick={() => onClose && onClose()}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-purple-400 bg-purple-200 px-4 py-2 text-lg font-medium text-purple-900 hover:bg-purple-300 dark:border-purple-600 dark:bg-purple-900 dark:text-purple-300 dark:hover:bg-purple-950"
        >
          {isEditing ? "UPDATE" : "ADD"}
        </button>
      </div>
    </form>
  );
};

export default PostForm;
