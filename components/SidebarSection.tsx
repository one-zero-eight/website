import Tooltip from "@/components/Tooltip";
import Link from "next/link";

export type SectionProps = {
  icon: (props: { className?: string; fill?: string }) => React.JSX.Element;
  path: string;
  title: string;
  selected: boolean;
};

function SidebarSection(props: SectionProps) {
  const element = (
    <div className="flex select-none flex-row justify-center p-2">
      <props.icon
        className={`mr-4 place-self-start ${
          props.selected
            ? "fill-focus_color"
            : props.path === "#"
            ? "fill-disabled"
            : "fill-inactive"
        }`}
      />
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

  return <Link href={props.path}>{element}</Link>;
}

export default SidebarSection;
