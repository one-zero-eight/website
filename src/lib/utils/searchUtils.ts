import { doubleMetaphone } from "double-metaphone";
import { transliterate } from "transliteration";

// Function to convert Cyrillic text to Latin
export function transliterates(text: string): string {
  return transliterate(text); // Converts "Привет" → "Privet"
}

// Handle Russian keyboard mismatches
const keyboardMap: { [key: string]: string } = {
  й: "q",
  ц: "w",
  у: "e",
  к: "r",
  е: "t",
  н: "y",
  г: "u",
  ш: "i",
  щ: "o",
  з: "p",
  ф: "a",
  ы: "s",
  в: "d",
  а: "f",
  п: "g",
  р: "h",
  о: "j",
  л: "k",
  д: "l",
  я: "z",
  ч: "x",
  с: "c",
  м: "v",
  и: "b",
  т: "n",
  ь: "m",
};

// Convert mistyped Cyrillic input (e.g., "ghbdtn" → "Привет")
export function fixKeyboardLayout(input: string): string {
  return input
    .split("")
    .map((char) => keyboardMap[char] || char)
    .join("");
}

// Phonetic matching (Metaphone algorithm)
export function phoneticMatch(text: string): string[] {
  return doubleMetaphone(text);
}

// Preprocess text for indexing and searching
export function preprocessText(text: string | ""): string[] {
  const lowerText = text.toLowerCase();
  return [
    lowerText, // Original text
    transliterate(lowerText), // Transliteration
    fixKeyboardLayout(lowerText), // Fixed keyboard mismatches
    ...phoneticMatch(lowerText), // Phonetic variants
  ].filter(Boolean);
}
