import { useAppLocale } from "@/locales/lib";
import { useAutoUpdateBlocker } from "@/app/use-auto-update-blocker.ts";
import InstructionsEn from "./instructions.mdx";
import InstructionsRu from "./instructions.ru.mdx";

export function MusicRoomInstructions() {
  // The embedded cross-origin video does not expose its playback state to this page.
  useAutoUpdateBlocker();
  const [locale] = useAppLocale();
  const Instructions = locale === "ru" ? InstructionsRu : InstructionsEn;

  return (
    <div className="my-4 flex w-full justify-center">
      <div className="flex max-w-3xl flex-col gap-4">
        <Instructions />
      </div>
    </div>
  );
}
