import { $workshops } from "@/api/workshops";
import { Link, useLocation } from "@tanstack/react-router";
import clsx from "clsx";

export function WorkshopsTabs() {
  const { data: workshopsUser } = $workshops.useQuery("get", "/users/me");

  if (workshopsUser?.role !== "admin") {
    return null;
  }
  return (
    <div className="flex shrink-0 flex-row gap-1 overflow-x-auto whitespace-nowrap border-b-[1px] border-b-secondary-hover px-2">
      <Tab title="Check in" to="/workshops" />
      <Tab title="Admin" to="/workshops/admin" />
    </div>
  );
}

function Tab({ title, to }: { title: string; to: string }) {
  const pathname = useLocation({
    select: ({ pathname }) => pathname,
  });

  return (
    <Link
      to={to}
      className={clsx(
        "px-2 py-1",
        pathname === to && "border-b-2 border-b-brand-violet",
      )}
    >
      {title}
    </Link>
  );
}
