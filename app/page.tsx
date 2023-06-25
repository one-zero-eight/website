import { Metadata } from "next";
import CategoryContainer from "@/components/CategoryContainer";

export const metadata: Metadata = {
  title: { absolute: "InNoHassle ecosystem" },
};

export default async function Page() {
  return (
    <main className="p-4 sm:p-16">
      <h1 className="text-4xl font-bold">InNoHassle ecosystem</h1>
      <p className="text-white/75">
        Services developed by{" "}
        <a href="https://t.me/one_zero_eight" className="text-white">
          one-zero-eight community
        </a>{" "}
        for Innopolis students.
      </p>
      <h2 className="text-4xl font-medium mt-8 text-center">Choose the category</h2>
      <CategoryContainer/>
      <h3 className="text-2xl font-bold mt-8">Find your schedule</h3>
      <p className="text-white/75">Firstly, choose a category.</p>
      <hr className="border-white/25 my-8 md:w-1/2 w-full" />
      <p className="text-white/75">
        Our projects are open source!{" "}
        <a href="https://github.com/one-zero-eight" className="text-white">
          github/one-zero-eight
        </a>
      </p>
    </main>
  );
}
