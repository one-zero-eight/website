import React from "react";
type WorkshopInputProps = React.InputHTMLAttributes<HTMLInputElement>;

const WorkshopInput: React.FC<WorkshopInputProps> = (props) => {
  return (
    <input
      className="w-full px-4 py-2.5 my-2 border border-white/30 rounded-lg bg-white/10 text-white text-sm outline-none transition-all duration-300 focus:border-violet-400/60 focus:shadow-[0_0_5px_rgba(122,122,210,0.3)]"
      {...props}
    />
  );
};

export default WorkshopInput;
