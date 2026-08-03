import type { SchemaRoomAttributeDef } from "@/api/schedule-assistant/types.ts";

export type RoomAttributeType = SchemaRoomAttributeDef["type"];

export type RoomFeatureValue = boolean | string | number | string[];

export const ROOM_ATTRIBUTE_TYPE_OPTIONS: {
  value: RoomAttributeType;
  label: string;
}[] = [
  { value: "boolean", label: "Да/нет" },
  { value: "string", label: "Текст" },
  { value: "number", label: "Число" },
  { value: "enum", label: "Выбор" },
  { value: "list", label: "Список" },
];

export const ROOM_ATTRIBUTE_TYPE_EXAMPLES: Record<
  RoomAttributeType,
  { key: string; hint: string; enumValue?: string }
> = {
  boolean: {
    key: "Проектор",
    hint: "Есть ли проектор в аудитории",
  },
  string: {
    key: "Корпус",
    hint: "Корпус или крыло здания",
  },
  number: {
    key: "Розетки",
    hint: "Количество розеток",
  },
  enum: {
    key: "Доска",
    hint: "Тип доски в аудитории",
    enumValue: "Маркерная",
  },
  list: {
    key: "Оборудование",
    hint: "Дополнительное оборудование",
  },
};

export function emptyRoomAttributeDef(): SchemaRoomAttributeDef {
  return {
    key: "",
    type: "boolean",
    default: null,
    hint: null,
    enum_values: [],
  };
}

export function resolveRoomFeatureValue(
  def: SchemaRoomAttributeDef,
  features: { [key: string]: RoomFeatureValue },
): RoomFeatureValue | null {
  if (Object.prototype.hasOwnProperty.call(features, def.key)) {
    return features[def.key]!;
  }
  return null;
}

export function buildRoomFeaturesFromDefs(
  defs: SchemaRoomAttributeDef[],
  features: {
    [key: string]: RoomFeatureValue | null | undefined;
  },
): { [key: string]: RoomFeatureValue } {
  const allowed = new Set(defs.map((def) => def.key.trim()).filter(Boolean));
  const next: { [key: string]: RoomFeatureValue } = {};
  for (const [key, value] of Object.entries(features)) {
    if (!allowed.has(key)) continue;
    if (value === null || value === undefined) continue;
    if (Array.isArray(value) && value.length === 0) continue;
    next[key] = value;
  }
  return next;
}

export function normalizeRoomAttributeDefs(
  defs: SchemaRoomAttributeDef[],
): SchemaRoomAttributeDef[] {
  return defs
    .map((def) => {
      const key = def.key.trim();
      const enumValues = (def.enum_values ?? [])
        .map((value) => value.trim())
        .filter(Boolean);
      const hint = def.hint?.trim() ? def.hint.trim() : null;
      return {
        key,
        type: def.type,
        hint,
        enum_values: def.type === "enum" ? enumValues : [],
        default: null,
      };
    })
    .filter((def) => def.key);
}
