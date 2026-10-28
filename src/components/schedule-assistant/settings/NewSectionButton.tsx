import { useState } from "react";

import { useAddSection } from "@/components/schedule-assistant/config/useConfig.tsx";
import {
  SettingsCreateField,
  SettingsCreateModal,
} from "@/components/schedule-assistant/settings/SettingsCreateModal.tsx";

export function NewSectionButton({
  onCreated,
}: {
  onCreated: (sectionCode: string) => void;
}) {
  const { addSection, isPending } = useAddSection();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [nameRu, setNameRu] = useState("");

  function handleCreate() {
    const nextCode = code.trim();
    const nextName = name.trim();
    if (!nextCode || !nextName) return;
    addSection({ code: nextCode, name: nextName, name_ru: nameRu }, () => {
      setOpen(false);
      setCode("");
      setName("");
      setNameRu("");
      onCreated(nextCode);
    });
  }

  return (
    <>
      <button
        type="button"
        className="tab rounded-btn text-base-content/45 hover:text-base-content/70"
        title="Новая секция"
        onClick={() => {
          setCode("");
          setName("");
          setNameRu("");
          setOpen(true);
        }}
      >
        +
      </button>
      <SettingsCreateModal
        open={open}
        onOpenChange={setOpen}
        title="Новая секция"
        submitLabel="Создать"
        isPending={isPending}
        onSubmit={handleCreate}
      >
        <SettingsCreateField label="Код" required>
          <input
            className="input input-bordered input-sm w-full"
            value={code}
            required
            placeholder="english"
            onChange={(e) => setCode(e.target.value)}
          />
        </SettingsCreateField>
        <SettingsCreateField label="Название (EN)" required>
          <input
            className="input input-bordered input-sm w-full"
            value={name}
            required
            placeholder="English"
            onChange={(e) => setName(e.target.value)}
          />
        </SettingsCreateField>
        <SettingsCreateField label="Название (RU)">
          <input
            className="input input-bordered input-sm w-full"
            value={nameRu}
            placeholder="Английский"
            onChange={(e) => setNameRu(e.target.value)}
          />
        </SettingsCreateField>
      </SettingsCreateModal>
    </>
  );
}
