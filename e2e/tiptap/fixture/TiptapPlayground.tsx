import { DescriptionEditor } from "@/components/editor/DescriptionEditor.tsx";
import { DescriptionViewer } from "@/components/editor/DescriptionViewer.tsx";
import { useEffect, useState } from "react";
import type { JSONContent } from "@tiptap/core";

export function TiptapPlayground() {
  const [content, setContent] = useState<JSONContent | null>(null);

  useEffect(() => {
    window.__tiptapPlayground = {
      setContent: (next) => setContent(next),
    };

    return () => {
      delete window.__tiptapPlayground;
    };
  }, []);

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 p-4">
      <h1 className="text-2xl font-semibold">Tiptap playground</h1>

      <section data-testid="tiptap-editor" className="min-h-96">
        <h2 className="mb-2 text-lg font-medium">Editor</h2>
        <DescriptionEditor initialContent={content ?? undefined} />
      </section>

      <section data-testid="tiptap-viewer">
        <h2 className="mb-2 text-lg font-medium">Read-only viewer</h2>
        <DescriptionViewer content={content ?? undefined} />
      </section>
    </main>
  );
}

declare global {
  interface Window {
    __tiptapPlayground?: {
      setContent: (content: JSONContent) => void;
    };
  }
}
