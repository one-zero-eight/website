import { SchemaWorkshop } from "@/api/workshops/types";
import { CheckInButton } from "../CheckInButton";

export interface MobileMenuProps {
  event: SchemaWorkshop;
}

export default function MobileMenu({ event }: MobileMenuProps) {
  return (
    <div className="bg-base-200 border-base-300 fixed bottom-12 w-full items-center justify-end rounded-t-lg border-b p-4 md:hidden">
      <CheckInButton event={event} className="min-w-full" />
    </div>
  );
}
