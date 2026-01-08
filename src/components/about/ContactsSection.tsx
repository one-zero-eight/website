import { useTeamMembers } from "./hooks/useTeamMembers";
// import { SectionHeader } from "./SectionHeader";
import { ResourceCard } from "./cards/ResourceCard.tsx";
import { ContactCard } from "./cards/ContactCard.tsx";

export const ContactsSection = () => {
  const { data: members } = useTeamMembers();

  const anna = members?.find((m) => m.telegram === "belyak_anya");
  const ruslan = members?.find((m) => m.telegram === "dantetemplar");
  const artem = members?.find((m) => m.telegram === "ArtemSBulgakov");

  return (
    <section className="mt-16 mb-12">
      {/* <SectionHeader
        id="contacts"
        title="Contacts"
        className="mb-8 justify-center text-center text-black dark:text-white"
      /> */}

      <div className="flex flex-col items-center gap-8 px-4">
        {/* Leaders */}
        {members && (
          <div className="flex flex-wrap items-center justify-center gap-8">
            {anna && (
              <ContactCard
                member={anna}
                title="Club Leader"
                className="delay-0"
              />
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
