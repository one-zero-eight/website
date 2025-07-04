import React from "react";

type WorkshopTextAreaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const WorkshopTextArea: React.FC<WorkshopTextAreaProps> = ({
  className,
  ...props
}) => {
  return (
    <textarea
      className={`font-inherit my-2 max-h-[200px] min-h-[120px] w-full resize-none overflow-y-auto rounded-lg border border-gray-300 bg-white px-[15px] py-[10px] text-sm text-gray-900 outline-none transition-all duration-300 ease-in-out placeholder:text-gray-400 focus:border-violet-400 focus:shadow-[0_0_5px_rgba(122,122,210,0.3)] dark:border-white/30 dark:bg-white/10 dark:text-white dark:focus:border-violet-400/60 ${className || ""}`}
      {...props}
    />
  );
};

export default WorkshopTextArea;
