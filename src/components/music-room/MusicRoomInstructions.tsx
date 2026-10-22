import { useAppLocale } from "@/locales/lib";
import InstructionsEn from "./instructions.mdx";
import InstructionsRu from "./instructions.ru.mdx";

export function MusicRoomInstructions() {
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
