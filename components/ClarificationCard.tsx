import React from "react";

export type ClarificationProps = {
  icon: ((props: { className?: string; fill?: string }) => React.JSX.Element)[];
  title: string;
  shortDescription: string;
};

export default function ClarificationCard(props: ClarificationProps) {
  return (
    <div className="w-max-125 my-3 flex flex-col items-center justify-between rounded-3xl bg-primary-main px-4 py-8 text-center">
      <div className="flex flex-row items-center justify-between">
        {props.icon.map((Icon, i) => (
          <Icon key={i} fill={`#9747FF`} />
        ))}
      </div>
      <p className="text-text py-2 text-lg font-medium xl:text-xl">
        {props.title}
      </p>
      <p className="text-sm text-text-secondary/75">{props.shortDescription}</p>
    </div>
  );
}
