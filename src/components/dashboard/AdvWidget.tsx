export function AdvWidget() {
  return null;

  return (
    <div
      className="group flex flex-row gap-4 rounded-2xl border border-transparent bg-primary px-4 py-4"
      style={{
        backgroundImage:
          "linear-gradient(rgba(var(--color-primary) / var(--tw-bg-opacity)), rgba(var(--color-primary) / var(--tw-bg-opacity))), linear-gradient(45deg, rgb(var(--color-brand-gradient-start)), rgb(var(--color-brand-gradient-end)))",
        backgroundOrigin: "border-box",
        backgroundClip: "padding-box, border-box",
      }}
    >
      <span className="icon-[material-symbols--print-outline-rounded] hidden w-12 shrink-0 text-5xl text-brand-violet sm:block" />
      <div className="flex flex-col">
        <div className="text-violet flex text-lg font-semibold">
          <span className="icon-[material-symbols--print-outline-rounded] mr-2 shrink-0 text-3xl text-brand-violet sm:hidden" />
          <span className="selected">Inno Print Bot</span>
        </div>
        <div className="whitespace-pre-wrap text-contrast/75">
          Print & scan your documents on IU printers.
        </div>
        <a
          href="https://t.me/InnoPrintBot"
          target="_blank"
          className="w-fit text-contrast/75 hover:underline"
        >
          Telegram bot: <span className="text-brand-violet">@InnoPrintBot</span>
          <span className="icon-[material-symbols--open-in-new-rounded] ml-1 text-xs" />
        </a>
      </div>
    </div>
  );
}
