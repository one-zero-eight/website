import Logo from "@/components/icons/Logo.tsx";

const logoWrapClass =
  "inline [&>img]:size-54 [&>img:first-child]:inline-block [&>img:last-child]:hidden dark:[&>img:first-child]:hidden dark:[&>img:last-child]:inline-block";

export function AboutFloatedLogo() {
  return (
    <a
      href="/"
      className="float-left mr-4 mb-2 block transition-transform hover:scale-105 md:mr-6"
    >
      <span className={logoWrapClass}>
        <Logo className="size-54" />
      </span>
    </a>
  );
}
