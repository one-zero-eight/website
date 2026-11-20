const QUOTE_MAX_LENGTH = 2000;

// The quoted text as a markdown quote that starts the message, so the assistant sees what it refers to
export function asQuote(quoted: string): string {
  const text = quoted.replace(/\n{3,}/g, "\n\n").trim();
  if (!text) return "";
  const shown =
    text.length > QUOTE_MAX_LENGTH
      ? `${text.slice(0, QUOTE_MAX_LENGTH)}…`
      : text;
  return shown
    .split("\n")
    .map((line) => (line ? `> ${line}` : ">"))
    .join("\n");
}

// A message made by `asQuote` back into the quote and the question after it
export function splitQuote(message: string): { quote: string; rest: string } {
  const lines = message.split("\n");
  let end = 0;
  while (end < lines.length && /^>( |$)/.test(lines[end])) end++;
  if (end === 0) return { quote: "", rest: message };
  return {
    quote: lines
      .slice(0, end)
      .map((line) => line.slice(2))
      .join("\n"),
    rest: lines.slice(end).join("\n").replace(/^\n+/, ""),
  };
}
