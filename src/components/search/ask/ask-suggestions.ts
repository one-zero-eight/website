import { msg } from "@lingui/core/macro";
import type { AskMessage } from "./ask-session";

export const SEARCH_COMMANDS = ["/search ", "/поиск "];

// The questions offered on an empty chat and completed while typing
export const exampleQuestions = [
  msg`What is on my schedule tomorrow?`,
  msg`What are the university exam retake rules?`,
  msg`Find a room available tomorrow from 15:00 to 16:00.`,
  msg`What was announced in my available chats this week?`,
  msg`How do I get to Innopolis University from Kazan?`,
];

// The questions asked in the open chat, newest first: they are completed from their start
export function conversationQuestions(messages: AskMessage[]): string[] {
  return messages
    .flatMap((m) =>
      m.role === "user" ? [m.content] : m.role === "search" ? [m.query] : [],
    )
    .reverse();
}

// Answer text without markdown marks, so that a word typed by the user is found in it
function plainText(markdown: string): string {
  return markdown
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[\d+\]/g, "")
    .replace(/[*_`#>|]/g, "");
}

// Everything the open chat says, newest first: the answers, the titles and previews of
// the sources found and the questions. A word typed by the user is finished from here
export function conversationTexts(messages: AskMessage[]): string[] {
  const texts: string[] = [];
  for (const m of [...messages].reverse()) {
    if (m.role === "user") texts.push(m.content);
    else if (m.role === "search") {
      for (const { source } of m.results) {
        texts.push(
          source.display_name,
          "preview_text" in source ? source.preview_text : "",
        );
      }
      texts.push(m.query);
    } else {
      texts.push(
        plainText(m.response.answer),
        ...m.response.sources.map((source) => source.title),
      );
    }
  }
  return texts.filter((text) => text.trim());
}

const TAIL_WORDS = 3;
const FOLLOWING_WORDS = 2;
const WORD = "[\\p{L}\\p{N}_-]";

// What follows the typed tail in `source`: the rest of its word and up to two more words
function continuation(source: string, tail: string): string {
  const typed = tail
    .split(/\s+/)
    .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("\\s+");
  const found = new RegExp(`(?<!${WORD})${typed}`, "giu");
  for (const match of source.matchAll(found)) {
    const rest = source.slice(match.index + match[0].length);
    let result = rest.match(new RegExp(`^${WORD}*`, "u"))![0];
    const following = new RegExp(`^[ \\t]+${WORD}+`, "u");
    for (let i = 0; i < FOLLOWING_WORDS; i++) {
      const word = rest.slice(result.length).match(following)?.[0];
      if (!word) break;
      result += word;
    }
    if (result) return result;
  }
  return "";
}

// The rest of the text from the best match, or "" when nothing matches. In order:
// a question or command that starts with `text`; then the last words typed, matched from
// a word start anywhere in `context` and continued with the words that follow there
export function completionFor(
  text: string,
  phrases: string[],
  context: string[] = [],
): string {
  if (text.includes("\n")) return "";
  if (text.trim().length < 3 && !text.startsWith("/")) return "";
  const lower = text.toLowerCase();
  const phrase = phrases.find(
    (c) => c.length > text.length && c.toLowerCase().startsWith(lower),
  );
  if (phrase) return phrase.slice(text.length);
  if (text.startsWith("/") || /\s$/.test(text)) return "";
  const words = text.split(/\s+/);
  for (let k = Math.min(TAIL_WORDS, words.length); k >= 1; k--) {
    const tail = words.slice(-k).join(" ");
    for (const source of [...context, ...phrases]) {
      const rest = continuation(source, tail);
      if (rest) return rest;
    }
  }
  return "";
}

// The first word of a completion with the spaces before it: what → accepts
export function nextWord(completion: string): string {
  return completion.match(/^\s*\S+/)?.[0] ?? completion;
}
