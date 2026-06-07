import Logo108 from "@/components/icons/Logo108.tsx";

const logoWrapClass =
  "inline align-baseline [&>img]:h-[1.1em] [&>img]:w-auto [&>img]:align-[-0.15em] [&>img:first-child]:inline-block [&>img:last-child]:hidden dark:[&>img:first-child]:hidden dark:[&>img:last-child]:inline-block";

export function AboutInlineLogo108() {
  return (
    <span className={logoWrapClass}>
      <Logo108 className="h-[1.1em] w-auto" />
    </span>
  );
}

export function AboutLogoPhrase({
  before,
  after,
}: {
  before?: string;
  after?: string;
}) {
  return (
    <span className="inline-flex items-baseline whitespace-nowrap">
      {before}
      {before ? "\u00a0" : null}
      <span className={logoWrapClass}>
        <Logo108 className="h-[1.1em] w-auto" />
      </span>
      {after ? `\u00a0${after}` : null}
    </span>
  );
}
