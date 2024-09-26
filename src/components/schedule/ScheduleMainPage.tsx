import { CategoryContainer } from "@/components/schedule/CategoryContainer.tsx";
import { ClarificationContainer } from "@/components/schedule/ClarificationContainer.tsx";
import { DashboardButton } from "@/components/schedule/DashboardButton.tsx";

export function ScheduleMainPage() {
  return (
    <>
      <h2 className="my-4 text-center text-3xl font-medium">
        Choose the category
      </h2>
      <div className="my-4 flex justify-center">
        <DashboardButton />
      </div>
      <CategoryContainer />
      <h3 className="my-4 text-center text-3xl font-medium">How it works?</h3>
      <ClarificationContainer />
      <hr className="my-4 w-full border-border @3xl/content:w-1/2" />
      <p className="text-lg text-text-secondary/75">
        Our projects are open source!{" "}
        <a href="https://github.com/one-zero-eight">github/one-zero-eight</a>
      </p>
    </>
  );
}
