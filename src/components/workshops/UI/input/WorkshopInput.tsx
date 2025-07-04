import React from "react";
type WorkshopInputProps = React.InputHTMLAttributes<HTMLInputElement>;

const WorkshopInput: React.FC<WorkshopInputProps> = (props) => {
  return (
    <input
      className="my-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition-all duration-300 focus:border-violet-400 focus:shadow-[0_0_5px_rgba(122,122,210,0.3)] dark:border-white/30 dark:bg-white/10 dark:text-white dark:focus:border-violet-400/60"
      {...props}
    />
  );
};

export default WorkshopInput;
