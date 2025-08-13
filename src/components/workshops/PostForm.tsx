import { $workshops, workshopsTypes } from "@/api/workshops";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useToast } from "../toast";
import { DateTimePlacePicker } from "./DateTimePlacePicker.tsx";

// Интерфейс для состояния формы
interface WorkshopFormState {
  // API поля
  name: string;
  description: string;
  dtstart: string;
  dtend: string;
  place: string;
  capacity: number;
  remain_places: number;
  is_active: boolean;
  is_registrable: boolean;
  // UI поля для работы с датой и временем
  date: string;
  startTime: string;
  endTime: string;
  room: string;
  maxPlaces: number;
  remainPlaces?: number;
}

/**
 * Форма создания и редактирования воркшопов
 */
export function PostForm({
  initialWorkshop,
  initialDate,
  onClose,
}: {
  initialWorkshop?: workshopsTypes.SchemaWorkshop;
  initialDate?: string;
  onClose?: () => void;
}) {
  const queryClient = useQueryClient();

  /*
   * Состояние формы воркшопа
   * Если initialWorkshop не передан, используются значения по умолчанию
   */
  const [workshop, setWorkshop] = useState<WorkshopFormState>({
    name: initialWorkshop?.name || "",
    description: initialWorkshop?.description || "",
    dtstart: initialWorkshop?.dtstart || "",
    dtend: initialWorkshop?.dtend || "",
    place: initialWorkshop?.place || "",
    capacity: initialWorkshop?.capacity || 500,
    remain_places: initialWorkshop?.remain_places || 0,
    is_active: initialWorkshop?.is_active ?? true,
    is_registrable: initialWorkshop?.is_registrable ?? false,
    // UI поля
    date: "",
    startTime: "",
    endTime: "",
    room: initialWorkshop?.place || "",
    maxPlaces: initialWorkshop?.capacity || 500,
    remainPlaces: initialWorkshop?.remain_places,
  });

  const [errors, setErrors] = useState<{
    title?: string;
    date?: string;
    startTime?: string;
    endTime?: string;
    time?: string;
  }>({});

  const storageKey = initialWorkshop ? null : "workshop-form-draft";

  const { showSuccess, showError, showConfirm } = useToast();

  const { mutate: createWorkshop } = $workshops.useMutation(
    "post",
    "/workshops/",
    {
      onSettled: () => {
        queryClient.invalidateQueries({
          queryKey: $workshops.queryOptions("get", "/workshops/").queryKey,
        });
      },
    },
  );

  /**
   * Обработчик создания нового воркшопа
   * Показывает соответствующие уведомления об успехе/ошибке
   */
  const handleCreateWorkshop = () => {
    const apiData = buildApiData();
    createWorkshop(
      {
        body: {
          ...apiData,
        },
      },
      {
        onSuccess: () => {
          showSuccess(
            "Workshop Created",
            `Workshop "${apiData.name}" has been successfully created.`,
          );
          clearSavedData();
          setWorkshop({
            name: "",
            description: "",
            dtstart: "",
            dtend: "",
            place: "",
            capacity: 0,
            remain_places: 0,
            is_active: true,
            is_registrable: false,
            date: "",
            startTime: "",
            endTime: "",
            room: "",
            maxPlaces: 0,
            remainPlaces: undefined,
          });
          setErrors({});
          if (onClose) {
            onClose();
          }
        },
        onError: () => {
          showError(
            "Creation Failed",
            "Failed to create workshop. Please check all fields and try again.",
          );
        },
      },
    );
  };

  const { mutate: updateWorkshop } = $workshops.useMutation(
    "put",
    "/workshops/{workshop_id}",
    {
      onSettled: () => {
        queryClient.invalidateQueries({
          queryKey: $workshops.queryOptions("get", "/workshops/").queryKey,
        });
      },
    },
  );

  /**
   * Обработчик обновления существующего воркшопа
   */
  const handleUpdateWorkshop = () => {
    if (!initialWorkshop) return;

    const apiData = buildApiData();
    updateWorkshop(
      {
        params: { path: { workshop_id: initialWorkshop.id } },
        body: apiData,
      },
      {
        onSuccess: () => {
          showSuccess(
            "Workshop Updated",
            `Workshop "${apiData.name}" has been successfully updated.`,
          );
          onClose?.();
        },
        onError: () => {
          showError(
            "Update Failed",
            "Failed to update workshop. Please check all fields and try again.",
          );
        },
      },
    );
  };

  const { mutate: removeWorkshop } = $workshops.useMutation(
    "delete",
    "/workshops/{workshop_id}",
    {
      onSettled: () => {
        queryClient.invalidateQueries({
          queryKey: $workshops.queryOptions("get", "/workshops/").queryKey,
        });
        onClose?.();
      },
    },
  );

  /**
   * Обработчик удаления воркшопа
   * Показывает диалог подтверждения перед удалением
   */
  const handleRemoveWorkshop = async () => {
    if (!initialWorkshop) return;

    const confirmed = await showConfirm({
      title: "Delete Workshop",
      message: `Are you sure you want to delete the workshop "${initialWorkshop.name}"?\n\nThis action cannot be undone.`,
      confirmText: "Delete",
      cancelText: "Cancel",
      type: "error",
    });

    if (!confirmed) {
      return;
    }

    removeWorkshop(
      { params: { path: { workshop_id: initialWorkshop.id } } },
      {
        onSuccess: () => {
          showSuccess(
            "Workshop Deleted",
            `Workshop "${initialWorkshop.name}" has been successfully deleted.`,
          );
        },
        onError: () => {
          showError(
            "Delete Failed",
            "Failed to delete workshop. Please try again.",
          );
        },
      },
    );
  };

  // Загружаем сохраненные данные при монтировании компонента (только для создания)
  useEffect(() => {
    if (!storageKey) return;

    const savedData = localStorage.getItem(storageKey);
    if (savedData) {
      const parsedData = JSON.parse(savedData);
      setWorkshop((v) => ({
        ...parsedData,
        date: v.date,
        startTime: v.startTime,
        endTime: v.endTime,
        dtstart: v.dtstart,
        dtend: v.dtend,
      }));
    }
  }, [storageKey]);

  // Инициализируем UI поля из API данных при редактировании
  useEffect(() => {
    if (!initialWorkshop && !initialDate) return;

    // Парсим дату и время из API полей
    let date = "";
    let startTime = "";
    let endTime = "";

    if (initialWorkshop?.dtstart || initialDate) {
      const dtstartDate = new Date(
        initialWorkshop?.dtstart || `${initialDate}T18:00:00+03:00`,
      );
      date = dtstartDate.toISOString().split("T")[0];
      startTime = dtstartDate.toTimeString().slice(0, 5);
    }

    if (initialWorkshop?.dtend || initialDate) {
      const dtendDate = new Date(
        initialWorkshop?.dtend || `${initialDate}T20:00:00+03:00`,
      );
      endTime = dtendDate.toTimeString().slice(0, 5);
    }

    setWorkshop((prev) => ({
      ...prev,
      name: initialWorkshop?.name || "",
      description: initialWorkshop?.description || "",
      dtstart: initialWorkshop?.dtstart || `${initialDate}T18:00:00+03:00`,
      dtend: initialWorkshop?.dtend || `${initialDate}T20:00:00+03:00`,
      place: initialWorkshop?.place || "",
      capacity: initialWorkshop?.capacity || 500,
      remain_places: initialWorkshop?.remain_places || 500,
      is_active: initialWorkshop?.is_active ?? true,
      is_registrable: initialWorkshop?.is_registrable ?? false,
      // UI поля
      date,
      startTime,
      endTime,
      room: initialWorkshop?.place || "",
      maxPlaces: initialWorkshop?.capacity || 500,
      remainPlaces: initialWorkshop?.remain_places,
    }));
  }, [initialDate, initialWorkshop]);

  // Сохраняем данные в localStorage при изменении формы (только для создания)
  useEffect(() => {
    if (!storageKey) return;

    // Сохраняем только если есть хотя бы одно заполненное поле
    const hasContent =
      workshop.name ||
      workshop.description ||
      workshop.dtstart ||
      workshop.dtend ||
      workshop.place ||
      workshop.capacity > 0;

    if (hasContent) {
      localStorage.setItem(storageKey, JSON.stringify(workshop));
    }
  }, [workshop, storageKey]);

  // Функция для очистки сохраненных данных
  const clearSavedData = () => {
    if (storageKey) {
      localStorage.removeItem(storageKey);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    // Проверка обязательных полей
    if (!workshop.name.trim()) {
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

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Валидация формы
    if (!validateForm()) return;

    if (initialWorkshop) {
      handleUpdateWorkshop();
    } else {
      handleCreateWorkshop();
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setWorkshop({ ...workshop, name: e.target.value });
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

  // Функция для преобразования UI полей в API поля
  const buildApiData = () => {
    let dtstart = workshop.dtstart;
    let dtend = workshop.dtend;

    // Если есть UI поля даты и времени, формируем API поля
    if (workshop.date && workshop.startTime) {
      dtstart = `${workshop.date}T${workshop.startTime}:00+03:00`;
    }
    if (workshop.date && workshop.endTime) {
      dtend = `${workshop.date}T${workshop.endTime}:00+03:00`;
    }

    return {
      name: workshop.name,
      description: workshop.description,
      dtstart,
      dtend,
      place: workshop.room.trim() || "TBA",
      capacity: workshop.maxPlaces || 500,
      is_active: workshop.is_active,
    };
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
      name: "",
      description: "",
      dtstart: "",
      dtend: "",
      place: "",
      capacity: 500,
      remain_places: 500,
      is_active: true,
      is_registrable: false,
      date: "",
      startTime: "",
      endTime: "",
      room: "",
      maxPlaces: 500,
      remainPlaces: undefined,
    });

    // Очищаем все ошибки
    setErrors({});

    // Очищаем сохраненные данные в localStorage
    clearSavedData();
  };

  return (
    <form onSubmit={onSubmit}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium uppercase tracking-wider text-gray-800 dark:text-white">
          Title <span className="text-red-500">*</span>
        </label>
        {!initialWorkshop && (
          <button
            type="button"
            className="rounded-lg border border-red-400 bg-red-200 px-3 py-1 text-xs font-medium text-red-900 hover:bg-red-300 dark:border-red-600 dark:bg-red-900 dark:text-red-300 dark:hover:bg-red-950"
            onClick={handleClearForm}
          >
            Clear Form
          </button>
        )}
      </div>
      <input
        className="my-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition-all duration-300 focus:border-violet-400 focus:shadow-[0_0_5px_rgba(122,122,210,0.3)] dark:border-white/30 dark:bg-white/10 dark:text-white dark:focus:border-violet-400/60"
        value={workshop.name}
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
      <textarea
        className="font-inherit my-2 max-h-[200px] min-h-[120px] w-full resize-none overflow-y-auto rounded-lg border border-gray-300 bg-white px-[15px] py-[10px] text-sm text-gray-900 outline-none transition-all duration-300 ease-in-out placeholder:text-gray-400 focus:border-violet-400 focus:shadow-[0_0_5px_rgba(122,122,210,0.3)] dark:border-white/30 dark:bg-white/10 dark:text-white dark:focus:border-violet-400/60"
        value={workshop.description}
        onChange={(e) =>
          setWorkshop({ ...workshop, description: e.target.value })
        }
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
            checked={workshop.is_active}
            onChange={(e) =>
              setWorkshop({ ...workshop, is_active: e.target.checked })
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
        {initialWorkshop && (
          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-red-400 bg-red-200 px-4 py-2 text-lg font-medium text-red-900 hover:bg-red-300 dark:border-red-600 dark:bg-red-900 dark:text-red-300 dark:hover:bg-red-950"
            onClick={handleRemoveWorkshop}
          >
            DELETE
          </button>
        )}
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
          {initialWorkshop ? "UPDATE" : "ADD"}
        </button>
      </div>
    </form>
  );
}
