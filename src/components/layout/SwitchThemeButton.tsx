import Tooltip from "@/components/common/Tooltip.tsx";
import { useTheme } from "@/lib/ui/use-theme.ts";
import { useLingui } from "@lingui/react/macro";

export default function SwitchThemeButton() {
  const { setTernaryDarkMode } = useTheme();
  const { t } = useLingui();

  return (
    <Tooltip content={t`Switch theme`}>
      <button
        type="button"
        className="hover:bg-base-300 flex items-center justify-center rounded-xl p-2"
        onClick={() =>
          setTernaryDarkMode((prev) => (prev === "dark" ? "light" : "dark"))
        }
      >
        <span className="icon-[material-symbols--light-mode-outline] flex text-3xl text-[#F0B132] dark:hidden" />
        <span className="icon-[material-symbols--dark-mode-outline] text-primary hidden text-3xl dark:flex" />
      </button>
    </Tooltip>
  );
}
