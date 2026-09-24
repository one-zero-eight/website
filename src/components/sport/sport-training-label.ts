export function sportTrainingTitle(row: {
  training: {
    sport_name?: string | null;
    group_name?: string | null;
    display_name?: string | null;
    training_custom_name?: string | null;
    custom_name?: string | null;
    training_class?: string | null;
  };
}): string {
  const training = row.training;
  return (
    training.display_name ||
    [
      training.sport_name,
      training.group_name ||
        training.training_custom_name ||
        training.custom_name,
    ]
      .filter(Boolean)
      .join(" — ") ||
    training.training_class ||
    "Training"
  );
}
