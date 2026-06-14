export type Meeting = {
  id: string;
  title: string;
  description: string;
  room: string;
  participantsCount: number;
};

export const MY_MEETINGS: Meeting[] = [
  {
    id: "m-1",
    title: "Project sync - Innohassle",
    description:
      "Weekly sync for the portal team. Bring blockers and demo updates.",
    room: "303",
    participantsCount: 6,
  },
  {
    id: "m-2",
    title: "Thesis committee prep",
    description:
      "Align on presentation order and Q&A roles before the defense.",
    room: "108",
    participantsCount: 4,
  },
  {
    id: "m-3",
    title: "Hackathon planning",
    description:
      "Finalize tracks, mentors, and room allocation for the fall hackathon.",
    room: "TBA",
    participantsCount: 12,
  },
];

export const PARTICIPATING_MEETINGS: Meeting[] = [
  {
    id: "m-4",
    title: "Robotics lab standup",
    description: "Short daily check-in for the manipulator firmware team.",
    room: "309A",
    participantsCount: 8,
  },
  {
    id: "m-5",
    title: "Dorm council meeting",
    description:
      "Discuss quiet hours, laundry schedule, and summer maintenance.",
    room: "VK Zone",
    participantsCount: 15,
  },
  {
    id: "m-6",
    title: "Startup pitch rehearsal",
    description: "Practice deck and timing before the investor session.",
    room: "105",
    participantsCount: 5,
  },
  {
    id: "m-7",
    title: "Study group — Algorithms",
    description: "Graph algorithms review before the midterm.",
    room: "303",
    participantsCount: 7,
  },
];
