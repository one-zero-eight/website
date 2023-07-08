import CategoryContainer from "@/components/CategoryContainer";
import ClarificationContainer from "@/components/ClarificationContainer";
import { Metadata } from "next";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Schedule",
};

export default function Page() {
  return (
    <main className="p-16">
      <h1 className="lg:hidden lg:invisible text-3xl text-center lg:text-left xl:text-4xl font-bold">
        InNoHassle ecosystem
      </h1>
      <p className="lg:hidden lg:invisible text-text-secondary/75 text-center text-base py-2 xl:text-lg lg:text-left">
        Services developed by{" "}
        <a href="https://t.me/one_zero_eight" className="text-text-main">
          one-zero-eight community
        </a>{" "}
        for Innopolis students.
      </p>
      <Navbar className="hidden invisible lg:flex lg:visible">
        <h1 className="text-text-main text-3xl text-center lg:text-left xl:text-4xl font-bold">
          InNoHassle ecosystem
        </h1>
        <p className="text-text-secondary/75 text-center text-base py-2 xl:text-lg lg:text-left">
          Services developed by{" "}
          <a href="https://t.me/one_zero_eight" className="text-text">
            one-zero-eight community
          </a>{" "}
          for Innopolis students.
        </p>
      </Navbar>
      <h2 className="text-text text-3xl xl:text-4xl font-medium mt-8 text-center">
        Choose the category
      </h2>
      <CategoryContainer />
      <h3 className="text-text text-3xl font-medium text-center lg:text-left mt-8">
        How it works?
      </h3>
      <ClarificationContainer />
      <hr className="border-white/25 my-8 md:w-1/2 w-full" />
      <p className="text-base lg:text-lg text-text-secondary/75">
        Our projects are open source!{" "}
        <a href="https://github.com/one-zero-eight" className="text-text">
          github/one-zero-eight
        </a>
      </p>
    </main>
  );
}
