import { $workshops, workshopsTypes } from "@/api/workshops";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useToast } from "../toast";
import { DateTimePlacePicker } from "./DateTimePlacePicker.tsx";
import clsx from "clsx";

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

  const storageKey = initialWorkshop ? null : "workshop-form-draft";

  /*
   * Состояние формы воркшопа
   * Если initialWorkshop не передан, используются значения по умолчанию
   */
  const [workshop, setWorkshop] = useState<WorkshopFormState>(() => {
    const base = {
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
    };

    if (initialWorkshop) {
      const dtstartDate = new Date(initialWorkshop.dtstart);
      const dtendDate = new Date(initialWorkshop.dtend);
      return {
        ...base,
        ...initialWorkshop,
        date: dtstartDate.toISOString().split("T")[0],
        startTime: dtstartDate.toTimeString().slice(0, 5),
        endTime: dtendDate.toTimeString().slice(0, 5),
        room: initialWorkshop.place || "",
        maxPlaces: initialWorkshop.capacity || 500,
        remainPlaces: initialWorkshop.remain_places,
      };
    }

    if (initialDate) {
      return {
        ...base,
        date: initialDate,
        startTime: "18:00",
        endTime: "20:00",
      };
    }

    const savedData = storageKey ? localStorage.getItem(storageKey) : null;
    if (savedData) {
      return { ...base, ...JSON.parse(savedData) };
    }

    return base;
  });

  const [errors, setErrors] = useState<{
    title?: string;
    date?: string;
    startTime?: string;
    endTime?: string;
    time?: string;
  }>({});

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

  // const handleClearForm = () => {
  //   // Очищаем все поля формы
  //   setWorkshop({
  //     name: "",
  //     description: "",
  //     dtstart: "",
  //     dtend: "",
  //     place: "",
  //     capacity: 500,
  //     remain_places: 500,
  //     is_active: true,
  //     is_registrable: false,
  //     date: "",
  //     startTime: "",
  //     endTime: "",
  //     room: "",
  //     maxPlaces: 500,
  //     remainPlaces: undefined,
  //   });

  //   // Очищаем все ошибки
  //   setErrors({});

  //   // Очищаем сохраненные данные в localStorage
  //   clearSavedData();
  // };

  return (
    <form onSubmit={onSubmit}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium tracking-wider text-gray-800 uppercase dark:text-white">
          Title <span className="text-red-500">*</span>
        </label>
      </div>
      <input
        className="input w-full"
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
      <label className="text-xs font-medium tracking-wider text-gray-800 uppercase dark:text-white">
        Description
      </label>
      <textarea
        className="textarea w-full resize-none"
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
      <div className="my-4 flex items-center justify-between gap-2 select-none">
        <label className="label" htmlFor="isActive">
          <input
            type="checkbox"
            id="isActive"
            checked={workshop.is_active}
            onChange={(e) =>
              setWorkshop({ ...workshop, is_active: e.target.checked })
            }
            className="checkbox rounded-md"
          />
          Active Workshop
        </label>
        <label className="label" htmlFor="isUnlimited">
          <input
            type="checkbox"
            id="isUnlimited"
            className="checkbox rounded-md"
            checked={isUnlimited}
            onChange={handleUnlimitedChange}
          />
          Unlimited Places
        </label>
      </div>
      <div
        className={clsx(
          "grid gap-2",
          initialWorkshop ? "grid-cols-3" : "grid-cols-2",
        )}
      >
        {initialWorkshop && (
          <button
            type="button"
            className="btn btn-error"
            onClick={handleRemoveWorkshop}
          >
            DELETE
          </button>
        )}
        <button
          type="button"
          className="btn btn-outline"
          onClick={() => onClose && onClose()}
        >
          Cancel
        </button>
        <button type="submit" className="btn btn-primary">
          {initialWorkshop ? "Update" : "Add"}
        </button>
      </div>
    </form>
  );
}
