import React from "react";
import { Link } from "@tanstack/react-router";
import Tooltip from "@/components/common/Tooltip.tsx";

function AboutPageButton() {
  return (
    <Tooltip content="About us">
      <Link
        to="/about"
        className="hover:bg-base-300 flex items-center justify-center rounded-xl p-2 transition-colors"
      >
        <span className="icon-[material-symbols--info-outline-rounded] text-base-content/70 text-2xl" />
      </Link>
    </Tooltip>
  );
}

export default AboutPageButton;
