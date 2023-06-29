import { Popover, Transition } from "@headlessui/react";
import React from "react";
import DropdownButton from "@/components/DropdownButton";

type DropdownProps = {
  optionInfo: string;
  children: React.ReactNode;
};

export function Dropdown(props: DropdownProps) {
  return (
    <Popover className="relative sm:text-2xl w-max rounded-3xl">
      <DropdownButton title={props.optionInfo || ""} default={true} />

      <Transition
        enter="transition duration-120 ease-out"
        enterFrom="transform scale-95 opacity-0"
        enterTo="transform scale-100 opacity-100"
        leave="transition duration-125 ease-out"
        leaveFrom="transform scale-100 opacity-100"
        leaveTo="transform scale-95 opacity-0"
      >
        <Popover.Panel className="absolute z-10 rounded-3xl ease-in-out bg-background ">
          <div className="flex flex-col justify-center inline-block items-center divide-y divide-border">
            {props.children}
          </div>
        </Popover.Panel>
      </Transition>
    </Popover>
  );
}
