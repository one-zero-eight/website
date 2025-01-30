import { Link } from "@tanstack/react-router";
import clsx from "clsx";

export type SectionProps = {
  icon: React.ReactNode;
  path: string;
  title: string;
  badge?: React.ReactNode;
  selected: boolean;
  onClick: () => void;
  external?: boolean;
  isMinimized: boolean;
};

function SidebarSection(props: SectionProps) {
  const element = (
    <div
      className={clsx(
        "flex select-none flex-row justify-center rounded-xl py-1 hover:bg-gray-500/10",
        !props.isMinimized ? "px-2 text-4xl" : "px-1 text-3xl",
        props.selected ? "text-brand-violet" : "text-inactive",
      )}
    >
      {props.icon}
      {!props.isMinimized && (
        <>
          <p
            className={clsx(
              "ml-4",
              "flex w-fit items-center whitespace-nowrap text-lg font-semibold",
              props.selected ? "selected" : "text-inactive",
            )}
          >
            {props.title}
          </p>
          <div className="flex w-min grow items-center">
            {props.external && (
              <span className="icon-[material-symbols--open-in-new-rounded] ml-1 text-base" />
            )}
            {props.badge}
          </div>
        </>
      )}
    </div>
  );

  return (
    <Link to={props.path} onClick={props.onClick} className="w-full">
      {element}
    </Link>
  );
}

export default SidebarSection;
