import { Topbar } from "@/components/layout/Topbar";
import { createFileRoute } from "@tanstack/react-router";
import Confetti from "react-confetti-boom";
import { Helmet } from "react-helmet-async";

export const Route = createFileRoute("/_with_menu/42")({
  component: () => (
    <>
      <Helmet>
        <title>Club Fest</title>
        <meta name="description" content="Club fest page." />
      </Helmet>
      <Topbar title="Club Fest" />
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <Confetti
          mode="boom"
          colors={["#A855F7", "#EC4899", "#F59E0B", "#22C55E"]}
          particleCount={100}
        />{" "}
        <div className="overflow-hidden rounded-2xl">
          <div className="flex flex-col p-2 sm:p-6">
            <div className="mb-3 flex w-full flex-shrink-0 flex-row items-center gap-2 sm:gap-3">
              <div className="grid h-8 w-8 min-w-[2rem] place-items-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-lg sm:h-10 sm:w-10 sm:min-w-[2.5rem] sm:text-2xl">
                🎉
              </div>

              <div className="min-w-0 grow items-center break-words text-xl font-semibold leading-tight sm:text-2xl md:text-3xl lg:text-4xl">
                Congratulations! You've Unlocked a Special Link!
              </div>
            </div>

            <div className="md:text-md mb-2 text-contrast/80 sm:text-sm lg:text-lg">
              {" "}
              Amazing discovery! You've found the exclusive Ryan Gosling
              resource link. And the correct answer is{" "}
              <span className="text-brand-violet">108</span> not 42.
            </div>

            <div className="md:text-md mb-2 text-contrast/80 sm:text-sm lg:text-lg">
              Show this screen to a member of 108 to claim your exclusive
              sticker!
            </div>

            <div className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-black/10">
              <img
                src="/tenor2.gif"
                alt="Ryan Gosling winks"
                className="block h-auto w-full"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  ),
});
