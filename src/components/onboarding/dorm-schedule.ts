export type DormRoom = {
  building: string;
  room: string;
  floor: number;
  canonicalRoom: string;
};

export function getDormRoomLength(building: string, room: string): 3 | 4 {
  if (building !== "6" && building !== "7") return 3;
  if (/^[2-9]/.test(room)) return 3;
  if (/^(11|12|13)/.test(room)) return 4;
  if (room === "10") return 4;
  if (/^100/.test(room)) return 4;
  return 3;
}

export function parseDormRoom(building: string, room: string): DormRoom | null {
  if (!/^[1-7]$/.test(building)) return null;

  const expectedRoomLength = getDormRoomLength(building, room);
  if (room.length !== expectedRoomLength || !/^\d+$/.test(room)) return null;

  const floorText = room.length === 4 ? room.slice(0, 2) : room.slice(0, 1);
  const floor = Number(floorText);
  if (floor < 1 || floor > 13) return null;
  if (building === "2" && floor > 4) return null;
  if (building === "3" && floor > 4) return null;
  if (building === "5" && floor > 5) return null;

  return {
    building,
    room,
    floor,
    canonicalRoom: `${building}-${room}`,
  };
}

export function getDormScheduleAliases({
  building,
  floor,
}: DormRoom): string[] {
  const linenAlias =
    building === "3"
      ? floor <= 2
        ? "linen-change-3-building-university"
        : "linen-change-3-building-college"
      : `linen-change-${building}-building`;

  const cleaningAliases = getCleaningAliases(building, floor);
  return [...new Set([...cleaningAliases, linenAlias])];
}

function getCleaningAliases(building: string, floor: number): string[] {
  if (building === "1") return ["cleaning-1-building"];
  if (building === "2") {
    if (floor <= 2) return ["cleaning-2-building-1-2-floors"];
    return ["cleaning-2-building-3-4-floors"];
  }
  if (building === "3") {
    return floor === 3
      ? ["cleaning-3-building", "cleaning-3-building-3-floors"]
      : ["cleaning-3-building"];
  }
  if (building === "4") return ["cleaning-4-building"];
  if (building === "5") {
    const floorAlias =
      floor <= 3
        ? "cleaning-5-building-1-3-floors"
        : "cleaning-5-building-4-5-floors";
    return ["cleaning-5-building", floorAlias];
  }
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
