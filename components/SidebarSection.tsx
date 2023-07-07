import { Popover, Transition } from "@headlessui/react";
import Link from "next/link";
import { useState } from "react";

export type SectionProps = {
  icon: (props: { className?: string; fill?: string }) => React.JSX.Element;
  path: string;
  title: string;
  selected: boolean;
};

function SidebarSection(props: SectionProps) {
  const [isShowing, setIsShowing] = useState(false);

  const link = (
    <Link
      href={props.path}
      className={props.path === "#" ? "pointer-events-none" : ""}
    >
      <div className="flex flex-row justify-center p-2">
        <props.icon
          className="place-self-start mr-4"
          fill={`${
            props.selected
              ? "#9A2EFF"
              : props.path === "#"
              ? "#2b2b2b"
              : "#414141"
          }`}
        />
        <p
          className={`flex grow font-semibold text-lg items-center w-min 
              ${
                props.selected
                  ? "selected"
                  : props.path === "#"
                  ? "text-[#2b2b2b]"
                  : "text-inactive"
              }`}
        >
          {props.title}
        </p>
      </div>
    </Link>
  );
  if (props.path !== "#") {
    return link;
  }

  return (
    <Popover className="relative appearance-none">
      <div
        onFocus={() => setIsShowing(true)}
        onBlur={() => setIsShowing(false)}
        onMouseEnter={() => setIsShowing(true)}
        onMouseLeave={() => setIsShowing(false)}
      >
        {link}
      </div>

      <Transition
        className="absolute z-10"
        show={isShowing && !props.selected}
        onMouseEnter={() => setIsShowing(false)}
        onMouseLeave={() => setIsShowing(false)}
        enter="transition duration-150 ease-out "
        enterFrom="transform scale-95 opacity-0 "
        enterTo="transform scale-100 opacity-100"
        leave="transition duration-75 ease-out"
        leaveFrom="transform scale-100 opacity-100"
        leaveTo="transform scale-95 opacity-0"
      >
        <Popover.Panel>
          <p className="flex justify-center items-center bg-background_dark text-white text-sm w-max px-8 py-2 rounded-md pointer-events-none">
            Coming soon
          </p>
        </Popover.Panel>
      </Transition>
    </Popover>
  );
}

export default SidebarSection;
