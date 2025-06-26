import React from "react";

type WorkshopTextAreaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const WorkshopTextArea: React.FC<WorkshopTextAreaProps> = ({
  className,
  ...props
}) => {
  return (
    <textarea
      className={`font-inherit my-2 max-h-[200px] min-h-[120px] w-full resize-none overflow-y-auto rounded-lg border border-gray-300/30 bg-gray-200/10 px-[15px] py-[10px] text-sm text-white outline-none transition-all duration-300 ease-in-out placeholder:text-gray-400 focus:border-violet-500/60 focus:shadow-[0_0_5px_rgba(139,92,246,0.3)] ${className || ""}`}
      {...props}
    />
  );
};

export default WorkshopTextArea;
