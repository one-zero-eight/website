import React from "react";

export type ClarificationProps = {
  icon: ((props: { className?: string; fill?: string }) => React.JSX.Element)[];
  title: string;
  shortDescription: string;
};

export default function ClarificationCard(props: ClarificationProps) {
  return (
    <div className="flex flex-col justify-between items-center text-center px-4 py-8 my-3 rounded-3xl bg-primary-main w-max-125">
      <div className="flex flex-row justify-between items-center">
        {props.icon.map((Icon, i) => (
          <Icon key={i} fill={`#9747FF`} />
        ))}
      </div>
      <p className="text-lg xl:text-xl py-2 font-medium text-text">
        {props.title}
      </p>
      <p className="text-sm text-text-secondary/75">{props.shortDescription}</p>
    </div>
  );
}
