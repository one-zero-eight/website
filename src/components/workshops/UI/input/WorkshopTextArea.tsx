import React from "react";

type WorkshopTextAreaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const WorkshopTextArea: React.FC<WorkshopTextAreaProps> = ({ className, ...props }) => {
  return (
    <textarea
      className={`w-full min-h-[120px] max-h-[200px] px-[15px] py-[10px] my-2 border border-gray-300/30 rounded-lg bg-gray-200/10 text-white text-sm font-inherit resize-none overflow-y-auto transition-all duration-300 ease-in-out outline-none focus:border-violet-500/60 focus:shadow-[0_0_5px_rgba(139,92,246,0.3)] placeholder:text-gray-400 ${className || ""}`}
      {...props}
    />
  );
};

export default WorkshopTextArea;
