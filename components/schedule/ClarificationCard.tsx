import React from "react";

export type ClarificationProps = {
  icon: React.ReactNode;
  title: string;
  shortDescription: string;
};

export default function ClarificationCard(props: ClarificationProps) {
  return (
    <div className="w-max-125 flex flex-col items-center justify-between rounded-2xl bg-primary-main px-4 py-6 text-center">
      <div className="flex flex-row items-center justify-between text-[#9747FF]">
        {props.icon}
      </div>
      <p className="my-2 text-xl font-medium">{props.title}</p>
      <p className="text-sm text-text-secondary/75">{props.shortDescription}</p>
    </div>
  );
}
