import type { SchemaCourseConfig } from "@/api/schedule-assistant/types.ts";
import { Trans } from "@lingui/react/macro";
import { courseBlockIds } from "@/components/schedule-assistant/timetable/timetableBlocks.ts";
import {
  sortSemesterBlocks,
  type SemesterBlock,
} from "@/components/schedule-assistant/settings/semester/semesterBlocks.ts";

/** Read-only summary: teaching windows belong to individual component series. */
export function CourseBlocksEditor({
  blocks,
  course,
}: {
  blocks: SemesterBlock[];
  course: SchemaCourseConfig;
}) {
  const ids = courseBlockIds(course);
  return (
    <div className="form-control w-full shrink-0 gap-1.5 px-1 py-0.5">
      <span className="label-text text-base-content/70 text-xs font-medium tracking-wide uppercase">
        <Trans>Series blocks</Trans>
      </span>
      <div className="flex flex-wrap gap-2">
        {ids.length ? (
          sortSemesterBlocks(blocks)
            .filter((block) => ids.includes(block.id))
            .map((block) => (
              <span
                key={block.id}
                className="badge badge-ghost"
                title={`${block.start_date} — ${block.end_date}`}
              >
                {block.name}
              </span>
            ))
        ) : (
          <span className="badge badge-ghost">
            <Trans>Whole semester</Trans>
          </span>
        )}
        {ids
          .filter((id) => !blocks.some((block) => block.id === id))
          .map((id) => (
            <span key={id} className="badge badge-error">
              {id}
            </span>
          ))}
      </div>
    </div>
  );
}
