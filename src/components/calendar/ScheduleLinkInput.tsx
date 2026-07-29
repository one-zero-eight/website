export default function ScheduleLinkInput({
  id,
  url,
  setURL,
}: {
  id: string;
  url: string;
  setURL: (url: string) => void;
}) {
  return (
    <div className="flex flex-row gap-2">
      <input
        id={id}
        value={url}
        onChange={(e) => setURL(e.target.value)}
        placeholder="Paste your link here..."
        className="bg-base-200 mb-3 w-full grow rounded-xl p-2 focus:outline-none"
      />
    </div>
  );
}
