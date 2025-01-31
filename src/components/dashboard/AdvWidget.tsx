import Logo108 from "@/components/icons/Logo108.tsx";

export function AdvWidget() {
  return (
    <a
      href="https://t.me/one_zero_eight"
      className="group flex flex-row gap-4 rounded-2xl border border-brand-violet bg-primary px-4 py-4"
    >
      <div className="hidden h-fit w-12 shrink-0 sm:block">
        <Logo108 className="mt-2" />
      </div>
      <div className="flex flex-col">
        <div className="text-violet selected flex text-lg font-semibold">
          <div className="w-8 shrink-0 sm:hidden">
            <Logo108 className="mr-2 mt-2" />
          </div>
          Introduction to one-zero-eight
        </div>
        <div className="text-contrast/75">Feb. 6, Thursday, 18:30</div>
        <div className="w-fit text-contrast/75 group-hover:underline">
          View event program:{" "}
          <span className="text-brand-violet">@one_zero_eight</span>
          <span className="icon-[material-symbols--open-in-new-rounded] ml-1 text-xs" />
        </div>
      </div>
    </a>
  );
}
