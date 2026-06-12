import OneZeroEight from "../icons/one-zero-eight.svg?raw";

export function AboutInlineLogo108() {
  return (
    <span
      className="[&_svg]:inline [&_svg]:h-[1.1rem] [&_svg]:overflow-visible [&_svg]:align-[-0.15rem]"
      dangerouslySetInnerHTML={{ __html: OneZeroEight }}
    ></span>
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
      <AboutInlineLogo108 />
      {after ? `\u00a0${after}` : null}
    </span>
  );
}
