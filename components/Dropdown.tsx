import { Popover } from "@headlessui/react";
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

      <Popover.Panel className="absolute z-10 rounded-3xl ease-in-out">
        <div className="flex flex-col justify-center inline-block items-center bg-background rounded-3xl divide-y divide-border">
          {props.children}
        </div>
      </Popover.Panel>
    </Popover>
  );
}
