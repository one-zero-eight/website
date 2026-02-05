// referred to @evermake: https://github.com/evermake/108-website/blob/main/src/pages/about.vue
import { TeamMembers } from "./TeamMembers.tsx";
import { SectionHeader } from "./SectionHeader.tsx";
import { CarouselImage } from "./CarouselImage.tsx";
import { ResourceCard } from "@/components/about/cards/ResourceCard.tsx";

export function AboutPage() {
  const mainSections = [
    {
      id: "intro",
      title: "Who we are?",
      titleColor: "text-black dark:text-white",
      paragraphs: [
        '<strong class="text-black dark:text-white"><i>one-zero-eight</i></strong> — is a community of Innopolis University students passionate about technology. We care about education we get, tools we use and place we live in. Our mission is to create the perfect environment for student life.',
      ],
    },
    {
      id: "team",
      title: "Team",
      titleColor: "text-black dark:text-white",
      paragraphs: [
        "The core of one-zero-eight and the main resource is our team:",
      ],
    },
    {
      id: "projects",
      title: "Projects",
      titleColor: "text-black dark:text-white",
      paragraphs: [
        "We improve life at Innopolis University creating our projects, which solve our users' daily issues. Here are some of them that you can use now:",
        `<strong>InNoHassle</strong> - our flagman project, the ecosystem that combines university services in one website providing convenience both for students and university staff. Explore all available features:`,
        `You can check all released and developing projects in our <a href="https://github.com/one-zero-eight" class="text-primary hover:underline" target="_blank" rel="noopener noreferrer">GitHub main page</a>.`,
      ],
    },
    {
      id: "feedback",
      title: "Feedback",
      titleColor: "text-black dark:text-white",
      paragraphs: [
        `Have an issue with the service? Send us the alert of a trouble in the Google Form: <a href="https://docs.google.com/forms/d/e/1FAIpQLSc5049bPYh7VIu44vbaroN3B6XprsuZV17WtagNYbfXzvW9JQ/viewform?usp=send_form" class="text-primary underline italic hover:underline">leave a feedback or report issue</a>. Leaving your feedback, improvements suggestions are also welcome in the form.`,
      ],
    },
    {
      id: "join",
      title: "Join us",
      titleColor: "text-black dark:text-white",
      paragraphs: [
        `Want to become a part of the projects? Make a contribution or be a new member of our community? Follow us on GitHub, Telegram and <a href="https://t.me/one_zero_eight_bot" >fill out the form in the bot to join us!</a>`,
      ],
    },
  ];

  return (
    <div className="relative grow">
      <div className="absolute inset-0 z-[-1] h-full w-full bg-[url(/108-bg-pattern-black.svg)] mask-[radial-gradient(closest-side,rgba(0,0,0,0.4)_0%,rgba(0,0,0,0)_100%)] bg-repeat mask-size-[100%_600px] mask-position-[0_-350px] mask-no-repeat md:mask-size-[100%_500px] md:mask-[100px_-250px] dark:bg-[url(/108-bg-pattern-white.svg)]" />

      <div className="relative z-10 mx-auto max-w-4xl px-6 py-12">
        <h1 className="mb-12 text-start text-3xl font-bold text-black sm:mb-16 sm:text-4xl md:text-5xl dark:text-white">
          Welcome to <br />
          <span className="italic">one-zero-eight</span> community!
        </h1>

        <div className="space-y-10">
          {mainSections.map((section, sectionIndex) => (
            <section key={section.id}>
              <SectionHeader
                id={section.id}
                title={section.title}
                className={`mb-6 text-start ${section.titleColor}`}
              />
              <article className="space-y-4 text-start text-base leading-relaxed text-gray-700 sm:text-lg dark:text-gray-300">
                {section.paragraphs.map((paragraph, paragraphIndex) => (
                  <p
                    key={paragraphIndex}
                    className={`animate-in slide-in-from-bottom-4 duration-700 delay-${100 + sectionIndex * 300 + paragraphIndex * 100}`}
                    dangerouslySetInnerHTML={{ __html: paragraph }}
                  />
                ))}
              </article>
              {section.id === "team" && (
                <>
                  <TeamMembers />
                </>
              )}
              {section.id === "feedback" && (
                <div className="mt-6 flex w-full justify-center">
                  <ResourceCard
                    title="Feedback Report"
                    icon="icon-[mdi--message-alert-outline]"
                    link="https://forms.gle/2vMmu4vSoVShvbMw6"
                    color="text-purple-500"
                    className="w-30 delay-300"
                  />
                </div>
              )}
              {section.id === "join" && (
                <div className="mt-6 flex w-full flex-wrap justify-center gap-2">
                  <ResourceCard
                    title="Telegram Channel"
                    icon="icon-[uil--telegram-alt]"
                    link="https://t.me/one_zero_eight"
                    className="w-30 delay-400"
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
              )}
            </section>
          ))}
        </div>
      </div>
      <CarouselImage />
    </div>
  );
}
