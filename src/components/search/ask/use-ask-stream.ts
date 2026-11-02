import { searchFetch, searchTypes } from "@/api/search";
import { useEffect, useRef, useState } from "react";

type AskStreamEvent =
  | { name: "cancelled"; data: { detail: string } }
  | { name: "status"; data: { text: string } }
  | { name: "answer"; data: { text: string } }
  | { name: "done"; data: searchTypes.SchemaAskResponses }
  | { name: "error"; data: { detail: string } };

function parseEvent(block: string): AskStreamEvent | undefined {
  const name = block.match(/^event: (.+)$/m)?.[1];
  const data = block.match(/^data: (.+)$/m)?.[1];
  if (!name || !data) return undefined;
  return { name, data: JSON.parse(data) } as AskStreamEvent;
}

export function useAskStream() {
  const [answerText, setAnswerText] = useState("");
  const [status, setStatus] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortController = useRef<AbortController | null>(null);

  // Stop the answer when the page is closed
  useEffect(() => () => abortController.current?.abort(), []);

  async function ask(
    query: string,
    chatId: string | null,
  ): Promise<searchTypes.SchemaAskResponses | undefined> {
    abortController.current?.abort();
    const controller = new AbortController();
    abortController.current = controller;

    setAnswerText("");
    setStatus("");
    setError(null);
    setIsPending(true);

    try {
      const { data: stream, error: requestError } = await searchFetch.POST(
        "/ask/stream",
        {
          body: { query, chat_id: chatId },
          parseAs: "stream",
          signal: controller.signal,
        },
      );
      if (requestError || !stream) {
        throw new Error("Failed to start the answer");
      }

      const reader = stream.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += value;

        const blocks = buffer.split("\n\n");
        buffer = blocks.pop() ?? "";
        for (const block of blocks) {
          const event = parseEvent(block);
          if (event?.name === "cancelled") {
            return undefined;
          } else if (event?.name === "status") {
            setStatus(event.data.text);
          } else if (event?.name === "answer") {
            setAnswerText(event.data.text);
          } else if (event?.name === "error") {
            throw new Error(event.data.detail);
          } else if (event?.name === "done") {
            return event.data;
          }
        }
      }
      throw new Error("The answer ended unexpectedly");
    } catch (e) {
      if (controller.signal.aborted) return undefined;
      setError(e instanceof Error ? e : new Error(String(e)));
      return undefined;
    } finally {
      if (abortController.current === controller) {
        setIsPending(false);
      }
    }
  }

  // Closing the stream cancels the question on the server, even if it is still waiting in the queue
  function cancel() {
    abortController.current?.abort();
    setIsPending(false);
  }

  return { ask, cancel, answerText, status, isPending, error };
}
