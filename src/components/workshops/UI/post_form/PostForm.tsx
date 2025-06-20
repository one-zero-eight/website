import React from "react";
import { useState } from "react";
import WorkshopInput from "../input/WorkshopInput";
import WorkshopTextArea from "../input/WorkshopTextArea";
import DateTimePlacePicker from "../date/DateTimePlacePicker";
import classes from "./PostForm.module.css";

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
      <label className={classes.label}>
        Title
      </label>
      <WorkshopInput
        value={workshop.title}
        onChange={handleTitleChange}
        type="text"
        placeholder="Title"
      />
      {titleError && <div className={classes.error}>{titleError}</div>}
      <label className={classes.label}>Description</label>
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
        }
      />{" "}
      <div
        style={{
          margin: "16px 0",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <input
          type="checkbox"
          id="isActive"
          checked={workshop.isActive}
          onChange={(e) =>
            setWorkshop({ ...workshop, isActive: e.target.checked })
          }
          style={{ width: "auto" }}
        />
        <label
          htmlFor="isActive"
          className={classes.label}
          style={{ margin: 0 }}
        >
          Active Workshop
        </label>
      </div>
      <div className={classes["button-container"]}>
        <button className={classes["add-button"]} type="submit">
          {isEditing ? "UPDATE" : "ADD"}
        </button>
      </div>
    </form>
  );
};

export default PostForm;
