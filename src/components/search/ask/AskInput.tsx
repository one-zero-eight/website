import { useLingui } from "@lingui/react/macro";

// The message box under the chat: Enter sends, Shift+Enter starts a new line; while an answer is written, the button stops it
export function AskInput({
  text,
  setText,
  onSend,
  onStop,
  isPending,
}: {
  text: string;
  setText: (text: string) => void;
  onSend: (query: string) => void;
  onStop: () => void;
  isPending: boolean;
}) {
  const { t } = useLingui();

  const handleSend = () => {
    if (isPending || !text.trim()) return;
    onSend(text.trim());
  };

  return (
    <div className="border-base-300 bg-base-100 rounded-field focus-within:border-primary flex items-end gap-2 border-2 p-2">
      <textarea
        className="field-sizing-content max-h-48 min-h-8 grow resize-none bg-transparent px-2 py-1 text-base outline-hidden"
        rows={1}
        autoFocus
        placeholder={t`Ask a question...`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) {
            return;
          }
          e.preventDefault();
          handleSend();
        }}
      />
      {isPending ? (
        <button
          type="button"
          className="btn btn-circle btn-sm btn-neutral"
          title={t`Stop`}
          onClick={onStop}
        >
          <span className="icon-[material-symbols--stop] text-lg" />
        </button>
      ) : (
        <button
          type="button"
          className="btn btn-circle btn-sm btn-primary"
          title={t`Send`}
          disabled={!text.trim()}
          onClick={handleSend}
        >
          <span className="icon-[material-symbols--arrow-upward-rounded] text-lg" />
        </button>
      )}
    </div>
  );
}
