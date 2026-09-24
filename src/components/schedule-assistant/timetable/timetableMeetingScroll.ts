function revealCalendarWeek(shell: HTMLElement) {
  shell.style.contentVisibility = "visible";
  shell.style.containIntrinsicSize = "none";
  void shell.offsetHeight;
}

function revealCalendarWeeksThrough(
  container: HTMLElement,
  targetShell: HTMLElement,
) {
  const targetIndex = Number(
    targetShell.getAttribute("data-calendar-week-index"),
  );
  const shells = container.querySelectorAll<HTMLElement>(
    "[data-calendar-week-index]",
  );
  shells.forEach((shell) => {
    const index = Number(shell.getAttribute("data-calendar-week-index"));
    if (!Number.isFinite(targetIndex) || index <= targetIndex) {
      revealCalendarWeek(shell);
    }
  });
}

function weekShellForDate(container: HTMLElement, date: string) {
  const shells = container.querySelectorAll<HTMLElement>(
    "[data-calendar-week-start]",
  );
  for (const shell of shells) {
    const start = shell.getAttribute("data-calendar-week-start") || "";
    const end = shell.getAttribute("data-calendar-week-end") || "";
    if (start && end && date >= start && date <= end) return shell;
  }
  return null;
}

export function scrollMeetingIntoCenter(
  container: HTMLElement | null,
  meetingId: string,
  date?: string,
): boolean {
  if (!container) return false;

  const element = container.querySelector(
    `[data-meeting-id="${CSS.escape(meetingId)}"]`,
  );

  if (element instanceof HTMLElement) {
    const weekShell = element.closest<HTMLElement>(
      "[data-calendar-week-index]",
    );
    if (weekShell) revealCalendarWeeksThrough(container, weekShell);
    element.scrollIntoView({
      block: "center",
      inline: weekShell ? "nearest" : "center",
      behavior: "smooth",
    });
    return true;
  }

  if (!date) return false;
  const weekShell = weekShellForDate(container, date);
  if (!weekShell) return false;
  revealCalendarWeeksThrough(container, weekShell);
  return false;
}
