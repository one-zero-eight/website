import clsx from "clsx";
import { useCallback, useMemo, useState } from "react";

import type { SchemaRoom } from "@/api/schedule-assistant/types.ts";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import {
  useCreateRoomMutation,
  useRoomsQuery,
  useSemesterSettings,
} from "@/components/schedule-assistant/config/useConfig.tsx";
import {
  SettingsCreateField,
  SettingsCreateModal,
} from "@/components/schedule-assistant/settings/SettingsCreateModal.tsx";
import { RoomAttributesHoverBadge } from "@/components/schedule-assistant/settings/rooms/RoomAttributesHoverBadge.tsx";
import { listRoomFeatureEntries } from "@/components/schedule-assistant/settings/rooms/roomAttributes.ts";
import { usePendingSettingsSelect } from "@/components/schedule-assistant/settings/usePendingSettingsSelect.ts";
import {
  getSettingsSelectionKey,
  useSelection,
  type SettingsListRow,
} from "@/components/schedule-assistant/settings/useSelection.tsx";

export type RoomListRow = SettingsListRow & {
  roomIndex: number;
  featureEntries: { key: string; label: string }[];
};

export type RoomsFloorGroup = {
  floor: string;
  items: RoomListRow[];
};

function roomCapacityToLabel(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  if (Array.isArray(value)) return value.map(roomCapacityToLabel).join(", ");
  return JSON.stringify(value, null, 2);
}

export function RoomsTabContent() {
  const { data: rooms, isPending, isError, error } = useRoomsQuery();
  const { term } = useSemesterSettings();
  const { mutate: createRoom, isPending: isCreating } = useCreateRoomMutation();
  const { selectedSelectionId, selectItem } = useSelection();
  const [createOpen, setCreateOpen] = useState(false);
  const [newId, setNewId] = useState("");
  const [newName, setNewName] = useState("");
  const [newCapacity, setNewCapacity] = useState("");
  const attributeKeys = useMemo(
    () =>
      (term?.room_attributes ?? [])
        .map((item) => item.key.trim())
        .filter(Boolean),
    [term?.room_attributes],
  );
  const handleSelectRoom = useCallback(
    (roomIndex: number) => {
      selectItem({ kind: "room", roomIndex });
    },
    [selectItem],
  );
  const findRoomIndexById = useCallback(
    (items: NonNullable<typeof rooms>, key: string) =>
      items.findIndex((item) => String(item.id ?? "") === key),
    [],
  );
  const requestSelectCreatedRoom = usePendingSettingsSelect(
    rooms,
    findRoomIndexById,
    handleSelectRoom,
  );

  const groups: RoomsFloorGroup[] = useMemo(() => {
    const roomsItems: RoomListRow[] = (rooms ?? []).map(
      (room: SchemaRoom, index: number) => {
        const capacityLabel =
          room?.capacity == null || String(room?.capacity).trim() === ""
            ? "Вместимость —"
            : `Вместимость ${roomCapacityToLabel(room?.capacity)}`;
        return {
          id: `room-${index}`,
          title: String(room?.id || ""),
          subtitle: capacityLabel,
          selection: { kind: "room" as const, roomIndex: index },
          roomIndex: index,
          featureEntries: listRoomFeatureEntries(room.features, attributeKeys),
        };
      },
    );
    if (!roomsItems.length) return [];

    const floorMap = new Map<string, typeof roomsItems>();
    for (const item of roomsItems) {
      const roomId = item.title;
      const match = String(roomId).match(/^(\d+)/);
      const floor = match?.[1]?.[0] ? `${match[1][0]} этаж` : "Без этажа";
      floorMap.set(floor, [...(floorMap.get(floor) || []), item]);
    }

    return Array.from(floorMap.entries())
      .map(([floor, items]) => ({
        floor,
        items: items.sort((a, b) => a.title.localeCompare(b.title, "ru")),
      }))
      .sort((a, b) => {
        if (a.floor === "Без этажа") return 1;
        if (b.floor === "Без этажа") return -1;
        return a.floor.localeCompare(b.floor, "ru");
      });
  }, [attributeKeys, rooms]);

  function resetCreateForm() {
    setNewId("");
    setNewName("");
    setNewCapacity("");
  }

  function handleCreateRoom() {
    const id = newId.trim();
    if (!id) return;
    const capacityRaw = newCapacity.trim();
    const parsed = capacityRaw === "" ? null : Number(capacityRaw);
    createRoom(
      {
        body: {
          id,
          name: newName.trim(),
          capacity: parsed != null && Number.isFinite(parsed) ? parsed : null,
        },
      },
      {
        onSuccess: () => {
          setCreateOpen(false);
          resetCreateForm();
          requestSelectCreatedRoom(id);
        },
      },
    );
  }

  if (isPending) {
    return <div className="skeleton h-40 w-full" />;
  }

  if (isError) {
    return (
      <div className="alert alert-error alert-soft text-sm">
        {formatApiErrorMessage(error)}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        className="btn btn-outline btn-secondary btn-sm w-fit shrink-0"
        onClick={() => {
          resetCreateForm();
          setCreateOpen(true);
        }}
      >
        Добавить аудиторию
      </button>
      {!groups.length ? (
        <div className="text-base-content/70 text-sm">
          Нет аудиторий в конфигурации.
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {groups.map((group) => (
            <div
              key={group.floor}
              className="border-base-300 rounded-box overflow-hidden border"
            >
              <div className="bg-base-200/70 border-base-300 text-base-content/80 border-b px-2.5 py-1.5 text-xs font-semibold tracking-wide uppercase">
                {group.floor}
              </div>
              <div className="grid grid-cols-1 gap-2 p-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={clsx(
                      "btn btn-ghost rounded-box h-auto min-h-0 w-full justify-start border px-3 py-2 text-left normal-case",
                      "border-base-300 hover:bg-base-200",
                      selectedSelectionId ===
                        getSettingsSelectionKey(item.selection)
                        ? "btn-active border-primary/40 bg-primary/12 ring-primary ring-2 ring-inset"
                        : "bg-base-100",
                    )}
                    onClick={() => selectItem(item.selection)}
                  >
                    <div className="flex w-full items-start justify-between gap-2 text-left">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold">
                          {item.title}
                        </div>
                        <div className="text-base-content/70 text-xs">
                          {item.subtitle ?? "Вместимость —"}
                        </div>
                      </div>
                      <RoomAttributesHoverBadge entries={item.featureEntries} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <SettingsCreateModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Новая аудитория"
        submitLabel="Создать"
        isPending={isCreating}
        onSubmit={handleCreateRoom}
      >
        <SettingsCreateField label="Идентификатор" required>
          <input
            className="input input-bordered input-sm w-full"
            value={newId}
            required
            placeholder="108"
            onChange={(e) => setNewId(e.target.value)}
          />
        </SettingsCreateField>
        <SettingsCreateField label="Название">
          <input
            className="input input-bordered input-sm w-full"
            value={newName}
            placeholder="Аудитория 108"
            onChange={(e) => setNewName(e.target.value)}
          />
        </SettingsCreateField>
        <SettingsCreateField label="Вместимость">
          <input
            type="number"
            className="input input-bordered input-sm w-full"
            value={newCapacity}
            placeholder="30"
            onChange={(e) => setNewCapacity(e.target.value)}
          />
        </SettingsCreateField>
      </SettingsCreateModal>
    </div>
  );
}
