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
        className="hover:bg-inh-secondary flex items-center justify-center rounded-xl p-2"
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
