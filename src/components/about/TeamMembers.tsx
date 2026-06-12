import { useMemo, useState } from "react";
import clsx from "clsx";
import { useTeamMembers, type TeamMember } from "./hooks/useTeamMembers";
import { MemberAvatar } from "./cards/MemberAvatar.tsx";

const leaderRowOrder = [
  "Artem Bulgakov",
  "Ruslan Bel'kov",
  "Anna Belyakova",
  "Alexandr Zolotarev",
  "Vladislav Konovalov",
];

const leaderRoles: Record<string, string> = {
  "Anna Belyakova": "leader",
  "Artem Bulgakov": "Founder",
  "Ruslan Bel'kov": "Founder",
  "Alexandr Zolotarev": "tech leader",
  "Vladislav Konovalov": "tech leader",
};

const mainLeaderName = Object.entries(leaderRoles).find(
  ([, role]) => role === "leader",
)?.[0];

const otherLeaderRowOrder = leaderRowOrder.filter(
  (name) => name !== mainLeaderName,
);

const membersLayoutClass =
  "w-full [--member-cols:4] [--member-gap:0.5rem] sm:[--member-cols:5] sm:[--member-gap:0.75rem] md:[--member-cols:6] lg:[--member-cols:7]";

const memberRowClass =
  "flex w-full flex-wrap justify-center gap-[var(--member-gap)]";

const memberCardClass =
  "h-[110px] w-[calc((100%-(var(--member-cols)-1)*var(--member-gap))/var(--member-cols))] shrink-0 sm:h-[120px]";

const safeDecode = (str: string | undefined): string => {
  if (!str) return "";
  try {
    const binaryStr = atob(str);
    const bytes = Uint8Array.from(binaryStr, (c) => c.charCodeAt(0));
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return str;
  }
};

function TeamMemberCard({
  member,
  animationDelay,
  isHovered,
  onMouseEnter,
  onMouseLeave,
}: {
  member: TeamMember;
  animationDelay: number;
  isHovered: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const isMainLeader = leaderRoles[member.fullName] === "leader";

  return (
    <div
      className={clsx(
        "animate-in slide-in-from-bottom-4 relative min-w-0",
        memberCardClass,
      )}
      style={{
        zIndex: isHovered ? 50 : 1,
        transition: `z-index 0s linear ${isHovered ? "0s" : "0.3s"}`,
        animationDelay: `${animationDelay}ms`,
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div
        className={clsx(
          "bg-base-200 absolute top-0 left-0 flex min-h-full w-full flex-col items-center justify-center rounded-lg border-2 shadow-sm transition-all duration-300 ease-in-out",
          isHovered
            ? "border-primary py-4 shadow-xl"
            : isMainLeader
              ? "border-primary"
              : "border-transparent",
        )}
      >
        <div className="flex w-full flex-col items-center justify-center">
          <div
            className={clsx(
              "mb-2 transition-all duration-300",
              isHovered && "scale-110",
            )}
          >
            <MemberAvatar member={member} />
          </div>
          <div className="px-1 text-center">
            <h3
              className={clsx(
                "line-clamp-2 font-medium transition-all duration-300",
                isHovered ? "text-sm" : "text-xs",
              )}
            >
              {member.fullName}
            </h3>
            {leaderRoles[member.fullName] && (
              <span className="text-primary animate-in fade-in zoom-in slide-in-from-top-1 block text-[10px] font-semibold tracking-wider uppercase duration-300">
                {leaderRoles[member.fullName]}
              </span>
            )}
          </div>
        </div>

        <div
          className={clsx(
            "grid w-full px-2 transition-all duration-500 ease-in-out",
            isHovered
              ? "mt-3 grid-rows-[1fr] opacity-100"
              : "mt-0 grid-rows-[0fr] opacity-0",
          )}
        >
          <div className="overflow-hidden">
            <div className="flex justify-center gap-2">
              {member.github && (
                <a
                  href={`https://github.com/${safeDecode(member.github)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group hover:bg-base-100/50 flex items-center justify-center rounded-md p-1.5 transition-colors"
                  title={`GitHub: @${safeDecode(member.github)}`}
                >
                  <span className="icon-[mdi--github] text-xl text-gray-600 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-gray-100" />
                </a>
              )}

              {member.telegram && (
                <a
                  href={`https://t.me/${safeDecode(member.telegram)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group hover:bg-base-100/50 flex items-center justify-center rounded-md p-1.5 transition-colors"
                  title={`Telegram: @${safeDecode(member.telegram)}`}
                >
                  <span className="icon-[mdi--telegram] text-xl text-blue-500 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TeamMembers() {
  const {
    data: teamMembers,
    isLoading: isLoadingMembers,
    error: membersError,
  } = useTeamMembers();

  const { leaderRowMembers, mainLeader, otherLeaders, otherMembers } =
    useMemo(() => {
      if (!teamMembers) {
        return {
          leaderRowMembers: [],
          mainLeader: null,
          otherLeaders: [],
          otherMembers: [],
        };
      }

      const leaderRowMembers = leaderRowOrder
        .map((name) => teamMembers.find((member) => member.fullName === name))
        .filter((member): member is TeamMember => member != null);

      const mainLeader =
        leaderRowMembers.find((member) => member.fullName === mainLeaderName) ??
        null;

      const otherLeaders = otherLeaderRowOrder
        .map((name) => teamMembers.find((member) => member.fullName === name))
        .filter((member): member is TeamMember => member != null);

      const nonLeaderMembers = teamMembers.filter(
        (member) => !leaderRowOrder.includes(member.fullName),
      );

      const shuffled = [...nonLeaderMembers];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      return {
        leaderRowMembers,
        mainLeader,
        otherLeaders,
        otherMembers: shuffled,
      };
    }, [teamMembers]);

  const [hoveredMemberName, setHoveredMemberName] = useState<string | null>(
    null,
  );

  if (isLoadingMembers) {
    return (
      <div className="mt-8 rounded-lg bg-gray-100 p-4 dark:bg-gray-800">
        <div className="flex items-center gap-4">
          <div className="flex animate-pulse gap-4">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-12 w-12 rounded-full bg-gray-300 dark:bg-gray-600"
              ></div>
            ))}
          </div>
          <span className="text-gray-500 dark:text-gray-400">Loading...</span>
        </div>
      </div>
    );
  }

  if (membersError) {
    return (
      <div className="mt-8 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
        <p className="text-red-600 dark:text-red-400">
          Unable to load team members. Please try again later.
        </p>
      </div>
    );
  }

  if (leaderRowMembers.length === 0 && otherMembers.length === 0) {
    return (
      <div className="mt-8 rounded-lg bg-gray-100 p-4 dark:bg-gray-800">
        <p className="text-gray-500 dark:text-gray-400">
          No team members found.
        </p>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        "relative clear-both mt-8 mb-8 w-full overflow-visible",
        membersLayoutClass,
      )}
    >
      <div className="flex w-full flex-col gap-3 sm:gap-4">
        {leaderRowMembers.length > 0 && (
          <>
            {mainLeader && (
              <div className={clsx(memberRowClass, "sm:hidden")}>
                <TeamMemberCard
                  key={mainLeader.fullName}
                  member={mainLeader}
                  animationDelay={100}
                  isHovered={hoveredMemberName === mainLeader.fullName}
                  onMouseEnter={() => setHoveredMemberName(mainLeader.fullName)}
                  onMouseLeave={() => setHoveredMemberName(null)}
                />
              </div>
            )}

            {otherLeaders.length > 0 && (
              <div className={clsx(memberRowClass, "sm:hidden")}>
                {otherLeaders.map((member, index) => (
                  <TeamMemberCard
                    key={member.fullName}
                    member={member}
                    animationDelay={150 + index * 50}
                    isHovered={hoveredMemberName === member.fullName}
                    onMouseEnter={() => setHoveredMemberName(member.fullName)}
                    onMouseLeave={() => setHoveredMemberName(null)}
                  />
                ))}
              </div>
            )}

            <div className={clsx(memberRowClass, "hidden sm:flex")}>
              {leaderRowMembers.map((member, index) => (
                <TeamMemberCard
                  key={member.fullName}
                  member={member}
                  animationDelay={100 + index * 50}
                  isHovered={hoveredMemberName === member.fullName}
                  onMouseEnter={() => setHoveredMemberName(member.fullName)}
                  onMouseLeave={() => setHoveredMemberName(null)}
                />
              ))}
            </div>
          </>
        )}

        {otherMembers.length > 0 && (
          <div className={memberRowClass}>
            {otherMembers.map((member, index) => (
              <TeamMemberCard
                key={member.fullName}
                member={member}
                animationDelay={100 + (leaderRowMembers.length + index) * 50}
                isHovered={hoveredMemberName === member.fullName}
                onMouseEnter={() => setHoveredMemberName(member.fullName)}
                onMouseLeave={() => setHoveredMemberName(null)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
