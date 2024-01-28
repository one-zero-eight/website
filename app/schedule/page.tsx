import CategoryContainer from "@/components/schedule/CategoryContainer";
import ClarificationContainer from "@/components/schedule/ClarificationContainer";
import { DashboardButton } from "@/components/schedule/DashboardButton";
import { NavbarTemplate } from "@/components/layout/Navbar";

export default function Page() {
  return (
    <main className="flex flex-col p-4 lg:p-12">
      <NavbarTemplate
        title="InNoHassle ecosystem"
        description={
          <>
            Services developed by{" "}
            <a
              href="https://t.me/one_zero_eight"
              className="selected"
              target="_blank"
              rel="noopener noreferrer"
            >
              one-zero-eight
            </a>{" "}
            community for Innopolis students.
          </>
        }
      />
      <h2 className="my-4 text-center text-3xl font-medium">
        Choose the category
      </h2>
      <div className="my-4 flex justify-center">
        <DashboardButton />
      </div>
      <CategoryContainer />
      <h3 className="my-4 text-center text-3xl font-medium">How it works?</h3>
      <ClarificationContainer />
      <hr className="my-4 w-full border-border md:w-1/2" />
      <p className="text-lg text-text-secondary/75">
        Our projects are open source!{" "}
        <a href="https://github.com/one-zero-eight">github/one-zero-eight</a>
      </p>
    </main>
  );
}
