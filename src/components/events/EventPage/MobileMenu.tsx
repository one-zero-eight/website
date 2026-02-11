import { SchemaWorkshop } from "@/api/workshops/types";
import { CheckInButton } from "../CheckInButton";

export interface MobileMenuProps {
  event: SchemaWorkshop;
  myCheckins?: SchemaWorkshop[];
}

export default function MobileMenu({ event, myCheckins }: MobileMenuProps) {
  return (
    <div className="bg-base-200 border-base-300 fixed bottom-12 flex w-full items-center justify-center rounded-t-lg border-b p-4 md:hidden">
      <CheckInButton
        event={event}
        myCheckins={myCheckins}
        className="min-w-full [&>div]:justify-center"
      />
    </div>
  );
}
