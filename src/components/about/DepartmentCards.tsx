import { cn } from "@/lib/ui/cn";
import { departments } from "./aboutConstants.ts";

export function DepartmentCards() {
  return (
    <div className="clear-both my-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
      {departments.map((department) => (
        <div
          key={department.title}
          className="bg-base-200 flex flex-col items-center rounded-lg px-4 py-8 text-center shadow-sm"
        >
          <span className={cn(department.icon, "text-primary text-5xl")} />
          <h3 className="mt-4 text-lg font-semibold">{department.title}</h3>
          <p className="text-base-content/70 mt-2 text-base leading-relaxed">
            {department.description}
          </p>
        </div>
      ))}
    </div>
  );
}
