import Tooltip from "@/components/common/Tooltip.tsx";
import { useAppLocale } from "@/locales/lib";

export function SwitchLocaleButton() {
  const [locale, setLocale] = useAppLocale();

  return (
    <Tooltip content="Switch language">
      <button
        type="button"
        className="hover:bg-base-300 text-base-content/70 hover:text-base-content flex size-12 items-center justify-center rounded-xl pt-1 text-sm font-semibold tracking-wide"
        onClick={() => setLocale(locale === "en" ? "ru" : "en")}
      >
        {locale === "en" ? "EN" : "RU"}
      </button>
    </Tooltip>
  );
}
