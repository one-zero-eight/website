import React from "react";
type WorkshopInputProps = React.InputHTMLAttributes<HTMLInputElement>;

const WorkshopInput: React.FC<WorkshopInputProps> = (props) => {
  return (
    <input
      className="my-2 w-full rounded-lg border border-white/30 bg-white/10 px-4 py-2.5 text-sm text-white outline-none transition-all duration-300 focus:border-violet-400/60 focus:shadow-[0_0_5px_rgba(122,122,210,0.3)]"
      {...props}
    />
  );
};

export default WorkshopInput;
