import type { SchemaTrainingInfoPersonalSchema } from "@/api/sport/types.ts";

export function sportTrainingTitle(
  row: Pick<SchemaTrainingInfoPersonalSchema, "training">,
): string {
  const t = row.training;
  return (
    t.display_name ||
    [t.sport_name, t.group_name || t.training_custom_name]
      .filter(Boolean)
      .join(" — ") ||
    "Training"
  );
}
