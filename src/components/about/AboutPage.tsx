// referred to @evermake: https://github.com/evermake/108-website/blob/main/src/pages/about.vue
import { CarouselImage } from "./CarouselImage.tsx";
import AboutContent from "./about.mdx";

export function AboutPage() {
  return (
    <div className="relative grow">
      <div className="absolute inset-0 z-[-1] h-full w-full bg-[url(/108-bg-pattern-black.svg)] mask-[radial-gradient(closest-side,rgba(0,0,0,0.4)_0%,rgba(0,0,0,0)_100%)] bg-repeat mask-size-[100%_600px] mask-position-[0_-350px] mask-no-repeat md:mask-size-[100%_500px] md:mask-[100px_-250px] dark:bg-[url(/108-bg-pattern-white.svg)]" />

      <div className="relative z-10 mx-auto max-w-4xl px-6 py-12">
        <h1 className="mb-12 text-start text-3xl font-bold text-black sm:mb-16 sm:text-4xl md:text-5xl dark:text-white">
          Welcome to <br />
          <span className="italic">one-zero-eight</span> community!
        </h1>

        <div className="space-y-10 text-start text-base leading-relaxed text-gray-700 sm:text-lg dark:text-gray-300">
          <AboutContent />
        </div>
      </div>
      <CarouselImage />
    </div>
  );
}
