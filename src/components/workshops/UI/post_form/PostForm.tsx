import React from "react";
import { useState } from "react";
import WorkshopInput from "../input/WorkshopInput";
import WorkshopTextArea from "../input/WorkshopTextArea";
import DateTimePlacePicker from "../date/DateTimePlacePicker";
import classes from "./PostForm.module.css";

type Workshop = {
  id: number;
  title: string;
  body: string;
  date: string;
  startTime: string;
  endTime: string;
  room: string;
};

type PostFormProps = {
  create: (workshop: Workshop) => void;
  initialWorkshop?: Omit<Workshop, "id">;
  isEditing?: boolean;
  onUpdate?: (workshop: Workshop) => void;
  existingId?: number;
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
  });

  const [titleError, setTitleError] = useState("");
  const addNewWorkshop = (e: React.FormEvent<HTMLFormElement>) => {
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
        id: Date.now(),
        room: workshop.room.trim() || "TBA", // Подставляем TBA если поле пустое
      };
      create(newWorkshop);
    }

    {
      /* Сброс формы после добавления или обновления */
    }
    if (!isEditing) {
      setWorkshop({
        title: "",
        body: "",
        date: "",
        startTime: "",
        endTime: "",
        room: "",
      });
      setTitleError("");
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
        Title <span className={classes.required}>*</span>
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
        onDateChange={(date) => setWorkshop({ ...workshop, date })}
        onStartTimeChange={(startTime) =>
          setWorkshop({ ...workshop, startTime })
        }
        onEndTimeChange={(endTime) => setWorkshop({ ...workshop, endTime })}
        onRoomChange={(room) => setWorkshop({ ...workshop, room })}
      />{" "}
      <div className={classes["button-container"]}>
        <button className={classes["add-button"]} type="submit">
          {isEditing ? "UPDATE" : "ADD"}
        </button>
      </div>
    </form>
  );
};

export default PostForm;
