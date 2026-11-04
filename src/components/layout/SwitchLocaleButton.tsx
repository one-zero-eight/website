import { useLingui } from "@lingui/react/macro";
import Tooltip from "@/components/common/Tooltip.tsx";
import { LOCALE_LABELS, useAppLocale } from "@/locales/lib";

export function SwitchLocaleButton() {
  const { t } = useLingui();
  const [locale, setLocale] = useAppLocale();

  return (
    <Tooltip content={t`Switch language`}>
      <button
        type="button"
        className="hover:bg-base-300 text-base-content/70 hover:text-base-content flex size-12 items-center justify-center rounded-xl pt-1 text-sm font-semibold tracking-wide"
        onClick={() => setLocale(locale === "en" ? "ru" : "en")}
      >
        {LOCALE_LABELS[locale]}
      </button>
    </Tooltip>
  );
}
