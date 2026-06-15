export function scrollMeetingIntoCenter(
  container: HTMLElement | null,
  meetingId: string,
): boolean {
  if (!container) return false;

  const element = container.querySelector(
    `[data-meeting-id="${CSS.escape(meetingId)}"]`,
  );
  if (!(element instanceof HTMLElement)) return false;

  element.scrollIntoView({
    block: "center",
    inline: "center",
    behavior: "smooth",
  });
  return true;
}
