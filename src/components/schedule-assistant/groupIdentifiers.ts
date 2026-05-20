export type NextGroupIdentifiersContext = {
  programCode: string;
  track: { code?: string; name?: string };
};

/** Стабильный «код программы» для шаблона id группы (как в дереве настроек). */
export function programCodeForGroupIdentifiers(
  program: any,
  sectionCode: string,
  programIndex: number,
): string {
  return (
    String(program?.code || "").trim() ||
    `program-${sectionCode}-${programIndex}`
  );
}

/** Первая буква кода программы (латиница/кириллица), иначе первый символ, иначе P. */
export function firstLetterOfProgramCode(programCode: string): string {
  const s = String(programCode || "").trim();
  const m = s.match(/[A-Za-zА-Яа-яЁё]/u);
  if (m) return m[0].toUpperCase();
  if (s.length) return s[0].toUpperCase();
  return "P";
}

/** Сегмент кода трека для id группы: поле code или slug от name. */
export function trackSegmentForGroupId(track: {
  code?: string;
  name?: string;
}): string {
  const raw = String(track?.code ?? "").trim();
  if (raw) {
    const cleaned = raw
      .replace(/[^A-Za-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .replace(/-+/g, "-");
    if (cleaned) return cleaned;
  }
  const n = String(track?.name ?? "").trim();
  const slug = n
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .replace(/-+/g, "-");
  if (slug) return slug;
  return "track";
}

function buildDefaultPrefix(ctx: NextGroupIdentifiersContext): string {
  const letter = firstLetterOfProgramCode(ctx.programCode);
  const trackSeg = trackSegmentForGroupId(ctx.track);
  return `${letter}-${trackSeg}-`;
}

/** Следующий код и имя группы: при отсутствии шаблона — {буква кода программы}-{код трека}-0N (код и имя совпадают). */
export function nextGroupIdentifiers(
  existingGroupIds: string[],
  getDisplayNameForId: (id: string) => string | undefined,
  context?: NextGroupIdentifiersContext,
): { code: string; name: string } {
  function incrementTrailingDigits(s: string): string | null {
    const trimmed = s.trim();
    const match = trimmed.match(/^(.*?)(\d+)$/);
    if (!match) return null;
    const nextNum = Number.parseInt(match[2], 10) + 1;
    if (!Number.isFinite(nextNum)) return null;
    return match[1] + String(nextNum).padStart(match[2].length, "0");
  }

  function defaultFromContext(
    ordinal: number,
  ): { code: string; name: string } | null {
    if (!context?.track) return null;
    const effectiveProgramCode =
      String(context.programCode ?? "").trim() || "program";
    const prefix = buildDefaultPrefix({
      programCode: effectiveProgramCode,
      track: context.track,
    });
    const code = `${prefix}${String(ordinal).padStart(2, "0")}`;
    return { code, name: code };
  }

  if (!existingGroupIds.length) {
    const fromCtx = defaultFromContext(1);
    if (fromCtx) return fromCtx;
    return { code: "new-group-1", name: "Новая группа 1" };
  }

  const lastId = existingGroupIds[existingGroupIds.length - 1];
  const lastName = getDisplayNameForId(lastId) ?? lastId;
  const ordinal = existingGroupIds.length + 1;

  const codeFromIncrement = incrementTrailingDigits(lastId);
  const nameFromIncrement =
    incrementTrailingDigits(lastName) ??
    incrementTrailingDigits(lastId) ??
    null;

  if (codeFromIncrement) {
    const name = nameFromIncrement ?? codeFromIncrement;
    return { code: codeFromIncrement, name };
  }

  const fromCtx = defaultFromContext(ordinal);
  if (fromCtx) return fromCtx;

  return {
    code: `new-group-${ordinal}`,
    name: `Новая группа ${ordinal}`,
  };
}
