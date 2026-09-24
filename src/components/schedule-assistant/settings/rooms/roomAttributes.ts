import {
  RoomAttributeDefType,
  type SchemaRoomAttributeDef,
} from "@/api/schedule-assistant/types.ts";

export type RoomAttributeType = SchemaRoomAttributeDef["type"];

export type RoomFeatureValue = boolean | string | number | string[];

export const ROOM_ATTRIBUTE_TYPE_OPTIONS: {
  value: RoomAttributeType;
  label: string;
}[] = [
  { value: RoomAttributeDefType.boolean, label: "Да/нет" },
  { value: RoomAttributeDefType.string, label: "Текст" },
  { value: RoomAttributeDefType.number, label: "Число" },
  { value: RoomAttributeDefType.enum, label: "Выбор" },
  { value: RoomAttributeDefType.list, label: "Список" },
];

export const ROOM_ATTRIBUTE_TYPE_EXAMPLES: Record<
  RoomAttributeType,
  { key: string; hint: string; enumValue?: string }
> = {
  [RoomAttributeDefType.boolean]: {
    key: "Проектор",
    hint: "Есть ли проектор в локации",
  },
  [RoomAttributeDefType.string]: {
    key: "Корпус",
    hint: "Корпус или крыло здания",
  },
  [RoomAttributeDefType.number]: {
    key: "Розетки",
    hint: "Количество розеток",
  },
  [RoomAttributeDefType.enum]: {
    key: "Доска",
    hint: "Тип доски в локации",
    enumValue: "Маркерная",
  },
  [RoomAttributeDefType.list]: {
    key: "Оборудование",
    hint: "Дополнительное оборудование",
  },
};

export function emptyRoomAttributeDef(): SchemaRoomAttributeDef {
  return {
    key: "",
    type: RoomAttributeDefType.boolean,
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
        enum_values: def.type === RoomAttributeDefType.enum ? enumValues : [],
      };
    })
    .filter((def) => def.key);
}

export function formatRoomFeatureDisplayValue(value: RoomFeatureValue): string {
  if (value === true) return "да";
  if (value === false) return "нет";
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

export function listRoomFeatureEntries(
  features: { [key: string]: RoomFeatureValue } | undefined,
  attributeKeys: string[] = [],
): { key: string; label: string }[] {
  if (!features) return [];
  const keys =
    attributeKeys.length > 0
      ? attributeKeys.filter((key) =>
          Object.prototype.hasOwnProperty.call(features, key),
        )
      : Object.keys(features);

  return keys.flatMap((key) => {
    const value = features[key];
    if (value === undefined || value === null) return [];
    if (Array.isArray(value) && value.length === 0) return [];
    if (value === "" || value === false) return [];
    return [{ key, label: formatRoomFeatureDisplayValue(value) }];
  });
}
