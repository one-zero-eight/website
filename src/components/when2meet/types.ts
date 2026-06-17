export type MeetingDate = {
  id: string;
  monthDay: string;
  weekDay: string;
};

export type MeetingUser = {
  id: string;
  name: string;
  slots: Set<string>;
  ifNeededSlots?: Set<string>;
};

export type AvailabilityType = "available" | "if_needed";
