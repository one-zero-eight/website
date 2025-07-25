import React from "react";
import { Dumbbell, Settings } from "lucide-react";

interface SideActionsPanelProps {
  isStudent: boolean;
  isAdmin: boolean;
}

const SideActionsPanel: React.FC<SideActionsPanelProps> = ({
  isStudent,
  isAdmin,
}) => (
  <div className="fixed right-8 top-32 z-40 hidden flex-col gap-4 lg:flex">
    {isStudent && (
      <a
        href="/fitness-test"
        className="flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-contrast shadow transition-colors hover:bg-secondary-hover"
      >
        <Dumbbell size={18} />
        <span>Fitness Test</span>
      </a>
    )}
    {isAdmin && (
      <a
        href="http://t9d.store/admin/"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-contrast shadow transition-colors hover:bg-secondary-hover"
      >
        <Settings size={18} />
        <span>Admin Panel</span>
      </a>
    )}
  </div>
);

export default SideActionsPanel;
