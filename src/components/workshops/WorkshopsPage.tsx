import React, { useState } from "react";
import "./styles/App.css";
import WorkshopList from "./UI/workshop_tiles/WorkshopList";
import PostForm from "@/components/workshops/UI/post_form/PostForm.tsx";
import Modal from "./UI/modal/ModalWindow";
import Description from "./UI/description_form/Description";
import styles from "./UI/modal/ModalWindow.module.css";
import { workshopsFetch } from "@/api/workshops";

type Workshop = {
  id: number;
  title: string;
  body: string;
  date: string;
  startTime: string;
  endTime: string;
  room: string;
  maxPlaces: number;
};

export function WorkshopsPage() {
  {
    /* Стэйт для хранения списка воркшопов */
  }
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  {
    /* Стэйт для управления видимостью модального окна */
  }
  const [modalVisible, setModalVisible] = useState(false);
  {
    /* Стэйт для редактируемого воркшопа */
  }
  const [editingWorkshop, setEditingWorkshop] = useState<Workshop | null>(null);
  const [descriptionVisible, setDescriptionVisible] = useState(false);
  const [selectedWorkshop, setSelectedWorkshop] = useState<Workshop | null>(
    null,
  );
  // const [email, setEmail] = useState("");
  // const [password, setPassword] = useState("");

  const openDescription = (workshop: Workshop) => {
    setSelectedWorkshop(workshop);
    setDescriptionVisible(true);
  };

  const createWorkshop = (newWorkshop: Workshop) => {
    setWorkshops([...workshops, newWorkshop]);
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
      const { data, error } = await workshopsFetch.POST("/users/register", {
        body: {
          email: "test-user1",
          password: "test-password1",
        },
      });

      if (error) {
        console.error("Registration failed:", error);
        alert("Registration failed");
      } else {
        console.log("Registration successful:", data);
        alert(`Registration successful! Token: ${data.access_token}`);
      }
    } catch (error) {
      console.error("Error during registration:", error);
      alert("Error during registration");
    }
  };

  return (
    <div className="App">
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
