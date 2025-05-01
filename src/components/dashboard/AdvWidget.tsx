import Logo108 from "@/components/icons/Logo108.tsx";

export function AdvWidget() {
  return null;

  return (
    <div
      className="flex flex-row gap-4 rounded-2xl border border-transparent bg-primary px-4 py-4"
      style={{
        backgroundImage:
          "linear-gradient(rgba(var(--color-primary) / var(--tw-bg-opacity)), rgba(var(--color-primary) / var(--tw-bg-opacity))), linear-gradient(45deg, rgb(var(--color-brand-gradient-start)), rgb(var(--color-brand-gradient-end)))",
        backgroundOrigin: "border-box",
        backgroundClip: "padding-box, border-box",
      }}
    >
      <div className="hidden h-fit w-12 shrink-0 sm:block">
        <Logo108 className="mt-2" />
      </div>
      <div className="flex flex-col">
        <div className="text-violet flex text-lg font-semibold">
          <div className="w-8 shrink-0 sm:hidden">
            <Logo108 className="mr-2 mt-2" />
          </div>
          <span className="selected">Contest by one-zero-eight</span>
        </div>
        <div className="font-semibold text-contrast/75">
          Design the merch and win the prize!
        </div>
        <a
          href="https://contest.innohassle.ru"
          target="_blank"
          className="w-fit text-contrast/75 hover:underline"
        >
          Website:{" "}
          <span className="text-brand-violet">contest.innohassle.ru</span>
          <span className="icon-[material-symbols--open-in-new-rounded] ml-1 text-xs" />
        </a>
        <a
          href="https://t.me/one_zero_eight_contest"
          target="_blank"
          className="w-fit text-contrast/75 hover:underline"
        >
          Chat:{" "}
          <span className="text-brand-violet">@one_zero_eight_contest</span>
          <span className="icon-[material-symbols--open-in-new-rounded] ml-1 text-xs" />
        </a>
      </div>
    </div>
  );
}
