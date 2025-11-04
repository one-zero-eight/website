import { Topbar } from "@/components/layout/Topbar";
import { createFileRoute } from "@tanstack/react-router";
import Confetti from "react-confetti-boom";
import { Helmet } from "react-helmet-async";

export const Route = createFileRoute("/_with_menu/42")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <Helmet>
        <title>Club Fest</title>
        <meta name="description" content="Club Fest page." />
      </Helmet>
      <Topbar title="Club Fest" />
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <Confetti
          mode="boom"
          colors={["#A855F7", "#EC4899", "#F59E0B", "#22C55E"]}
          particleCount={100}
        />{" "}
        <div className="rounded-box overflow-hidden">
          <div className="flex flex-col p-2 sm:p-6">
            <div className="mb-3 flex w-full shrink-0 flex-row items-center gap-2 sm:gap-3">
              <div className="grid h-8 w-8 min-w-8 place-items-center rounded-xl bg-linear-to-br from-violet-600 to-fuchsia-600 text-lg sm:h-10 sm:w-10 sm:min-w-10 sm:text-2xl">
                🎉
              </div>

              <div className="min-w-0 grow items-center text-xl leading-tight font-semibold wrap-break-word sm:text-2xl md:text-3xl lg:text-4xl">
                Congratulations! You've Unlocked a Special Link!
              </div>
            </div>

            <div className="md:text-md text-base-content/80 mb-2 sm:text-sm lg:text-lg">
              Amazing discovery! You've found the exclusive Ryan Gosling
              resource link. And the correct answer is{" "}
              <span className="text-primary">108</span>, not 42.
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
  );
}
