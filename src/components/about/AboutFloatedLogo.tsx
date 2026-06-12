import Logo from "@/components/icons/Logo.tsx";
import { Link } from "@tanstack/react-router";

export function AboutFloatedLogo() {
  return (
    <Link
      to="/"
      className="mr-4 mb-2 flex justify-center transition-transform hover:scale-105 sm:float-left md:mr-6"
    >
      <Logo className="size-54" />
    </Link>
  );
}
