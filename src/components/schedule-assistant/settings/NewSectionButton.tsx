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

  function handleCreate() {
    const nextCode = code.trim();
    const nextName = name.trim();
    if (!nextCode || !nextName) return;
    addSection({ code: nextCode, name: nextName }, () => {
      setOpen(false);
      setCode("");
      setName("");
      onCreated(nextCode);
    });
  }

  return (
    <>
      <button
        type="button"
        className="text-base-content/45 hover:text-base-content/70 inline-flex shrink-0 items-center gap-0.5 px-2 py-1 text-sm transition-colors"
        title="Новая секция"
        onClick={() => {
          setCode("");
          setName("");
          setOpen(true);
        }}
      >
        <span className="icon-[material-symbols--add] text-base" />
        Секция
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
        <SettingsCreateField label="Название" required>
          <input
            className="input input-bordered input-sm w-full"
            value={name}
            required
            placeholder="Английский"
            onChange={(e) => setName(e.target.value)}
          />
        </SettingsCreateField>
      </SettingsCreateModal>
    </>
  );
}
