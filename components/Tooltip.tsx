import { Popover, Transition } from "@headlessui/react";
import React, { useState } from "react";

export default function Tooltip({
  children,
  tip,
}: {
  children: React.ReactNode;
  tip: React.ReactNode;
}) {
  const [show, setShow] = useState(false);

  if (tip === undefined) {
    return <>{children}</>;
  }

  return (
    <Popover className="relative appearance-none">
      <div
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      >
        {children}
      </div>

      <Transition
        className="absolute z-10"
        show={show}
        onMouseEnter={() => setShow(false)}
        onMouseLeave={() => setShow(false)}
        enter="transition duration-150 ease-out "
        enterFrom="transform scale-95 opacity-0 "
        enterTo="transform scale-100 opacity-100"
        leave="transition duration-75 ease-out"
        leaveFrom="transform scale-100 opacity-100"
        leaveTo="transform scale-95 opacity-0"
      >
        <Popover.Panel className="flex justify-center items-center bg-primary-main text-text-main text-sm w-max px-8 py-2 rounded-md pointer-events-none drop-shadow-md">
          {tip}
        </Popover.Panel>
      </Transition>
    </Popover>
  );
}
