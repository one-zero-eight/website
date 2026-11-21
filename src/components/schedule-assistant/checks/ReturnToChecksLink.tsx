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
