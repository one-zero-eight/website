import Tooltip from "@/components/Tooltip";
import Link from "next/link";

export type SectionProps = {
  icon: React.ReactNode;
  path: string;
  title: string;
  selected: boolean;
  onClick: () => void;
};

function SidebarSection(props: SectionProps) {
  const element = (
    <div
      className={`flex select-none flex-row justify-center gap-4 p-2 ${
        props.selected
          ? "text-focus_color "
          : props.path === "#"
          ? "text-disabled"
          : "text-inactive"
      }`}
    >
      {props.icon}
      <p
        className={`flex w-min grow items-center text-lg font-semibold ${
          props.selected
            ? "selected"
            : props.path === "#"
            ? "text-disabled"
            : "text-inactive"
        }`}
      >
        {props.title}
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
    <Link href={props.path} onClick={props.onClick}>
      {element}
    </Link>
  );
}

export default SidebarSection;
