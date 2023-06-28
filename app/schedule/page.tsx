import CategoryContainer from "@/components/CategoryContainer";
import ClarificationContainer from "@/components/ClarificationContainer";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Schedule",
};

export default function Page() {
  return (
    <main className="p-12 sm:p-16">
      <h1 className="text-3xl text-center lg:text-left xl:text-4xl font-bold">
        InNoHassle ecosystem
      </h1>
      <p className="text-white/75 text-center text-base py-2 xl:text-lg lg:text-left">
        Services developed by{" "}
        <a href="https://t.me/one_zero_eight" className="text-white">
          one-zero-eight community
        </a>{" "}
        for Innopolis students.
      </p>
      <h2 className="text-3xl xl:text-4xl font-medium mt-8 text-center">
        Choose the category
      </h2>
      <CategoryContainer />
      <h3 className="text-3xl font-medium text-center lg:text-left mt-8">
        How it works?
      </h3>
      <ClarificationContainer />
      <hr className="border-white/25 my-8 md:w-1/2 w-full" />
      <p className="text-base lg:text-lg text-white/75">
        Our projects are open source!{" "}
        <a href="https://github.com/one-zero-eight" className="text-white">
          github/one-zero-eight
        </a>
      </p>
    </main>
  );
}
