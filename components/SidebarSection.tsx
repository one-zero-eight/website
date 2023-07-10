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
    <div className="flex flex-row justify-center p-2 select-none">
      <props.icon
        className={`place-self-start mr-4 ${
          props.selected
            ? "fill-focus_color"
            : props.path === "#"
            ? "fill-disabled"
            : "fill-inactive"
        }`}
      />
      <p
        className={`flex grow font-semibold text-lg items-center w-min ${
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
    return <Tooltip tip="Coming soon">{element}</Tooltip>;
  }

  return <Link href={props.path}>{element}</Link>;
}

export default SidebarSection;
