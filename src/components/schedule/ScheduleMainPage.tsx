import { CategoryContainer } from "@/components/schedule/CategoryContainer.tsx";
import { ClarificationContainer } from "@/components/schedule/ClarificationContainer.tsx";
import { DashboardButton } from "@/components/schedule/DashboardButton.tsx";

export function ScheduleMainPage() {
  return (
    <>
      <h2 className="py-4 text-center text-3xl font-medium">
        Choose the category
      </h2>
      <div className="flex justify-center">
        <DashboardButton />
      </div>
      <CategoryContainer />
      <h3 className="my-4 text-center text-3xl font-medium">How it works?</h3>
      <ClarificationContainer />
    </>
  );
}
