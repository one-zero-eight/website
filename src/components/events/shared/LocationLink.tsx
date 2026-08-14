import { SchemaResolvedLocation } from "@/api/workshops/types";
import { cn } from "@/lib/ui/cn";
import { Link } from "@tanstack/react-router";
import { locationDisplayName, locationMapsSearch } from "../utils/location";

export function LocationLink({
  location,
  className,
}: {
  location?: SchemaResolvedLocation | null;
  className?: string;
}) {
  const label = locationDisplayName(location);
  const search = locationMapsSearch(location);

  if (!search) {
    return <span className={className}>{label}</span>;
  }

  return (
    <Link
      to="/maps"
      search={search}
      className={cn("underline underline-offset-2", className)}
    >
      {label}
    </Link>
  );
}
