import Tooltip from "@/components/common/Tooltip";
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
};

function SidebarSection(props: SectionProps) {
  const element = (
    <div
      className={clsx(
        "flex select-none flex-row justify-center rounded-xl px-2 py-1.5 hover:bg-gray-500/10",
        props.selected
          ? "text-focus"
          : props.path === "#"
            ? "text-disabled"
            : "text-inactive",
      )}
    >
      {props.icon}
      <p
        className={clsx(
          "ml-4",
          "flex w-fit items-center whitespace-nowrap text-lg font-semibold",
          props.selected
            ? "selected"
            : props.path === "#"
              ? "text-disabled"
              : "text-inactive",
        )}
      >
        {props.title}
      </p>
      <div className="flex w-min grow items-center">
        {props.external && (
          <span className="icon-[material-symbols--open-in-new-rounded] ml-1" />
        )}
        {props.badge}
      </div>
    </div>
  );

  if (props.path === "#") {
    return (
      <Tooltip content="Coming soon">
        <div tabIndex={0}>{element}</div>
      </Tooltip>
    );
  }

  return (
    <Link
      to={props.path}
      onClick={props.onClick}
      target={props.path.startsWith("/") ? undefined : "_blank"}
      rel={props.path.startsWith("/") ? undefined : "noopener noreferrer"}
      className="w-full"
    >
      {element}
    </Link>
  );
}

export default SidebarSection;
