import Tooltip from "@/components/common/Tooltip.tsx";
import { useTernaryDarkMode } from "usehooks-ts";

export default function SwitchThemeButton() {
  const { setTernaryDarkMode } = useTernaryDarkMode({
    defaultValue: "dark",
    initializeWithValue: true,
    localStorageKey: "theme",
  });

  return (
    <Tooltip content="Switch theme">
      <button
        type="button"
        className="flex items-center justify-center rounded-xl p-2 hover:bg-secondary"
        onClick={() =>
          setTernaryDarkMode((prev) => (prev === "dark" ? "light" : "dark"))
        }
      >
        <span className="icon-[material-symbols--light-mode-outline] flex text-3xl text-[#F0B132] dark:hidden" />
        <span className="icon-[material-symbols--dark-mode-outline] hidden text-3xl text-brand-violet dark:flex" />
      </button>
    </Tooltip>
  );
}
