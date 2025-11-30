import React from "react";
import { Link } from "@tanstack/react-router";
import Tooltip from "@/components/common/Tooltip.tsx";

function AboutPageButton() {
  return (
    <Tooltip content="About us">
      <Link
        to="/about"
        className="hover:bg-inh-secondary flex items-center justify-center rounded-xl p-2 transition-colors"
      >
        <span className="icon-[material-symbols--info-outline-rounded] text-3xl text-[#807e7e]" />
      </Link>
    </Tooltip>
  );
}

export default AboutPageButton;
