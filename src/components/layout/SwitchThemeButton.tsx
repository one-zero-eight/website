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
        className="flex h-14 w-14 flex-col items-center justify-center rounded-xl hover:bg-secondary-main"
        onClick={() =>
          setTernaryDarkMode((prev) => (prev === "dark" ? "light" : "dark"))
        }
      >
        <span className="icon-[material-symbols--light-mode-outline] flex text-4xl text-[#F0B132] dark:hidden" />
        <span className="icon-[material-symbols--dark-mode-outline] hidden text-4xl text-focus dark:flex" />
      </button>
    </Tooltip>
  );
}
