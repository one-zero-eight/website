import Instructions from "./instructions.mdx";

export function MusicRoomInstructions() {
  return (
    <div className="my-4 flex w-full justify-center">
      <div className="flex max-w-3xl flex-col gap-4">
        <Instructions />
      </div>
    </div>
  );
}
