import React from 'react';
import { Dumbbell, Settings } from 'lucide-react';

interface SideActionsPanelProps {
  isStudent: boolean;
  isAdmin: boolean;
}

const SideActionsPanel: React.FC<SideActionsPanelProps> = ({ isStudent, isAdmin }) => (
  <div className="hidden lg:flex flex-col gap-4 fixed right-8 top-32 z-40">
    {isStudent && (
      <a
        href="/fitness-test"
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary hover:bg-secondary-hover text-contrast shadow transition-colors"
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
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary hover:bg-secondary-hover text-contrast shadow transition-colors"
      >
        <Settings size={18} />
        <span>Admin Panel</span>
      </a>
    )}
  </div>
);

export default SideActionsPanel;
