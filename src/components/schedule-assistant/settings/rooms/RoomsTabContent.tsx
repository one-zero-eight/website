import clsx from "clsx";
import { useMemo } from "react";

import type { SchemaRoomConfig } from "@/api/schedule-assistant/types.ts";
import { useConfig } from "@/components/schedule-assistant/config/useConfig.tsx";
import {
  getSettingsSelectionKey,
  useSelection,
  type SettingsListRow,
} from "@/components/schedule-assistant/settings/useSelection.tsx";

export type RoomListRow = SettingsListRow & {
  roomIndex: number;
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
  const { config, updateConfigData } = useConfig();
  const { selectedSelectionId, selectItem } = useSelection();
  const groups: RoomsFloorGroup[] = useMemo(() => {
    const roomsItems: RoomListRow[] = (config?.rooms || []).map(
      (room: SchemaRoomConfig, index: number) => ({
        id: `room-${index}`,
        title: String(room?.id || ""),
        subtitle:
          room?.capacity == null || String(room?.capacity).trim() === ""
            ? "Вместимость: —"
            : `Вместимость: ${roomCapacityToLabel(room?.capacity)}`,
        selection: { kind: "room", roomIndex: index },
        roomIndex: index,
      }),
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
  }, [config]);
  return (
    <div className="flex flex-col gap-2">
      {!groups.length ? (
        <div className="text-base-content/70 text-sm">
          Нет аудиторий в конфигурации.
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {groups.map((group) => (
            <div
              key={group.floor}
              className="border-base-300 rounded-box border"
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
                    <div className="w-full text-left">
                      <div className="text-sm font-semibold">{item.title}</div>
                      <div className="text-base-content/70 text-xs">
                        {item.subtitle ?? "Вместимость: —"}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        className="btn btn-outline btn-secondary btn-sm mt-1 w-fit shrink-0"
        onClick={() =>
          updateConfigData((draft) => {
            draft.rooms.push({
              id: `NEW-${draft.rooms.length + 1}`,
              name: "",
              capacity: 0,
            });
          })
        }
      >
        Добавить аудиторию
      </button>
    </div>
  );
}
