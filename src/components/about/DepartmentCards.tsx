import { cn } from "@/lib/ui/cn";
import { departments } from "./aboutConstants.ts";
import { useLingui } from "@lingui/react";

export function DepartmentCards() {
  const { i18n } = useLingui();

  return (
    <div className="clear-both my-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
      {departments.map((department) => (
        <div
          key={department.icon}
          className="bg-base-200 flex flex-col items-center rounded-lg px-4 py-8 text-center shadow-sm"
        >
          <span className={cn(department.icon, "text-primary text-5xl")} />
          <h3 className="mt-4 text-lg font-semibold">
            {i18n._(department.title)}
          </h3>
          <p className="text-base-content/70 mt-2 text-base leading-relaxed">
            {i18n._(department.description)}
          </p>
        </div>
      ))}
    </div>
  );
}
