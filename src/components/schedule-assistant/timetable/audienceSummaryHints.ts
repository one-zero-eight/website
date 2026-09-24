/** Shared compact-audience hint props for edit / create / series. */
export function audienceSummaryHintProps({
  perGroup,
  componentLabel,
  context,
  emptyLabel,
}: {
  perGroup: boolean;
  componentLabel: string;
  /** Where the hint refers to the parent audience definition. */
  context: "template" | "component" | "series";
  emptyLabel?: string;
}): {
  labelPrefix: string;
  patternLabelPrefix: string;
  patternLabel: string | undefined;
  emptyLabel: string;
} {
  const trimmed = componentLabel.trim();
  const patternLabelPrefix = perGroup
    ? "по группам"
    : context === "template"
      ? "в шаблоне"
      : context === "series"
        ? "у компонента"
        : "В компоненте";

  return {
    labelPrefix: perGroup ? "Группа" : "Группы",
    patternLabelPrefix,
    patternLabel:
      perGroup && trimmed ? `одна из ${trimmed}` : trimmed || undefined,
    emptyLabel:
      emptyLabel ??
      (perGroup
        ? "Выберите группу"
        : context === "series"
          ? "Как у компонента"
          : "—"),
  };
}
