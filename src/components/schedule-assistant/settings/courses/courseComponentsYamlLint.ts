import { linter, lintGutter, type Diagnostic } from "@codemirror/lint";
import type { Extension } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import Ajv, { type ErrorObject } from "ajv";
import { parseDocument } from "yaml";
import type { Node } from "yaml";

/**
 * JSON Schema for `courses[].components[]` (schedule-assistant CourseConfig.Component).
 * Aligns with schedule-assistant/config.py CourseConfig.Component.
 */
const courseComponentsRootSchema = {
  title: "Компоненты курса",
  description: "Корень YAML — массив компонентов занятий (lec/tut/lab/…).",
  type: "array",
  items: { $ref: "#/$defs/component" },
  $defs: {
    weeklyPatternSlot: {
      type: "object",
      additionalProperties: false,
      required: ["day", "time"],
      properties: {
        day: { type: "string" },
        time: { type: "string" },
        room: { type: ["string", "null"] },
        instructor: {
          anyOf: [
            { type: "null" },
            { type: "string" },
            { type: "array", items: { type: "string" } },
          ],
        },
      },
    },
    componentSessionSeries: {
      type: "object",
      additionalProperties: false,
      properties: {
        audience: {
          type: "array",
          items: { type: "string" },
          default: [],
        },
        weekly_pattern: {
          anyOf: [
            { type: "null" },
            {
              type: "array",
              items: { $ref: "#/$defs/weeklyPatternSlot" },
            },
          ],
        },
        dates: {
          anyOf: [
            { type: "null" },
            { type: "array", items: { type: "string" } },
          ],
        },
        times: {
          anyOf: [
            { type: "null" },
            { type: "array", items: { type: "string" } },
          ],
        },
        rooms: {
          anyOf: [
            { type: "null" },
            { type: "array", items: { type: "string" } },
          ],
        },
        instructors: {
          anyOf: [
            { type: "null" },
            {
              type: "array",
              items: {
                anyOf: [
                  { type: "string" },
                  { type: "array", items: { type: "string" } },
                ],
              },
            },
          ],
        },
      },
    },
    component: {
      type: "object",
      additionalProperties: false,
      required: ["tag"],
      properties: {
        tag: {
          type: "string",
          description: "Тип занятия: lec, tut, lab, class и т.д.",
        },
        per_week: {
          anyOf: [{ type: "integer", minimum: 0 }, { type: "null" }],
          description: "Число занятий в неделю",
        },
        per_semester: {
          anyOf: [{ type: "integer", minimum: 0 }, { type: "null" }],
          description: "Число занятий за семестр (элективы и т.п.)",
        },
        instructor_pool: {
          type: "array",
          description: "Пул преподавателей (вложенные массивы — co-teaching)",
          default: [],
          items: {
            anyOf: [
              { type: "string" },
              { type: "array", items: { type: "string" } },
            ],
          },
        },
        student_groups: {
          type: "array",
          items: { type: "string" },
          default: [],
        },
        expected_enrollment: {
          type: ["integer", "null"],
          description: "Ожидаемая численность",
        },
        per_group: {
          type: "boolean",
          default: false,
        },
        relates_to: {
          description: "Индекс другого компонента или список индексов",
          anyOf: [
            { type: "null" },
            { type: "integer" },
            { type: "array", items: { type: "integer" } },
          ],
        },
        sessions: {
          anyOf: [
            { type: "null" },
            {
              type: "array",
              items: { $ref: "#/$defs/componentSessionSeries" },
            },
          ],
        },
      },
    },
  },
} as const;

const ajv = new Ajv({ allErrors: true, strict: false });
const validateComponents = ajv.compile(courseComponentsRootSchema);

/** Все коды групп из `students_groups`, как в настройках. */
export function collectKnownStudentGroupIds(config: unknown): Set<string> {
  const ids = new Set<string>();
  const c = config as {
    students_groups?: Array<{ code?: string }>;
  };
  if (Array.isArray(c?.students_groups)) {
    for (const g of c.students_groups) {
      const id = String(g?.code ?? "").trim();
      if (id) ids.add(id);
    }
  }
  return ids;
}

function isProgramSelectorToken(token: string): boolean {
  return token.trim().startsWith("@");
}

function pushUnknownStudentGroupWarnings(
  yDoc: ReturnType<typeof parseDocument>,
  data: unknown[],
  docLen: number,
  knownGroupIds: Set<string>,
  onCreateGroup: (groupId: string) => void,
  diagnostics: Diagnostic[],
): void {
  for (let i = 0; i < data.length; i++) {
    const comp = data[i] as Record<string, unknown> | null;
    if (!comp || typeof comp !== "object") continue;
    const sgs = comp.student_groups;
    if (!Array.isArray(sgs)) continue;
    for (let j = 0; j < sgs.length; j++) {
      const raw = sgs[j];
      if (typeof raw !== "string") continue;
      const token = raw.trim();
      if (!token || isProgramSelectorToken(token)) continue;
      if (knownGroupIds.has(token)) continue;

      const got = yDoc.getIn([i, "student_groups", j], true);
      const node = got as Node | undefined;
      const rng = rangeFromNode(node, docLen);
      const from = rng?.from ?? 0;
      const to = rng?.to ?? Math.min(1, docLen);

      diagnostics.push({
        from,
        to,
        severity: "warning",
        message: `Группа «${token}» не найдена в конфигурации.`,
        source: "groups",
        actions: [
          {
            name: "Создать группу…",
            apply: (_view, _from, _to) => {
              onCreateGroup(token);
            },
          },
        ],
      });
    }
  }
}

/** Парсинг YAML + проверка по JSON Schema (для сохранения по blur). */
export function validateCourseComponentsYaml(
  text: string,
): { ok: true; value: unknown[] } | { ok: false; error: string } {
  const trimmed = text.trim();
  if (!trimmed) return { ok: true, value: [] };

  const yDoc = parseDocument(text);
  if (yDoc.errors.length > 0) {
    return { ok: false, error: yDoc.errors[0].message };
  }

  let data: unknown;
  try {
    data = yDoc.toJS();
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  if (!Array.isArray(data)) {
    return {
      ok: false,
      error: "Корень должен быть YAML-массивом компонентов.",
    };
  }

  const valid = validateComponents(data);
  if (!valid) {
    const first = validateComponents.errors?.[0];
    const msg = first
      ? formatAjvMessage(first)
      : "Документ не соответствует схеме компонентов курса.";
    return { ok: false, error: msg };
  }

  return { ok: true, value: data };
}

function instancePathToSegments(instancePath: string): (string | number)[] {
  if (!instancePath || instancePath === "/") return [];
  return instancePath
    .split("/")
    .filter(Boolean)
    .map((segment) => {
      const n = Number(segment);
      return Number.isInteger(n) && String(n) === segment ? n : segment;
    });
}

function mergeAjvPath(err: ErrorObject): string {
  let path = err.instancePath || "";
  if (
    err.keyword === "additionalProperties" &&
    err.params &&
    typeof err.params === "object"
  ) {
    const ap = (err.params as { additionalProperty?: string })
      .additionalProperty;
    if (ap) path = `${path}/${ap}`;
  }
  if (
    err.keyword === "required" &&
    err.params &&
    typeof err.params === "object"
  ) {
    const m = (err.params as { missingProperty?: string }).missingProperty;
    if (m) path = `${path}/${m}`;
  }
  return path;
}

function rangeFromNode(
  node: Node | null | undefined,
  docLen: number,
): { from: number; to: number } | null {
  if (!node || typeof node !== "object") return null;
  const r = (node as Node).range;
  if (!r || !Array.isArray(r)) return null;
  const from = r[0];
  const toEnd = r[2] ?? r[1] ?? from;
  const to = Math.max(toEnd, from + 1);
  if (from < 0 || from > docLen) return null;
  return { from, to: Math.min(to, docLen) };
}

function rangeForYamlError(
  pos: [number, number],
  docLen: number,
): { from: number; to: number } {
  const from = Math.min(Math.max(0, pos[0]), docLen);
  const to = Math.min(Math.max(from + 1, pos[1]), docLen);
  return { from, to };
}

function formatAjvMessage(err: ErrorObject): string {
  if (
    err.keyword === "additionalProperties" &&
    err.params &&
    typeof err.params === "object"
  ) {
    const ap = (err.params as { additionalProperty?: string })
      .additionalProperty;
    if (ap)
      return `Лишнее поле «${ap}» (схема не допускает неизвестные ключи).`;
  }
  if (
    err.keyword === "required" &&
    err.params &&
    typeof err.params === "object"
  ) {
    const m = (err.params as { missingProperty?: string }).missingProperty;
    if (m) return `Отсутствует обязательное поле «${m}».`;
  }
  if (err.keyword === "type" && err.params && typeof err.params === "object") {
    const p = err.params as { type?: string | string[] };
    const t = Array.isArray(p.type) ? p.type.join(" | ") : p.type;
    if (t) return `Неверный тип данных (ожидается: ${t}).`;
  }
  return err.message || String(err.keyword);
}

function createLintCourseComponentsYaml(
  knownGroupIds: Set<string>,
  onCreateGroup: (groupId: string) => void,
) {
  return function lintCourseComponentsYaml(view: EditorView): Diagnostic[] {
    const text = view.state.doc.toString();
    const docLen = text.length;
    const diagnostics: Diagnostic[] = [];

    const yDoc = parseDocument(text);

    for (const err of yDoc.errors) {
      const { from, to } = rangeForYamlError(err.pos, docLen);
      diagnostics.push({
        from,
        to,
        severity: "error",
        message: err.message,
        source: "yaml",
      });
    }

    if (yDoc.errors.length > 0) {
      return diagnostics;
    }

    let data: unknown;
    try {
      data = yDoc.toJS();
    } catch (e) {
      diagnostics.push({
        from: 0,
        to: Math.min(1, docLen),
        severity: "error",
        message: e instanceof Error ? e.message : String(e),
        source: "yaml",
      });
      return diagnostics;
    }

    if (!Array.isArray(data)) {
      const r = rangeFromNode(yDoc.contents as Node | null, docLen);
      diagnostics.push({
        from: r?.from ?? 0,
        to: r?.to ?? Math.min(1, docLen),
        severity: "error",
        message: "Корень YAML должен быть массивом компонентов (список с «-»).",
        source: "schema",
      });
      return diagnostics;
    }

    const ok = validateComponents(data);
    if (!ok) {
      const errors = validateComponents.errors ?? [];
      const seen = new Set<string>();

      for (const err of errors) {
        const pathStr = mergeAjvPath(err);
        const key = `${pathStr}|${err.keyword}|${err.message}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const segments = instancePathToSegments(pathStr);
        let node: Node | null | undefined = yDoc.contents as
          | Node
          | null
          | undefined;
        if (segments.length > 0) {
          const got = yDoc.getIn(segments, true);
          node = got as Node | null | undefined;
        }

        let errFrom = 0;
        let errTo = Math.min(1, docLen);
        const rng = rangeFromNode(node ?? null, docLen);
        if (rng) {
          errFrom = rng.from;
          errTo = rng.to;
        } else if (yDoc.contents) {
          const fallback = rangeFromNode(yDoc.contents as Node, docLen);
          if (fallback) {
            errFrom = fallback.from;
            errTo = fallback.to;
          }
        }

        diagnostics.push({
          from: errFrom,
          to: errTo,
          severity: "error",
          message: formatAjvMessage(err),
          source: "schema",
        });
      }

      return diagnostics;
    }

    pushUnknownStudentGroupWarnings(
      yDoc,
      data as unknown[],
      docLen,
      knownGroupIds,
      onCreateGroup,
      diagnostics,
    );
    return diagnostics;
  };
}

/** Подсветка ошибок и отступ с маркерами, как в IDE / LSP. */
export function courseComponentsYamlLintExtensions(
  knownGroupIds: Set<string>,
  onCreateGroup: (groupId: string) => void,
): Extension[] {
  return [
    linter(createLintCourseComponentsYaml(knownGroupIds, onCreateGroup), {
      delay: 280,
    }),
    lintGutter(),
  ];
}
