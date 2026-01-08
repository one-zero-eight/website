// referred to @evermake: https://github.com/evermake/108-website/blob/main/src/pages/about.vue
import { TeamMembers } from "./TeamMembers.tsx";
import { ContactsSection } from "./ContactsSection.tsx";
import { SectionHeader } from "./SectionHeader.tsx";
import { CarouselImage } from "./CarouselImage.tsx";
import { ResourceCard } from "./cards/ResourceCard.tsx";

export function AboutPage() {
  const mainSections = [
    {
      id: "intro",
      title: "Who we are?",
      titleColor: "text-black dark:text-white",
      paragraphs: [
        '<strong className="text-black dark:text-white"><i>one-zero-eight</i></strong> (or just <strong className="text-black dark:text-white">108</strong>) — is a community of enthusiastic individuals with a common mission — make life at Innopolis University better. We aim to improve our skills and networking, create projects, and just enjoy the process.',
      ],
    },
    {
      id: "what-is-innohassle",
      title: "What is InNoHassle?",
      titleColor: "text-black dark:text-white",
      paragraphs: [
        '<strong className="text-black dark:text-white">InNoHassle</strong> (Innopolis without hassles) — is our primary project with a goal to combine all university services into one smart, convenient, performant, and beautiful ecosystem.',
      ],
    },
    {
      id: "team",
      title: "Team",
      titleColor: "text-black dark:text-white",
      paragraphs: [
        "We are a big team of students from all over the world who are developing and maintaining university services together by enthusiasm and the desire to make our student life more enjoyable.",
      ],
    },
  ];

  const joinSection = {
    title: "Want to join?",
    pointsList: [
      {
        title: "Freedom",
        description:
          "We can use any frameworks and technologies to implement our ideas, we have no NDA, we have flexible work schedule and other things that tech companies cannot afford.",
      },
      {
        title: "Experience",
        description:
          "University courses give us good theoretical knowledge, but in order to grow as a software engineer it's crucial to gain real world experience and to write A LOT of code. This is exactly what we do: we create projects that are actually used by people, unlike your pet projects.",
      },
      {
        title: "Fun 🎉",
        description:
          "Probably, the most important part of our work — is having fun! We are young, we are 3 minutes away from each other, we have the university open 24/7 — that's why we often watch movies and eat pizza, play board games and do sports, discuss different things, participate in hackathons, brainstorm and implement interesting ideas at 4 a.m.",
      },
    ],
  };

  return (
    <div className="relative grow">
      <div className="absolute inset-0 z-[-1] h-full w-full bg-[url(/108-bg-pattern-black.svg)] mask-[radial-gradient(closest-side,rgba(0,0,0,0.4)_0%,rgba(0,0,0,0)_100%)] bg-repeat mask-size-[100%_600px] mask-position-[0_-350px] mask-no-repeat md:mask-size-[100%_500px] md:mask-[100px_-250px] dark:bg-[url(/108-bg-pattern-white.svg)]" />

      <div className="relative z-10 mx-auto max-w-4xl px-6 py-12">
        <h1 className="mb-12 text-start text-3xl font-bold text-black sm:mb-16 sm:text-4xl md:text-5xl dark:text-white">
          Welcome to <br />
          <span className="italic">one-zero-eight</span> community!
        </h1>

        <ContactsSection />

        <div className="space-y-12">
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
            </section>
          ))}
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-6 py-12">
        <section>
          <SectionHeader
            id="join"
            title={joinSection.title}
            className="mb-6 text-start text-black dark:text-white"
          />
          <article className="space-y-6 text-start text-base leading-relaxed text-gray-700 sm:text-lg dark:text-gray-300">
            <h3 className="mb-2 font-semibold text-black dark:text-white">
              Departaments
            </h3>

            <li className="marker:text-primary ml-4">
              There are four departments in one-zero-eight:
            </li>

            <div className="flex flex-wrap justify-center gap-6">
              <ResourceCard
                title="Tech"
                icon="icon-[uil--brackets-curly]"
                className="text-base"
                color="text-primary"
              />

              <ResourceCard
                title="Design"
                icon="icon-[mdi--palette-outline]"
                className="text-base"
                color="text-primary"
              />

              <ResourceCard
                title="Media"
                icon="icon-[mdi--bullhorn-outline]"
                className="text-base"
                color="text-primary"
              />

              <ResourceCard
                title="Managment"
                icon="icon-[mdi--account-group-outline]"
                className="text-base"
                color="text-primary"
              />
            </div>

            <p className="ml-10">
              ...read more about us in our{" "}
              <a
                className="underline transition-all hover:font-bold"
                href="https://t.me/one_zero_eight/10"
              >
                presentation
              </a>
            </p>

            <ul className="marker:text-primary ml-4 list-disc space-y-4">
              {joinSection.pointsList.map((point, index) => (
                <li
                  key={`positive-${index}`}
                  className={`animate-in slide-in-from-bottom-4 duration-700 delay-${900 + index * 100}`}
                >
                  <h3 className="mb-2 font-semibold text-black dark:text-white">
                    {point.title}
                  </h3>
                  <p>{point.description}</p>
                </li>
              ))}
            </ul>
          </article>
        </section>

        <CarouselImage />
      </div>
    </div>
  );
}
