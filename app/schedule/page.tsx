import CategoryContainer from "@/components/CategoryContainer";
import ClarificationContainer from "@/components/ClarificationContainer";
import { DashboardButton } from "@/components/DashboardButton";
import { Navbar } from "@/components/Navbar";
import React from "react";

export default function Page() {
  return (
    <main className="items-center px-4 py-16 lg:px-12 lg:[align-items:normal]">
      <h1 className="text-center text-3xl font-bold lg:text-left xl:text-4xl lgw-smh:invisible lgw-smh:hidden">
        InNoHassle ecosystem
      </h1>
      <p className="py-2 text-center text-base text-text-secondary/75 lg:text-left xl:text-lg lgw-smh:invisible lgw-smh:hidden">
        Services developed by{" "}
        <a href="https://t.me/one_zero_eight" className="text-text-main">
          one-zero-eight community
        </a>{" "}
        for Innopolis students.
      </p>
      <Navbar>
        <h1 className="text-center text-3xl font-bold text-text-main lg:text-left xl:text-4xl">
          InNoHassle ecosystem
        </h1>
        <p className="py-2 text-center text-base text-text-secondary/75 lg:text-left xl:text-lg">
          Services developed by{" "}
          <a href="https://t.me/one_zero_eight" className="text-text">
            one-zero-eight community
          </a>{" "}
          for Innopolis students.
        </p>
      </Navbar>
      <h2 className="text-text mt-8 text-center text-3xl font-medium xl:text-4xl">
        Choose the category
      </h2>
      <div className="flex justify-center">
        <DashboardButton />
      </div>
      <CategoryContainer />
      <h3 className="text-text mt-8 text-center text-3xl font-medium lg:text-left">
        How it works?
      </h3>
      <ClarificationContainer />
      <hr className="my-8 w-full border-white/25 md:w-1/2" />
      <p className="text-base text-text-secondary/75 lg:text-lg">
        Our projects are open source!{" "}
        <a href="https://github.com/one-zero-eight" className="text-text">
          github/one-zero-eight
        </a>
      </p>
    </main>
  );
}
