import Tooltip from "@/components/Tooltip";
import Link from "next/link";

export type SectionProps = {
  icon: (props: { className?: string; fill?: string }) => React.JSX.Element;
  path: string;
  title: string;
  selected: boolean;
};

function SidebarSection(props: SectionProps) {
  const link = (
    <Link
      href={props.path}
      className={props.path === "#" ? "pointer-events-none" : ""}
    >
      <div className="flex flex-row justify-center p-2">
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
          className={`flex grow font-semibold text-lg items-center w-min 
              ${
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
    </Link>
  );
  if (props.path !== "#") {
    return link;
  }

  return <Tooltip tip={"Coming soon"}>{link}</Tooltip>;
}

export default SidebarSection;
