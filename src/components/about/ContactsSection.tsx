import { MemberAvatar } from "./cards/MemberAvatar.tsx";
import { useTeamMembers, type TeamMember } from "./hooks/useTeamMembers";
import { SectionHeader } from "./SectionHeader";

interface ContactCardProps {
  member: TeamMember;
  title: string;
  className?: string;
}

const ContactCard = ({ member, title, className = "" }: ContactCardProps) => {
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
            <span className="mb-0.5 block text-[10px] font-semibold text-gray-500 uppercase dark:text-gray-400">
              {title}
            </span>
            <h3 className="line-clamp-2 text-xs font-medium text-gray-900 transition-all duration-300 dark:text-gray-100">
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
};

interface ResourceCardProps {
  title: string;
  icon: string;
  link: string;
  color?: string;
  className?: string;
}

const ResourceCard = ({
  title,
  icon,
  link,
  color = "text-gray-600",
  className = "",
}: ResourceCardProps) => {
  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className={`group animate-in zoom-in-50 relative h-[130px] w-[130px] transition-transform duration-500 hover:scale-105 ${className}`}
    >
      <div className="dark:bg-base-200 dark:border-base-100 group-hover:border-primary dark:group-hover:border-primary absolute top-0 left-0 flex min-h-full w-full flex-col items-center justify-center rounded-lg border-2 border-gray-200 bg-white py-3 shadow-sm transition-all duration-300 ease-in-out group-hover:shadow-xl dark:border">
        <div className="flex w-full flex-col items-center justify-center gap-2">
          <span
            className={`${icon} text-4xl ${color} transition-transform duration-300 group-hover:scale-110`}
          />
          <h3 className="px-2 text-center text-base font-medium text-gray-900 dark:text-gray-100">
            {title}
          </h3>
        </div>
      </div>
    </a>
  );
};

export const ContactsSection = () => {
  const { data: members } = useTeamMembers();

  const anna = members?.find((m) => m.telegram === "belyak_anya");
  const ruslan = members?.find((m) => m.telegram === "dantetemplar");
  const artem = members?.find((m) => m.telegram === "ArtemSBulgakov");

  return (
    <section className="mt-16 mb-12">
      <SectionHeader
        id="contacts"
        title="Contacts"
        className="mb-8 justify-center text-center text-black dark:text-white"
      />

      <div className="flex flex-col items-center gap-8 px-4">
        {/* Leaders */}
        {members && (
          <div className="flex flex-wrap items-center justify-center gap-8">
            {anna && (
              <ContactCard member={anna} title="Leader" className="delay-0" />
            )}

            <div className="flex gap-8">
              {ruslan && (
                <ContactCard
                  member={ruslan}
                  title="Tech Leader"
                  className="delay-100"
                />
              )}
              {artem && (
                <ContactCard
                  member={artem}
                  title="Tech Leader"
                  className="delay-200"
                />
              )}
            </div>
          </div>
        )}

        {/* Resources */}
        <div className="flex flex-wrap justify-center gap-6">
          <ResourceCard
            title="Leave Feedback"
            icon="icon-[mdi--message-alert-outline]"
            link="https://forms.gle/2vMmu4vSoVShvbMw6"
            color="text-purple-500"
            className="delay-300"
          />

          <ResourceCard
            title="Telegram Channel"
            icon="icon-[uil--telegram-alt]"
            link="https://t.me/one_zero_eight"
            className="delay-400"
          />

          <ResourceCard
            title="Student Club"
            icon="icon-[mdi--school-outline]"
            link="https://innohassle.ru/clubs/one-zero-eight"
            color="text-indigo-500"
            className="delay-500"
          />

          <ResourceCard
            title="Join Us!"
            icon="icon-[mdi--robot-excited-outline]"
            link="https://t.me/one_zero_eight_bot"
            color="text-green-500"
            className="delay-600"
          />

          <ResourceCard
            title="GitHub"
            icon="icon-[mdi--github]"
            link="https://github.com/one-zero-eight"
            color="text-gray-800 dark:text-white"
            className="delay-700"
          />
        </div>
      </div>
    </section>
  );
};
