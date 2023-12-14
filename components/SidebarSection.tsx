import Tooltip from "@/components/Tooltip";
import clsx from "clsx";
import Link from "next/link";

export type SectionProps = {
  icon: React.ReactNode;
  path: string;
  title: string;
  selected: boolean;
  onClick: () => void;
  external?: boolean;
};

function SidebarSection(props: SectionProps) {
  const element = (
    <div
      className={clsx(
        "flex select-none flex-row justify-center gap-4 rounded-2xl p-2 hover:bg-gray-500/10",
        props.selected
          ? "text-focus_color"
          : props.path === "#"
            ? "text-disabled"
            : "text-inactive",
      )}
    >
      {props.icon}
      <p
        className={clsx(
          "flex w-min grow items-center whitespace-nowrap text-lg font-semibold",
          props.selected
            ? "selected"
            : props.path === "#"
              ? "text-disabled"
              : "text-inactive",
        )}
      >
        {props.title}
        {props.external && (
          <span className="icon-[material-symbols--open-in-new-rounded] ml-1" />
        )}
      </p>
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
      href={props.path}
      onClick={props.onClick}
      target={props.path.startsWith("/") ? undefined : "_blank"}
      rel={props.path.startsWith("/") ? undefined : "noopener noreferrer"}
    >
      {element}
    </Link>
  );
}

export default SidebarSection;
