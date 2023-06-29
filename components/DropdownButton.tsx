import DropListIcon from "@/components/icons/DropListIcon";
import { Popover } from "@headlessui/react";
import React from "react";

type DropdownButtonProps = {
  key?: string;
  title: string;
  default?: boolean;
  func?: (any) => any;
};

function DropdownButton(props: DropdownButtonProps) {
  return (
    <Popover.Button
      className="rounded-xl w-full"
      key={props.key}
      value={props.key}
      onClick={props.func}
    >
      <div className="flex flex-row items-center bg-background py-4 px-5 rounded-2xl">
        <p className="mr-4 whitespace-nowrap">{props.title}</p>
        {props.default ? <DropListIcon /> : undefined}
      </div>
    </Popover.Button>
  );
}

export default DropdownButton;
