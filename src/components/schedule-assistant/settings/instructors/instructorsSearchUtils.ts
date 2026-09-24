import type { SchemaInstructor } from "@/api/schedule-assistant/types.ts";
import { fixKeyboardLayout, transliterates } from "@/lib/utils/searchUtils.ts";
import MiniSearch from "minisearch";
import { transliterate } from "transliteration";

export type InstructorSearchItem = SchemaInstructor & {
  instructorIndex: number;
  meetings_count?: number;
  /** Alias without leading @, lowercased. */
  alias_search: string;
  /** Normalized searchable names (RU/EN + translit / ё variants). */
  name_search: string;
  /** Email local-part (before @), lowercased. */
  email_local: string;
  /** Email domain (after @), lowercased. */
  email_domain: string;
  /** Email local-part tokenized as words (`a.potyomkin` → `a potyomkin`). */
  email_words: string;
  /** Search rank (lower is better when sorting by relevance). */
  fuseScore?: number;
};

type IndexedInstructor = InstructorSearchItem & {
  /** Stable MiniSearch document id (= instructorIndex). */
  docId: number;
};

export type InstructorsSearchIndex = {
  items: InstructorSearchItem[];
  byDocId: Map<number, InstructorSearchItem>;
  miniSearch: MiniSearch<IndexedInstructor>;
};

export type InstructorSortMode =
  | "meetings"
  | "name"
  | "position"
  | "preferences";

export const INSTRUCTOR_SORT_OPTIONS: {
  value: InstructorSortMode;
  label: string;
}[] = [
  { value: "meetings", label: "По количеству занятий" },
  { value: "name", label: "Имя (А–Я)" },
  { value: "position", label: "Должность" },
  { value: "preferences", label: "Предпочтения по времени" },
];

/** Word-oriented normalize: ё→е, strip punctuation, collapse spaces. */
export function normalizeName(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("ru-RU")
    .replaceAll("ё", "е")
    .replaceAll("Ё", "е")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function latinYoVariants(latin: string): string[] {
  const lower = latin.toLowerCase();
  if (!lower.includes("yo") && !lower.includes("jo")) return [lower];
  return [lower, lower.replaceAll("yo", "e").replaceAll("jo", "e")];
}

function buildNameSearchText(instructor: SchemaInstructor): string {
  const variants = new Set<string>();

  for (const raw of [instructor.name_ru, instructor.name_en]) {
    if (!raw) continue;
    const normalized = normalizeName(raw);
    if (normalized) variants.add(normalized);

    const withoutYo = normalizeName(
      raw.replaceAll("ё", "е").replaceAll("Ё", "е"),
    );
    if (withoutYo) variants.add(withoutYo);

    for (const form of [raw, raw.replaceAll("ё", "е").replaceAll("Ё", "е")]) {
      for (const latin of latinYoVariants(transliterate(form))) {
        const n = normalizeName(latin);
        if (n) variants.add(n);
      }
    }
  }

  const words = new Set<string>();
  for (const variant of variants) {
    for (const word of variant.split(" ").filter(Boolean)) {
      words.add(word);
    }
  }
  return [...words].join(" ");
}

function emailLocalPart(email: string | null | undefined): string {
  if (!email) return "";
  const lower = email.toLowerCase();
  const at = lower.indexOf("@");
  return at === -1 ? lower : lower.slice(0, at);
}

function emailDomainPart(email: string | null | undefined): string {
  if (!email) return "";
  const lower = email.toLowerCase();
  const at = lower.indexOf("@");
  return at === -1 ? "" : lower.slice(at + 1);
}

function queryTerms(query: string): string[] {
  const normalized = normalizeName(query);
  if (!normalized) return [];

  const base = normalized.split(" ").filter(Boolean);
  const extra: string[] = [];
  for (const term of base) {
    const translit = normalizeName(transliterates(term));
    const layout = normalizeName(fixKeyboardLayout(term));
    if (translit && translit !== term) extra.push(translit);
    if (layout && layout !== term) extra.push(layout);
  }

  // Keep original token order for AND search; extras only expand single-token queries.
  return base.length === 1 ? Array.from(new Set([base[0]!, ...extra])) : base;
}

export function instructorDisplayName(instructor: SchemaInstructor): string {
  return (
    instructor.name_en?.trim() ||
    instructor.name_ru?.trim() ||
    instructor.email?.trim() ||
    instructor.id ||
    ""
  );
}

function nameKey(instructor: SchemaInstructor): string {
  return instructorDisplayName(instructor).trim().toLocaleLowerCase("ru");
}

function positionKey(instructor: SchemaInstructor): string {
  return (instructor.position ?? "").trim();
}

function positionEnumIndex(
  position: string,
  positionOrder: readonly string[] | undefined,
): number {
  if (!position || !positionOrder?.length) return -1;
  const exact = positionOrder.indexOf(position);
  if (exact >= 0) return exact;
  const folded = position.toLocaleLowerCase("en");
  return positionOrder.findIndex(
    (entry) => entry.trim().toLocaleLowerCase("en") === folded,
  );
}

function preferencesCount(instructor: SchemaInstructor): number {
  return instructor.slot_preferences?.length ?? 0;
}

export function compareInstructors(
  a: SchemaInstructor & { meetings_count?: number },
  b: SchemaInstructor & { meetings_count?: number },
  mode: InstructorSortMode,
  positionOrder?: readonly string[],
): number {
  if (mode === "meetings") {
    const byMeetings = (b.meetings_count ?? 0) - (a.meetings_count ?? 0);
    if (byMeetings !== 0) return byMeetings;
    return nameKey(a).localeCompare(nameKey(b), "ru");
  }
  if (mode === "position") {
    const aPos = positionKey(a);
    const bPos = positionKey(b);
    if (!aPos && !bPos) return nameKey(a).localeCompare(nameKey(b), "ru");
    if (!aPos) return 1;
    if (!bPos) return -1;

    const aIndex = positionEnumIndex(aPos, positionOrder);
    const bIndex = positionEnumIndex(bPos, positionOrder);
    const aKnown = aIndex >= 0;
    const bKnown = bIndex >= 0;
    if (aKnown && bKnown && aIndex !== bIndex) return aIndex - bIndex;
    if (aKnown !== bKnown) return aKnown ? -1 : 1;
    if (!aKnown && !bKnown) {
      const byPosition = aPos
        .toLocaleLowerCase("ru")
        .localeCompare(bPos.toLocaleLowerCase("ru"), "ru");
      if (byPosition !== 0) return byPosition;
    }
    return nameKey(a).localeCompare(nameKey(b), "ru");
  }
  if (mode === "preferences") {
    const byPrefs = preferencesCount(b) - preferencesCount(a);
    if (byPrefs !== 0) return byPrefs;
    return nameKey(a).localeCompare(nameKey(b), "ru");
  }
  return nameKey(a).localeCompare(nameKey(b), "ru");
}

export function sortInstructors(
  items: InstructorSearchItem[],
  mode: InstructorSortMode,
  positionOrder?: readonly string[],
): InstructorSearchItem[] {
  return [...items].sort((a, b) => {
    const aScore = a.fuseScore;
    const bScore = b.fuseScore;
    if (aScore != null && bScore != null && aScore !== bScore) {
      return aScore - bScore;
    }
    return compareInstructors(a, b, mode, positionOrder);
  });
}

function tokenizeNormalized(text: string): string[] {
  return normalizeName(text).split(" ").filter(Boolean);
}

export function createInstructorsSearchIndex(
  instructors: SchemaInstructor[],
): InstructorsSearchIndex {
  const items: InstructorSearchItem[] = instructors.map(
    (instructor, instructorIndex) => {
      const email_local = emailLocalPart(instructor.email);
      const email_domain = emailDomainPart(instructor.email);
      return {
        ...instructor,
        instructorIndex,
        alias_search: (instructor.alias ?? "").replace(/^@/, "").toLowerCase(),
        name_search: buildNameSearchText(instructor),
        email_local,
        email_domain,
        email_words: normalizeName(email_local),
      };
    },
  );

  const documents: IndexedInstructor[] = items.map((item) => ({
    ...item,
    docId: item.instructorIndex,
  }));

  const miniSearch = new MiniSearch<IndexedInstructor>({
    idField: "docId",
    fields: [
      "name_search",
      "alias_search",
      "email_local",
      "email_domain",
      "email_words",
    ],
    storeFields: ["docId"],
    tokenize: (text, fieldName) => {
      if (
        fieldName === "email_local" ||
        fieldName === "alias_search" ||
        fieldName === "email_domain"
      ) {
        const term = text.trim().toLowerCase();
        return term ? [term] : [];
      }
      return tokenizeNormalized(text);
    },
    processTerm: (term) => term || null,
    searchOptions: {
      tokenize: tokenizeNormalized,
      processTerm: (term) => term || null,
    },
  });
  miniSearch.addAll(documents);

  return {
    items,
    byDocId: new Map(documents.map((doc) => [doc.docId, doc])),
    miniSearch,
  };
}

/**
 * Deterministic name ranks (higher is better):
 * 1000 exact full name, 900 exact word, 800 start of full name,
 * 700 word prefix, 200 substring inside a word.
 */
function getNameMatchRank(item: InstructorSearchItem, query: string): number {
  const normalizedQuery = normalizeName(query);
  if (!normalizedQuery) return 0;

  const names = [
    item.name_ru,
    item.name_en,
    item.name_search,
    item.alias_search,
  ]
    .filter(Boolean)
    .map((value) => normalizeName(String(value)));

  let bestRank = 0;

  for (const name of names) {
    if (!name) continue;
    const words = name.split(" ").filter(Boolean);

    if (name === normalizedQuery) {
      bestRank = Math.max(bestRank, 1000);
      continue;
    }
    if (words.some((word) => word === normalizedQuery)) {
      bestRank = Math.max(bestRank, 900);
      continue;
    }
    if (name.startsWith(normalizedQuery)) {
      bestRank = Math.max(bestRank, 800);
      continue;
    }
    if (words.some((word) => word.startsWith(normalizedQuery))) {
      bestRank = Math.max(bestRank, 700);
      continue;
    }
    if (words.some((word) => word.includes(normalizedQuery))) {
      bestRank = Math.max(bestRank, 200);
    }
  }

  return bestRank;
}

type RankedHit = { item: InstructorSearchItem; score: number; tier: number };

/** Same options for short and long queries: exact > prefix > fuzzy. */
const SEARCH_MATCH_OPTIONS = {
  prefix: true as const,
  fuzzy: 0.2 as const,
  weights: { prefix: 0.8, fuzzy: 0.2 },
  combineWith: "AND" as const,
};

function upsertHit(
  ranked: Map<number, RankedHit>,
  item: InstructorSearchItem,
  score: number,
  tier: number,
) {
  const key = item.instructorIndex;
  const current = ranked.get(key);
  if (
    !current ||
    tier < current.tier ||
    (tier === current.tier && score < current.score)
  ) {
    ranked.set(key, { item, score, tier });
  }
}

function collectNameHits(
  index: InstructorsSearchIndex,
  query: string,
  ranked: Map<number, RankedHit>,
  tier: number,
) {
  const normalized = normalizeName(query);
  if (!normalized) return;

  const tokenCount = normalized.split(" ").filter(Boolean).length;
  // Multi-word: one AND query. Single-word: also try translit / keyboard variants.
  const searchQueries = tokenCount > 1 ? [normalized] : queryTerms(query);

  for (const searchQuery of searchQueries) {
    if (!searchQuery) continue;

    const results = index.miniSearch.search(searchQuery, {
      ...SEARCH_MATCH_OPTIONS,
      fields: ["name_search"],
      boost: { name_search: 2 },
    });

    for (const result of results) {
      const item = index.byDocId.get(Number(result.id));
      if (!item) continue;

      const nameRank = getNameMatchRank(item, searchQuery);
      // Prefer nameRank; invert MiniSearch score so lower fuseScore = better.
      const score = 1000 - nameRank + 1 / (1 + result.score);
      upsertHit(ranked, item, score, tier);
    }
  }
}

function collectEmailHits(
  index: InstructorsSearchIndex,
  query: string,
  ranked: Map<number, RankedHit>,
  tier: number,
) {
  const lower = query.trim().toLowerCase();
  const needle = lower.includes("@") ? emailLocalPart(lower) : lower;
  if (!needle) return;

  const looksLikeEmail = lower.includes("@") || needle.includes(".");

  for (const item of index.items) {
    if (!item.email_local) continue;
    if (item.email_local === needle || item.email?.toLowerCase() === lower) {
      upsertHit(ranked, item, 0, tier);
      continue;
    }
    if (item.email_local.startsWith(needle)) {
      upsertHit(ranked, item, 0.05, tier);
    }
  }

  // Dotted / full addresses: prefer exact-ish local matches only.
  if (ranked.size > 0 && looksLikeEmail) {
    return;
  }

  if (looksLikeEmail) {
    const results = index.miniSearch.search(needle, {
      ...SEARCH_MATCH_OPTIONS,
      fields: ["email_local"],
      tokenize: (text) => {
        const term = text.trim().toLowerCase();
        return term ? [term] : [];
      },
    });
    for (const result of results) {
      const item = index.byDocId.get(Number(result.id));
      if (!item) continue;
      upsertHit(ranked, item, 1 / (1 + result.score), tier);
    }
    return;
  }

  // Plain text: match email local-part words (`potyomkin` → `a.potyomkin`).
  const searchQueries =
    normalizeName(needle).split(" ").filter(Boolean).length > 1
      ? [normalizeName(needle)]
      : queryTerms(needle);

  for (const searchQuery of searchQueries) {
    if (!searchQuery) continue;
    const results = index.miniSearch.search(searchQuery, {
      ...SEARCH_MATCH_OPTIONS,
      fields: ["email_words"],
      boost: { email_words: 1.5 },
    });
    for (const result of results) {
      const item = index.byDocId.get(Number(result.id));
      if (!item) continue;
      upsertHit(ranked, item, 0.5 + 1 / (1 + result.score), tier);
    }
  }
}

/** `@mail.ru` / `mail.ru` → instructors with that email domain. */
function collectDomainHits(
  index: InstructorsSearchIndex,
  query: string,
  ranked: Map<number, RankedHit>,
  tier: number,
) {
  const domain = query.replace(/^@/, "").trim().toLowerCase();
  if (!domain) return;

  for (const item of index.items) {
    if (!item.email_domain) continue;
    if (item.email_domain === domain) {
      upsertHit(ranked, item, 0, tier);
      continue;
    }
    // `@mail.ru` matches `user@corp.mail.ru`
    if (item.email_domain.endsWith(`.${domain}`)) {
      upsertHit(ranked, item, 0.05, tier);
      continue;
    }
    // `@mail` matches `mail.ru`
    if (item.email_domain.startsWith(`${domain}.`)) {
      upsertHit(ranked, item, 0.1, tier);
    }
  }

  if (ranked.size > 0) return;

  const results = index.miniSearch.search(domain, {
    ...SEARCH_MATCH_OPTIONS,
    fields: ["email_domain"],
    tokenize: (text) => {
      const term = text.trim().toLowerCase();
      return term ? [term] : [];
    },
  });
  for (const result of results) {
    const item = index.byDocId.get(Number(result.id));
    if (!item) continue;
    upsertHit(ranked, item, 1 / (1 + result.score), tier);
  }
}

function collectAliasHits(
  index: InstructorsSearchIndex,
  query: string,
  ranked: Map<number, RankedHit>,
  tier: number,
) {
  const withoutAt = query.replace(/^@/, "").trim().toLowerCase();
  if (!withoutAt) return;

  for (const item of index.items) {
    if (!item.alias_search) continue;
    if (item.alias_search === withoutAt) {
      upsertHit(ranked, item, 0, tier);
      continue;
    }
    if (item.alias_search.startsWith(withoutAt)) {
      upsertHit(ranked, item, 0.05, tier);
    }
  }

  // Always fuzzy-search aliases (typos like @apoot → @apot).
  const results = index.miniSearch.search(withoutAt, {
    prefix: true,
    fuzzy: 0.4,
    weights: { prefix: 0.8, fuzzy: 0.5 },
    combineWith: "AND",
    fields: ["alias_search"],
    tokenize: (text) => {
      const term = text.trim().toLowerCase();
      return term ? [term] : [];
    },
  });

  for (const result of results) {
    const item = index.byDocId.get(Number(result.id));
    if (!item) continue;
    upsertHit(ranked, item, 0.2 + 1 / (1 + result.score), tier);
  }
}

export function searchInstructors(
  index: InstructorsSearchIndex,
  searchQuery: string,
): InstructorSearchItem[] {
  const trimmed = searchQuery.trim();
  if (!trimmed) return [];

  const ranked = new Map<number, RankedHit>();

  if (trimmed.startsWith("@")) {
    const withoutAt = trimmed.slice(1).trim();
    // `@mail.ru` → domain; `@handle` → alias (+ local-part / domain prefix)
    if (withoutAt.includes(".")) {
      collectDomainHits(index, withoutAt, ranked, 0);
      collectAliasHits(index, trimmed, ranked, 1);
    } else {
      collectAliasHits(index, trimmed, ranked, 0);
      collectDomainHits(index, withoutAt, ranked, 1);
      collectEmailHits(index, withoutAt, ranked, 1);
    }
  } else if (trimmed.includes("@")) {
    collectEmailHits(index, trimmed, ranked, 0);
    // Domain fallback only when local-part didn't match anyone.
    if (ranked.size === 0) {
      const domain = emailDomainPart(trimmed);
      if (domain) collectDomainHits(index, domain, ranked, 0);
    }
  } else if (trimmed.includes(".")) {
    collectEmailHits(index, trimmed, ranked, 0);
    collectDomainHits(index, trimmed, ranked, 0);
    collectNameHits(index, trimmed, ranked, 1);
  } else {
    collectNameHits(index, trimmed, ranked, 0);
    collectEmailHits(index, trimmed, ranked, 0);
    collectAliasHits(index, trimmed, ranked, 0);
  }

  return Array.from(ranked.values())
    .sort((a, b) => a.tier - b.tier || a.score - b.score)
    .map(({ item, score, tier }) => ({
      ...item,
      fuseScore: tier + score,
    }));
}
