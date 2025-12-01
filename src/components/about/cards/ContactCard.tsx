import { TeamMember } from "../hooks/useTeamMembers.ts";
import { MemberAvatar } from "./MemberAvatar.tsx";

interface ContactCardProps {
  member: TeamMember;
  title: string;
  className?: string;
}

export function ContactCard({
  member,
  title,
  className = "",
}: ContactCardProps) {
  return (
    <div
      className={`animate-in zoom-in-50 relative h-[130px] w-[130px] transition-transform duration-500 hover:scale-105 ${className}`}
    >
      <div className="dark:bg-base-200 dark:border-primary border-primary absolute top-0 left-0 flex min-h-full w-full flex-col items-center justify-center rounded-lg border-2 bg-white py-3 shadow-xl transition-all duration-300 ease-in-out dark:border">
        <div className="flex w-full flex-col items-center justify-center">
          <div className="mb-1 scale-110 transition-all duration-300">
            <MemberAvatar member={member} className="h-10 w-10" />
          </div>
          <div className="px-1 text-center">
            <span className="mb-0.5 block text-[12px] font-semibold text-gray-500 uppercase dark:text-gray-400">
              {title}
            </span>
            <h3 className="line-clamp-2 text-base font-medium text-gray-900 transition-all duration-300 dark:text-gray-100">
              {member.fullName}
            </h3>
          </div>
        </div>

        <div className="mt-2 grid w-full grid-rows-[1fr] px-2 opacity-100 transition-all duration-500 ease-in-out">
          <div className="overflow-hidden">
            <div className="flex justify-center gap-2">
              {member.github && (
                <a
                  href={`https://github.com/${member.github}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-center rounded-md p-1 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                  title={`GitHub: @${member.github}`}
                >
                  <span className="icon-[mdi--github] text-2xl text-gray-600 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-gray-100" />
                </a>
              )}

              {member.telegram && (
                <a
                  href={`https://t.me/${member.telegram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-center rounded-md p-1 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                  title={`Telegram: @${member.telegram}`}
                >
                  <span className="icon-[mdi--telegram] text-2xl text-blue-500 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
