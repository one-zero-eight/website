import { CHECKS_RETURN_FROM } from "@/components/schedule-assistant/checks/checksNavigation.ts";
import { Link } from "@tanstack/react-router";

export function ReturnToChecksLink() {
  return (
    <Link
      to="/schedule-assistant/checks"
      className="btn btn-ghost btn-sm h-8 min-h-8 gap-1.5 px-2 font-normal"
    >
      <span className="icon-[material-symbols--arrow-back] text-base" />
      Проверка
    </Link>
  );
}

export function isChecksReturnFrom(
  value: string | undefined,
): value is typeof CHECKS_RETURN_FROM {
  return value === CHECKS_RETURN_FROM;
}
