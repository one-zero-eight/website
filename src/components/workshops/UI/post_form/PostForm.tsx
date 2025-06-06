import React from "react";
import { useState } from "react";
import WorkshopInput from "../input/WorkshopInput";
import WorkshopTextArea from "../input/WorkshopTextArea";
import DateTimePicker from "../date/DateTimePicker";
import classes from "./PostForm.module.css";

type Workshop = {
  id: number;
  title: string;
  body: string;
  date: string;
  startTime: string;
  endTime: string;
};

type PostFormProps = {
  create: (workshop: Workshop) => void;
  initialWorkshop?: Omit<Workshop, "id">;
  isEditing?: boolean;
  onUpdate?: (workshop: Workshop) => void;
  existingId?: number;
};

const PostForm: React.FC<PostFormProps> = ({
  create,
  initialWorkshop,
  isEditing = false,
  onUpdate,
  existingId,
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
  });
  const addNewWorkshop = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (isEditing && onUpdate && existingId) {
      {
        /* Режим редактирования */
      }
      const updatedWorkshop = {
        ...workshop,
        id: existingId,
      };
      onUpdate(updatedWorkshop);
    } else {
      {
        /* Режим создания нового воркшопа */
      }
      const newWorkshop = {
        ...workshop,
        id: Date.now(),
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
      });
    }
  };

  return (
    <form onSubmit={addNewWorkshop}>
      <label className={classes.label}>Title</label>
      <WorkshopInput
        value={workshop.title}
        onChange={(e) => setWorkshop({ ...workshop, title: e.target.value })}
        type="text"
        placeholder="Title"
      />
      <label className={classes.label}>Description</label>
      <WorkshopTextArea
        value={workshop.body}
        onChange={(e) => setWorkshop({ ...workshop, body: e.target.value })}
        placeholder="Description"
        rows={4}
      />
      <DateTimePicker
        date={workshop.date}
        startTime={workshop.startTime}
        endTime={workshop.endTime}
        onDateChange={(date) => setWorkshop({ ...workshop, date })}
        onStartTimeChange={(startTime) =>
          setWorkshop({ ...workshop, startTime })
        }
        onEndTimeChange={(endTime) => setWorkshop({ ...workshop, endTime })}
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
