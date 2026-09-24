export type DormSelection = {
  building: string;
  floor: string;
};

export function getDormScheduleAliases({
  building,
  floor,
}: DormSelection): string[] {
  if (!/^[1-7]$/.test(building)) return [];
  if (!/^(?:[1-9]|1[0-3])$/.test(floor)) return [];
  const floorNumber = Number(floor);
  if (/^[1-4]$/.test(building) && floorNumber > 4) return [];
  if (building === "5" && floorNumber > 5) return [];

  const linenAlias =
    building === "3"
      ? floorNumber <= 2
        ? "linen-change-3-building-university"
        : "linen-change-3-building-college"
      : `linen-change-${building}-building`;

  const cleaningAliases = getCleaningAliases(building, floorNumber);
  return [...new Set([...cleaningAliases, linenAlias])];
}

function getCleaningAliases(building: string, floor: number): string[] {
  if (building === "1") return ["cleaning-1-building"];
  if (building === "2") {
    return [
      floor <= 2
        ? "cleaning-2-building-1-2-floors"
        : "cleaning-2-building-3-4-floors",
    ];
  }
  if (building === "3") {
    return ["cleaning-3-building"];
  }
  if (building === "4") return ["cleaning-4-building"];
  if (building === "5") return ["cleaning-5-building"];
  if (building === "6") {
    return [
      floor <= 7
        ? "cleaning-6-building-1-7-floors"
        : "cleaning-6-building-8-13-floors",
    ];
  }
  return [
    floor <= 7
      ? "cleaning-7-building-1-7-floors"
      : "cleaning-7-building-8-13-floors",
  ];
}
