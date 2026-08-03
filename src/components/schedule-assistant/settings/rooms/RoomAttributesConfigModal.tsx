import { useEffect, useState } from "react";

import type { SchemaRoomAttributeDef } from "@/api/schedule-assistant/types.ts";
import { SelectDropdown } from "@/components/common/SelectDropdown.tsx";
import { Modal } from "@/components/common/Modal.tsx";
import { usePatchTermMutation } from "@/components/schedule-assistant/config/useConfig.tsx";
import {
  ROOM_ATTRIBUTE_TYPE_EXAMPLES,
  ROOM_ATTRIBUTE_TYPE_OPTIONS,
  emptyRoomAttributeDef,
  normalizeRoomAttributeDefs,
  type RoomAttributeType,
} from "@/components/schedule-assistant/settings/rooms/roomAttributes.ts";

function EnumValuesEditor({
  values,
  onChange,
  placeholder,
}: {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState("");

  function handleAdd() {
    const next = draft.trim();
    if (!next || values.includes(next)) return;
    onChange([...values, next]);
    setDraft("");
  }

  return (
    <div className="flex flex-col gap-2">
      {values.length === 0 ? (
        <div className="text-base-content/50 text-sm">Нет значений</div>
      ) : (
        <ul className="flex flex-col gap-1">
          {values.map((value, index) => (
            <li key={`${value}-${index}`} className="flex items-center gap-2">
              <span className="bg-base-200 rounded-box px-2 py-1 text-sm">
                {value}
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={() =>
                  onChange(
                    values.filter((_, valueIndex) => valueIndex !== index),
                  )
                }
              >
                Удалить
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <input
          className="input input-bordered input-sm min-w-40 flex-1"
          placeholder={placeholder}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            handleAdd();
          }}
        />
        <button
          type="button"
          className="btn btn-outline btn-secondary btn-sm"
          disabled={!draft.trim()}
          onClick={handleAdd}
        >
          Добавить
        </button>
      </div>
    </div>
  );
}

export function RoomAttributesConfigModal({
  open,
  onOpenChange,
  attributes,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attributes: SchemaRoomAttributeDef[];
}) {
  const { patchTerm, isPending } = usePatchTermMutation();
  const [draft, setDraft] = useState<SchemaRoomAttributeDef[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDraft(
      attributes.length
        ? attributes.map((item) => ({
            ...item,
            default: null,
            enum_values: [...(item.enum_values ?? [])],
          }))
        : [],
    );
    setErrorMessage(null);
  }, [attributes, open]);

  function updateDef(index: number, patch: Partial<SchemaRoomAttributeDef>) {
    setDraft((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        const next = { ...item, ...patch, default: null };
        if (patch.type && patch.type !== item.type) {
          next.enum_values =
            patch.type === "enum" ? (next.enum_values ?? []) : [];
        }
        return next;
      }),
    );
  }

  function handleSave() {
    if (draft.some((item) => !item.key.trim())) {
      setErrorMessage("Укажите ключ для каждого атрибута.");
      return;
    }
    const normalized = normalizeRoomAttributeDefs(draft);
    const keys = normalized.map((item) => item.key);
    if (keys.length !== new Set(keys).size) {
      setErrorMessage("Ключи атрибутов должны быть уникальными.");
      return;
    }
    for (const item of normalized) {
      if (item.type === "enum" && !(item.enum_values ?? []).length) {
        setErrorMessage(
          `Для «${item.key || "атрибута"}» укажите хотя бы одно значение для выбора.`,
        );
        return;
      }
    }
    patchTerm((current) => ({
      ...current,
      room_attributes: normalized,
    }));
    onOpenChange(false);
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Атрибуты аудиторий"
      containerClassName="max-w-3xl"
    >
      <div className="@container/modal flex flex-col gap-3">
        <p className="text-base-content/70 text-sm">
          Эти определения общие для всех аудиторий: ключ, тип и подсказка.
        </p>

        {draft.length === 0 ? (
          <div className="text-base-content/60 text-sm">
            Атрибуты ещё не определены.
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {draft.map((def, index) => {
              const examples = ROOM_ATTRIBUTE_TYPE_EXAMPLES[def.type];
              return (
                <li
                  key={`room-attr-${index}`}
                  className="border-base-300 rounded-box flex flex-col gap-2 border p-3"
                >
                  <div className="flex flex-wrap items-start gap-2">
                    <label className="flex min-w-40 flex-1 flex-col gap-1">
                      <span className="text-base-content/70 text-xs font-medium tracking-wide uppercase">
                        Ключ
                        <span className="text-error"> *</span>
                      </span>
                      <input
                        className="input input-bordered input-sm"
                        value={def.key}
                        required
                        onChange={(e) =>
                          updateDef(index, { key: e.target.value })
                        }
                        placeholder={examples.key}
                      />
                    </label>
                    <div className="flex min-w-36 flex-col gap-1">
                      <span className="text-base-content/70 text-xs font-medium tracking-wide uppercase">
                        Тип
                      </span>
                      <SelectDropdown
                        value={def.type}
                        options={ROOM_ATTRIBUTE_TYPE_OPTIONS}
                        onChange={(type: RoomAttributeType) =>
                          updateDef(index, { type })
                        }
                        triggerClassName="btn btn-outline btn-sm w-full justify-between font-normal"
                      />
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm mt-5"
                      onClick={() =>
                        setDraft((current) =>
                          current.filter((_, itemIndex) => itemIndex !== index),
                        )
                      }
                    >
                      Удалить
                    </button>
                  </div>

                  <label className="flex flex-col gap-1">
                    <span className="text-base-content/70 text-xs font-medium tracking-wide uppercase">
                      Подсказка
                    </span>
                    <input
                      className="input input-bordered input-sm"
                      value={def.hint ?? ""}
                      onChange={(e) =>
                        updateDef(index, { hint: e.target.value || null })
                      }
                      placeholder={examples.hint}
                    />
                  </label>

                  {def.type === "enum" ? (
                    <div className="flex flex-col gap-1">
                      <span className="text-base-content/70 text-xs font-medium tracking-wide uppercase">
                        Варианты выбора
                      </span>
                      <EnumValuesEditor
                        values={def.enum_values ?? []}
                        placeholder={examples.enumValue ?? "Маркерная"}
                        onChange={(enum_values) =>
                          updateDef(index, { enum_values })
                        }
                      />
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}

        <button
          type="button"
          className="btn btn-outline btn-secondary btn-sm self-start"
          onClick={() =>
            setDraft((current) => [...current, emptyRoomAttributeDef()])
          }
        >
          Добавить атрибут
        </button>

        {errorMessage ? (
          <p className="text-error text-sm">{errorMessage}</p>
        ) : null}

        <div className="mt-2 flex justify-end gap-2">
          <button
            type="button"
            className="btn btn-ghost"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            Отмена
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={isPending}
            onClick={handleSave}
          >
            {isPending ? (
              <span className="loading loading-spinner loading-sm" />
            ) : (
              "Сохранить"
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
