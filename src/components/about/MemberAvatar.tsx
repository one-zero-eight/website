import { useState } from "react";
import { type TeamMember } from "./hooks/useTeamMembers";

export const getInitials = (fullName: string) => {
  const words = fullName.split(" ");
  if (words.length >= 2) {
    return words[0].charAt(0).toUpperCase() + words[1].charAt(0).toUpperCase();
  }
  return fullName.charAt(0).toUpperCase();
};

export const getRandomColor = (name: string) => {
  const colors = [
    "bg-red-500",
    "bg-blue-500",
    "bg-green-500",
    "bg-yellow-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-indigo-500",
    "bg-teal-500",
    "bg-orange-500",
    "bg-cyan-500",
    "bg-lime-500",
    "bg-emerald-500",
    "bg-violet-500",
    "bg-fuchsia-500",
    "bg-rose-500",
    "bg-sky-500",
  ];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
};

export const MemberAvatar = ({
  member,
  className = "h-10 w-10",
}: {
  member: TeamMember;
  className?: string;
}) => {
  const [imageError, setImageError] = useState(false);

  if (member.avatar && !imageError) {
    return (
      <img
        src={member.avatar}
        alt={member.fullName}
        className={`${className} rounded-full object-cover`}
        onError={() => setImageError(true)}
        loading="lazy"
      />
    );
  }

  return (
    <div
      className={`flex ${className} items-center justify-center rounded-full text-white ${getRandomColor(member.fullName)}`}
    >
      <span className="text-xs font-semibold">
        {getInitials(member.fullName)}
      </span>
    </div>
  );
};
