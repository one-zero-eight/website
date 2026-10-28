import { t } from "@lingui/core/macro";

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
    ? t`by group`
    : context === "template"
      ? t`in template`
      : context === "series"
        ? t`from component`
        : t`In component`;

  return {
    labelPrefix: perGroup ? t`Group` : t`Groups`,
    patternLabelPrefix,
    patternLabel:
      perGroup && trimmed ? t`one of ${trimmed}` : trimmed || undefined,
    emptyLabel:
      emptyLabel ??
      (perGroup
        ? t`Select a group`
        : context === "series"
          ? t`Same as component`
          : "—"),
  };
}
