import { SchemaScheduleConfig } from "@/api/schedule-assistant/types.ts";
import clsx from "clsx";
import type { ReactNode } from "react";

import {
  type Column,
  type Meeting,
  type Selection,
  type WeekRange,
  filterMeetingsToCurrentWeek,
  groupWeekHistogramsHtml,
  meetingRoomLoadLabel,
  meetingRoomLoadOverCapacity,
  meetingSelectionKey,
  roomFillPercent,
  scheduleAssistantDetailTooltips,
  workloadHistogramHtml,
} from "./timetableViewerModel.ts";
import { canRestoreMeeting } from "./meetingEditUtils.ts";
import { MeetingOverrideFieldBadge } from "./meetingOverrideIndicator.tsx";

export type DetailPanelState = {
  detailTitle: string;
  detailSummary: string;
  histogramHtml: string;
  histogramHidden: boolean;
  listContent: ReactNode;
};

const CLICK =
  "clickable cursor-pointer font-semibold text-[#4f5c6d] underline decoration-dotted decoration-2 underline-offset-2 hover:text-[#303a47] hover:decoration-solid";

function DetailRow({ children }: { children: ReactNode }) {
  return (
    <div className="border-0 bg-transparent py-0.5 text-xs leading-snug [word-break:break-word] text-[#243957]">
      {children}
    </div>
  );
}

function DetailSection({ title }: { title: string }) {
  return (
    <div className="mt-2 mb-0.5 text-sm font-bold tracking-wide text-[#2d4f80] uppercase">
      {title}
    </div>
  );
}

function DetailRoomLoad({
  m,
  roomCapacityById,
  groupSizeById,
}: {
  m: Meeting;
  roomCapacityById: Record<string, number>;
  groupSizeById: Record<string, number | null | undefined>;
}) {
  const label = meetingRoomLoadLabel(m, roomCapacityById, groupSizeById);
  const overCap = meetingRoomLoadOverCapacity(
    m,
    roomCapacityById,
    groupSizeById,
  );
  const room = (m.room || "").trim();
  const overCls = overCap
    ? "font-bold text-[#b42318] [&_.clickable]:!text-[#b42318] [&_.clickable]:decoration-[#b42318]"
    : "";

  if (!room) {
    return <span className={overCls}>{label}</span>;
  }

  return (
    <span
      className={clsx(CLICK, "room-link inline", overCls)}
      data-room={encodeURIComponent(room)}
      title={scheduleAssistantDetailTooltips.room}
    >
      {label}
    </span>
  );
}

function DetailInstructorLinks({
  instructors,
}: {
  instructors: string | string[];
}) {
  const instructorsArray =
    typeof instructors === "string" ? [instructors] : instructors;
  if (!instructorsArray?.length) return "-";
  return (
    <>
      {instructorsArray.map((name, idx) => (
        <span key={name}>
          {idx > 0 ? " / " : null}
          <span
            className={clsx(CLICK, "instructor-link inline")}
            data-inst={encodeURIComponent(name)}
            title={scheduleAssistantDetailTooltips.instructor}
          >
            {name}
          </span>
        </span>
      ))}
    </>
  );
}

function DetailGroupLinks({ groups }: { groups: string[] }) {
  if (!groups?.length) return "-";
  return (
    <>
      {groups.map((gid, idx) => (
        <span key={gid}>
          {idx > 0 ? ", " : null}
          <span
            className={clsx(CLICK, "group-link inline")}
            data-group={encodeURIComponent(gid)}
            title={scheduleAssistantDetailTooltips.group}
          >
            {gid}
          </span>
        </span>
      ))}
    </>
  );
}

function DetailMeetingSessionRow({
  m,
  roomCapacityById,
  groupSizeById,
  indented = false,
  onRestoreMeeting,
  restoringMeetingId,
}: {
  m: Meeting;
  roomCapacityById: Record<string, number>;
  groupSizeById: Record<string, number | null | undefined>;
  indented?: boolean;
  onRestoreMeeting?: (meeting: Meeting) => void;
  restoringMeetingId?: string | null;
}) {
  const rowClass = clsx(indented && "ml-3", m.cancelled && "opacity-75");
  const textClass = clsx(m.cancelled && "line-through decoration-[#94a3b8]");
  const canRestore = canRestoreMeeting(m);
  const isRestoring = restoringMeetingId === m.instance_id;

  return (
    <DetailRow key={m.instance_id}>
      <div className={clsx(rowClass, "text-[#243957]")}>
        <span className="inline-flex flex-wrap items-center gap-1">
          <b className={textClass}>
            {m.date} {m.start}
          </b>
          {!m.cancelled ? (
            <>
              <MeetingOverrideFieldBadge
                field="weekday"
                fields={m.override_fields}
              />
              <MeetingOverrideFieldBadge
                field="time"
                fields={m.override_fields}
              />
            </>
          ) : (
            <span className="badge badge-error badge-xs no-underline">
              отменено
            </span>
          )}{" "}
          - <DetailGroupLinks groups={m.groups || []} />
        </span>
      </div>
      <div className={clsx(rowClass, "text-[#4f5c6d]")}>
        <span className="inline-flex flex-wrap items-center gap-1">
          <span className={textClass}>ауд.</span>{" "}
          <DetailRoomLoad
            m={m}
            roomCapacityById={roomCapacityById}
            groupSizeById={groupSizeById}
          />
          {!m.cancelled ? (
            <MeetingOverrideFieldBadge
              field="room"
              fields={m.override_fields}
            />
          ) : null}
        </span>{" "}
        |{" "}
        <span className="inline-flex flex-wrap items-center gap-1">
          <span className={textClass}>препод.</span>{" "}
          <DetailInstructorLinks instructors={m.instructors} />
          {!m.cancelled ? (
            <MeetingOverrideFieldBadge
              field="instructor"
              fields={m.override_fields}
            />
          ) : null}
        </span>
      </div>
      {m.cancelled && canRestore && onRestoreMeeting ? (
        <div className={clsx(rowClass, "mt-1")}>
          <button
            type="button"
            className="btn btn-outline btn-xs"
            disabled={isRestoring}
            onClick={() => onRestoreMeeting(m)}
          >
            {isRestoring ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              "Восстановить"
            )}
          </button>
        </div>
      ) : null}
    </DetailRow>
  );
}

function activeMeetings(items: Meeting[]) {
  return items.filter((m) => !m.cancelled);
}

export function computeDetailPanel(input: {
  selection: Selection;
  allMeetings: Meeting[];
  columns: Column[];
  config: SchemaScheduleConfig;
  roomCapacityById: Record<string, number>;
  groupSizeById: Record<string, number | null | undefined>;
  weeks: WeekRange[];
  weekIndex: number;
  onRestoreMeeting?: (meeting: Meeting) => void;
  restoringMeetingId?: string | null;
}): DetailPanelState {
  const {
    selection: sel,
    allMeetings: meetings,
    columns,
    config,
    roomCapacityById,
    groupSizeById,
    weeks,
    weekIndex,
    onRestoreMeeting,
    restoringMeetingId,
  } = input;

  const rfp = (m: Meeting) =>
    roomFillPercent(m, roomCapacityById, groupSizeById);

  if (!sel) {
    return {
      detailTitle: "Выбор",
      detailSummary: "",
      histogramHtml: "",
      histogramHidden: true,
      listContent: (
        <DetailRow>
          Кликните по занятию, программе, группе или преподавателю, чтобы
          увидеть детали.
        </DetailRow>
      ),
    };
  }

  const formatInstructorPool = (pool: unknown[]) => {
    if (!pool || !pool.length) return "-";
    return pool
      .map((p) =>
        Array.isArray(p) ? `[${(p as string[]).join(" + ")}]` : String(p),
      )
      .join(" | ");
  };

  const parts: ReactNode[] = [];
  let detailTitle = "";
  let detailSummary = "";
  let histogramHtml = "";
  let histogramHidden = true;

  if (sel.type === "meeting") {
    histogramHidden = true;
    histogramHtml = "";
    const courseName = sel.course || "";
    const mm = meetings
      .filter((m) => meetingSelectionKey(m) === sel.value)
      .sort((a, b) =>
        `${a.date}|${a.start}`.localeCompare(`${b.date}|${b.start}`),
      );
    const head = mm[0];
    const courseDisplay =
      String(head?.course || courseName || "").trim() || "—";
    const tagDisplay = String(head?.tag || "").trim() || "—";
    detailTitle = `${courseDisplay} (${tagDisplay})`;
    detailSummary = head
      ? `${mm.length} совпад. · ${head.date} ${head.start}`
      : `${mm.length} совпад. | курс: ${courseName || "-"}`;
    parts.push(<DetailSection key="sel-meet-h" title="Выбранное занятие" />);
    for (const m of mm.slice(0, 20)) {
      parts.push(
        <DetailMeetingSessionRow
          key={m.instance_id}
          m={m}
          roomCapacityById={roomCapacityById}
          groupSizeById={groupSizeById}
          onRestoreMeeting={onRestoreMeeting}
          restoringMeetingId={restoringMeetingId}
        />,
      );
    }
    parts.push(<div key="div-meet" className="my-2 h-px bg-[#ccd9ee]" />);
    parts.push(
      <DetailRow key="course-line">
        <span className="text-[#243957]">
          <b className="font-bold text-[#243957]">Курс:</b> {courseName || "-"}
        </span>
      </DetailRow>,
    );
    if (courseName) {
      const courseSessions = meetings
        .filter((m) => m.course === courseName)
        .sort((a, b) =>
          `${a.tag}|${a.date}|${a.start}`.localeCompare(
            `${b.tag}|${b.date}|${b.start}`,
          ),
        );
      const byTag: Record<string, Meeting[]> = {};
      for (const m of courseSessions) {
        if (!byTag[m.tag]) byTag[m.tag] = [];
        byTag[m.tag].push(m);
      }
      parts.push(<DetailSection key="comp" title="Компоненты" />);
      const courseCfg = config.courses?.find((c) => c.name === courseName);
      const orderedTags: string[] = [];
      for (const comp of courseCfg?.components || []) {
        if (comp?.tag && byTag[comp.tag] && !orderedTags.includes(comp.tag))
          orderedTags.push(comp.tag);
      }
      for (const tag of Object.keys(byTag)) {
        if (!orderedTags.includes(tag)) orderedTags.push(tag);
      }
      for (const tag of orderedTags) {
        const tagSessions = byTag[tag]!;
        const activeCount = tagSessions.filter((m) => !m.cancelled).length;
        const canceledCount = tagSessions.filter((m) => m.cancelled).length;
        const componentPool =
          (tagSessions.find((m) => !m.cancelled) ?? tagSessions[0])
            ?.instructor_pool || [];
        parts.push(
          <DetailRow key={`tag-${tag}-h`}>
            <span className="text-[#243957]">
              <b className="font-bold text-[#243957]">{tag}</b>: {activeCount}{" "}
              занятий
              {canceledCount ? (
                <span className="text-[#4f5c6d]">
                  {" "}
                  · {canceledCount} отменено
                </span>
              ) : null}
            </span>
          </DetailRow>,
        );
        parts.push(
          <DetailRow key={`tag-${tag}-pool`}>
            <span className="ml-3 text-[#4f5c6d]">
              <b className="font-bold text-[#243957]">пул преподавателей:</b>{" "}
              {formatInstructorPool(componentPool)}
            </span>
          </DetailRow>,
        );
        for (const m of byTag[tag]!) {
          parts.push(
            <DetailMeetingSessionRow
              key={`${tag}-${m.instance_id}`}
              m={m}
              roomCapacityById={roomCapacityById}
              groupSizeById={groupSizeById}
              indented
              onRestoreMeeting={onRestoreMeeting}
              restoringMeetingId={restoringMeetingId}
            />,
          );
        }
      }
      const fullCfgCourse = (
        (config.courses as { name?: string }[]) || []
      ).find((c) => c?.name === courseName);
      if (fullCfgCourse) {
        parts.push(<DetailSection key="cfg" title="Полный конфиг курса" />);
        parts.push(
          <DetailRow key="cfg-pre">
            <details className="rounded-md border border-[#d8dfeb] bg-[#f9fbff] px-2 py-1">
              <summary className="cursor-pointer font-bold text-[#2d4f80]">
                Показать конфиг: {courseName}
              </summary>
              <pre className="mt-2 mb-1 text-[0.6875rem] leading-snug break-words whitespace-pre-wrap text-[#2b3644]">
                {JSON.stringify(fullCfgCourse, null, 2)}
              </pre>
            </details>
          </DetailRow>,
        );
      }
    }
  } else if (sel.type === "program") {
    const groupIds = new Set(
      columns.filter((c) => c.yearLabel === sel.value).map((c) => c.groupId),
    );
    const mm = activeMeetings(
      meetings
        .filter((m) => (m.groups || []).some((g) => groupIds.has(g)))
        .sort((a, b) =>
          `${a.date}|${a.start}`.localeCompare(`${b.date}|${b.start}`),
        ),
    );
    detailTitle = "Программа";
    detailSummary = `${sel.value} | ${mm.length} занятий`;
    const weekMm = filterMeetingsToCurrentWeek(mm, weeks, weekIndex);
    histogramHtml = groupWeekHistogramsHtml(weekMm);
    histogramHidden = false;
    parts.push(<DetailSection key="prog" title="Занятия" />);
    for (const m of mm.slice(0, 80)) {
      parts.push(
        <DetailRow key={m.instance_id}>
          <div className="text-[#243957]">
            <b>
              {m.date} {m.start}
            </b>{" "}
            - {m.course} ({m.tag})
          </div>
          <div className="text-[#4f5c6d]">
            группы: <DetailGroupLinks groups={m.groups || []} /> | препод.:{" "}
            <DetailInstructorLinks instructors={m.instructors} /> | ауд.:{" "}
            <DetailRoomLoad
              m={m}
              roomCapacityById={roomCapacityById}
              groupSizeById={groupSizeById}
            />
          </div>
        </DetailRow>,
      );
    }
  } else if (sel.type === "group") {
    const mm = activeMeetings(
      meetings
        .filter((m) => (m.groups || []).includes(sel.value))
        .sort((a, b) =>
          `${a.date}|${a.start}`.localeCompare(`${b.date}|${b.start}`),
        ),
    );
    detailTitle = "Группа";
    detailSummary = `${sel.value} | ${mm.length} занятий`;
    const weekMm = filterMeetingsToCurrentWeek(mm, weeks, weekIndex);
    histogramHtml = groupWeekHistogramsHtml(weekMm);
    histogramHidden = false;
    parts.push(<DetailSection key="grp" title="Занятия" />);
    for (const m of mm.slice(0, 80)) {
      parts.push(
        <DetailRow key={m.instance_id}>
          <div className="text-[#243957]">
            <b>
              {m.date} {m.start}
            </b>{" "}
            - {m.course} ({m.tag})
          </div>
          <div className="text-[#4f5c6d]">
            ауд.:{" "}
            <DetailRoomLoad
              m={m}
              roomCapacityById={roomCapacityById}
              groupSizeById={groupSizeById}
            />{" "}
            | препод.: <DetailInstructorLinks instructors={m.instructors} />
          </div>
        </DetailRow>,
      );
    }
  } else if (sel.type === "instructor") {
    const mm = activeMeetings(
      meetings
        .filter((m) =>
          (typeof m.instructors === "string"
            ? [m.instructors]
            : m.instructors
          ).includes(sel.value),
        )
        .sort((a, b) =>
          `${a.date}|${a.start}`.localeCompare(`${b.date}|${b.start}`),
        ),
    );
    detailTitle = "Преподаватель";
    detailSummary = `${sel.value} | ${mm.length} занятий`;
    const weekMm = filterMeetingsToCurrentWeek(mm, weeks, weekIndex);
    histogramHtml = workloadHistogramHtml(weekMm);
    histogramHidden = false;
    parts.push(<DetailSection key="inst" title="Занятия" />);
    for (const m of mm.slice(0, 80)) {
      parts.push(
        <DetailRow key={m.instance_id}>
          <div className="text-[#243957]">
            <b>
              {m.date} {m.start}
            </b>{" "}
            - {m.course} ({m.tag})
          </div>
          <div className="text-[#4f5c6d]">
            группы: {m.groups.join(", ")} | ауд.:{" "}
            <DetailRoomLoad
              m={m}
              roomCapacityById={roomCapacityById}
              groupSizeById={groupSizeById}
            />
          </div>
        </DetailRow>,
      );
    }
  } else if (sel.type === "room") {
    const mm = activeMeetings(
      meetings
        .filter((m) => (m.room || "") === sel.value)
        .sort((a, b) =>
          `${a.date}|${a.start}`.localeCompare(`${b.date}|${b.start}`),
        ),
    );
    const roomCap = roomCapacityById?.[sel.value];
    detailTitle = "Аудитория";
    detailSummary = `${sel.value} (вместим.: ${roomCap ?? "-"}) | ${mm.length} занятий`;
    const weekMm = filterMeetingsToCurrentWeek(mm, weeks, weekIndex);
    histogramHtml = workloadHistogramHtml(weekMm);
    histogramHidden = false;
    parts.push(<DetailSection key="room" title="Занятия" />);
    for (const m of mm.slice(0, 80)) {
      parts.push(
        <DetailRow key={m.instance_id}>
          <div className="text-[#243957]">
            <b>
              {m.date} {m.start}
            </b>{" "}
            - {m.course} ({m.tag})
          </div>
          <div className="text-[#4f5c6d]">
            группы: {m.groups.join(", ")} | ауд.:{" "}
            <DetailRoomLoad
              m={m}
              roomCapacityById={roomCapacityById}
              groupSizeById={groupSizeById}
            />{" "}
            | заполн.: {rfp(m)} | препод.:{" "}
            <DetailInstructorLinks instructors={m.instructors} />
          </div>
        </DetailRow>,
      );
    }
  }

  if (parts.length === 0) {
    parts.push(<DetailRow key="empty">Нет совпадений.</DetailRow>);
  }

  return {
    detailTitle,
    detailSummary,
    histogramHtml,
    histogramHidden,
    listContent: <>{parts}</>,
  };
}
