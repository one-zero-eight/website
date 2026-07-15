import { $sport } from "@/api/sport";
import type { SchemaBadGradeReportSchema } from "@/api/sport/types.ts";
import type { useToast } from "@/components/toast";
import type { useQueryClient } from "@tanstack/react-query";

export const sportTrainerMenuBtn =
  "btn btn-outline border-2 hover:border-[#8D4CF6] hover:bg-transparent hover:text-[#8D4CF6] active:border-[#8D4CF6] active:bg-transparent active:text-[#8D4CF6]";
export const sportTrainerMenuBtnActive =
  "border-[#8D4CF6] bg-transparent text-[#8D4CF6] hover:border-[#8D4CF6] hover:bg-transparent hover:text-[#8D4CF6] active:border-[#8D4CF6] active:bg-transparent active:text-[#8D4CF6]";

export function formatStudentName(student: {
  first_name: string;
  last_name: string;
}) {
  return `${student.first_name} ${student.last_name}`.trim();
}

export function invalidateAttendance(
  client: ReturnType<typeof useQueryClient>,
  trainingId: number,
) {
  client.invalidateQueries({
    queryKey: $sport.queryOptions(
      "get",
      "/trainings/{training_id}/attendance",
      {
        params: { path: { training_id: trainingId } },
      },
    ).queryKey,
  });
}

export function handleAttendanceResponse(
  data: { email: string; hours: number }[] | SchemaBadGradeReportSchema,
  showSuccess: ReturnType<typeof useToast>["showSuccess"],
  showWarning: ReturnType<typeof useToast>["showWarning"],
) {
  if (Array.isArray(data)) {
    showSuccess("Attendance updated", "Hours have been saved.");
    return;
  }

  showWarning("Attendance issue", data.description);
}
