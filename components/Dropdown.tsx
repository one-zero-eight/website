import { Popover } from "@headlessui/react";
import React from "react";
import DropdownButton from "@/components/DropdownButton";

type DropdownProps = {
  optionInfo: string;
  children: React.ReactNode;
};

export function Dropdown(props: DropdownProps) {
  return (
    <Popover className="relative sm:text-2xl w-fit rounded-xl">
      <DropdownButton title={props.optionInfo || ""} default={true} />

      <Popover.Panel className="absolute z-10">
        <div className="flex flex-col justify-center inline-block items-center bg-background rounded-xl">
          {props.children}
        </div>
      </Popover.Panel>
    </Popover>
  );
}
