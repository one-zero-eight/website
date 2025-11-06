import { getLogoURLById } from "@/api/clubs/links.ts";
import clsx from "clsx";

export function ClubLogo({
  clubId,
  className,
}: {
  clubId: string | null;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "rounded-field bg-base-200 relative flex shrink-0 items-center justify-center overflow-hidden",
        className,
      )}
    >
      <span className="icon-[mdi--account-group] absolute size-8 text-white md:size-12" />
      <img
        src={clubId !== null ? getLogoURLById(clubId) : undefined}
        alt="Club logo"
        className="bg-base-200 absolute inset-0 size-full object-cover"
        loading="lazy"
        onError={(e) => (e.currentTarget.style.display = "none")}
      />
    </div>
  );
}
