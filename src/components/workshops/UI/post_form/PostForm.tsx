import React from "react";
import { useState } from "react";
import WorkshopInput from "../input/WorkshopInput";
import WorkshopTextArea from "../input/WorkshopTextArea";
import DateTimePlacePicker from "../date/DateTimePlacePicker";

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

type PostFormProps = {
  create: (workshop: Workshop) => Promise<boolean>;
  initialWorkshop?: Omit<Workshop, "id">;
  isEditing?: boolean;
  onUpdate?: (workshop: Workshop) => void;
  existingId?: string;
  onClose?: () => void;
};

const PostForm: React.FC<PostFormProps> = ({
  create,
  initialWorkshop,
  isEditing = false,
  onUpdate,
  existingId,
  onClose,
}) => {
  {
    /*Создаем состояние workshop хуком useState
    Если какое-то свойство не определено, используется пустая строка */
  }
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

  const [titleError, setTitleError] = useState("");
  const addNewWorkshop = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Проверяем, заполнено ли поле title
    if (!workshop.title.trim()) {
      setTitleError("'Title' field is required");
      return;
    }

    // Очищаем ошибку, если title заполнен
    setTitleError("");

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
          // Сброс формы после успешного создания
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
          setTitleError("");

          // Закрываем форму только при успешном создании
          if (onClose) {
            onClose();
          }
        }
        // Если success === false, модалка остается открытой
      } catch (error) {
        console.error("Error creating workshop:", error);
        // При ошибке модалка также остается открытой
      }
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setWorkshop({ ...workshop, title: e.target.value });
    // Очищаем ошибку при начале ввода
    if (titleError) {
      setTitleError("");
    }
  };

  return (
    <form onSubmit={addNewWorkshop}>
      <label className="text-white text-xs font-medium uppercase tracking-wider">Title</label>
      <WorkshopInput
        value={workshop.title}
        onChange={handleTitleChange}
        type="text"
        placeholder="Title"
      />
      {titleError && <div className="text-red-500 text-xs mt-1 mb-2">{titleError}</div>}
      <label className="text-white text-xs font-medium uppercase tracking-wider">Description</label>
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
        onDateChange={(date) => setWorkshop({ ...workshop, date })}
        onStartTimeChange={(startTime) =>
          setWorkshop({ ...workshop, startTime })
        }
        onEndTimeChange={(endTime) => setWorkshop({ ...workshop, endTime })}
        onRoomChange={(room) => setWorkshop({ ...workshop, room })}
        onMaxPlacesChange={(maxPlaces) =>
          setWorkshop({ ...workshop, maxPlaces })
        }      />{" "}
      <div className="my-4 flex items-center gap-2">
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
          className="text-white text-xs font-medium uppercase tracking-wider m-0"
        >
          Active Workshop
        </label>      </div>
      <div className="flex flex-row gap-2">
        <button
          type="button"
          className="flex w-full items-center justify-center gap-4 rounded-2xl bg-primary px-4 py-2 text-lg font-medium hover:bg-primary-hover dark:bg-primary-hover dark:hover:bg-primary"
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
