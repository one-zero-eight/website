// referred to @evermake: https://github.com/evermake/108-website/blob/main/src/pages/about.vue
import { createFileRoute } from "@tanstack/react-router";
import { TelegramMembers } from "@/components/about/TelegramMembers";
import { GitHubMembers } from "@/components/about/GitHubMembers";

export const Route = createFileRoute("/_with_menu/about")({
  component: RouteComponent,
});

function RouteComponent() {
  const carouselImages: string[] = [
    "/img/clubfest.webp",
    "/img/108bows.webp",
    "/img/108forest.webp",
    "/img/garage.webp",

    "/img/hackaton.webp",
    "/img/artem-hellowin.webp",
    "/img/ruslan-gosling.webp",
    "/img/slippers.webp",
    "/img/hellowin2.webp",
  ];

  const mainSections = [
    {
      id: "what-is-it",
      title: "What is it?",
      titleColor: "text-white",
      paragraphs: [
        '<strong className="text-black dark:text-white">one-zero-eight</strong> (or just <strong className="text-black dark:text-white">108</strong>) — is a community of Innopolis University students passionate about technology. Our mission is to create the perfect environment for student life at our university.',
        "Currently, we face many hassles and see the gaps in our daily life. Have you experienced the long page loads? Have you ever had difficulty finding the right information? Do you really find the interfaces convenient and attractive? Do you have an interesting idea but think no one will ever implement it? We felt all of this.",
        'Who is going to fix this and make the word "innovative" not just an advertising slogan? Unfortunately, we don\'t know. Maybe, it is us?',
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
        "We are a big team of students from all over the world (i.e. Russia) who are developing and maintaining university services together by enthusiasm and the desire to make our student life more enjoyable.",
      ],
    },
  ];

  const joinSection = {
    title: "Want to join?",
    intro: "Here is what we can offer you:",
    points:
      "But why work for free? Because there are reasons besides money, which are more important to us:",
    pointsList: [
      {
        title: "Team",
        description:
          "It's impossible to make a huge difference alone. Working together, we get mutual support and can achieve more ambitious results.",
      },
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
    <div className="relative min-h-screen">
      <div className="absolute inset-0 z-[-1] h-full w-full bg-[url(/108-bg-pattern-black.svg)] mask-[radial-gradient(closest-side,rgba(0,0,0,0.4)_0%,rgba(0,0,0,0)_100%)] bg-repeat mask-size-[100%_600px] mask-position-[0_-350px] mask-no-repeat md:mask-size-[100%_500px] md:mask-[100px_-250px] dark:bg-[url(/108-bg-pattern-white.svg)]" />

      <div className="relative z-10 mx-auto max-w-4xl px-6 py-12">
        <h1 className="mb-12 text-center text-3xl font-bold text-black sm:mb-16 sm:text-4xl md:text-5xl dark:text-white">
          Welcome to <br />
          <span className="italic">one-zero-eight</span> community!
        </h1>

        <div className="space-y-12">
          {mainSections.map((section, sectionIndex) => (
            <section key={section.id}>
              <h2
                className={`mb-6 text-center text-2xl font-semibold ${section.titleColor}`}
              >
                {section.title}
              </h2>
              <article className="space-y-4 text-center text-base leading-relaxed text-gray-700 sm:text-lg dark:text-gray-300">
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
                  <GitHubMembers />
                  <TelegramMembers />
                </>
              )}
            </section>
          ))}
        </div>
      </div>

      <section className="relative my-8 h-[200px] lg:my-10 lg:h-[300px]">
        <div className="scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 hover:scrollbar-thumb-gray-400 dark:hover:scrollbar-thumb-gray-500 absolute inset-0 flex h-[200px] items-stretch justify-start gap-2 overflow-x-auto overflow-y-hidden px-2 lg:h-[300px]">
          {carouselImages.map((image, index) => (
            <img
              key={`first-${index}`}
              src={image}
              alt={`Community photo ${index + 1}`}
              className="h-[200px] w-auto min-w-[200px] flex-none rounded object-cover opacity-60 transition-opacity duration-300 hover:opacity-100 lg:h-[300px] lg:min-w-[300px]"
              loading="lazy"
            />
          ))}
        </div>
      </section>
      <div className="relative z-10 mx-auto max-w-4xl px-6 py-12">
        <section>
          <h2 className="mb-6 text-center text-2xl font-semibold text-black dark:text-white">
            {joinSection.title}
          </h2>
          <article className="space-y-6 text-center text-base leading-relaxed text-gray-700 sm:text-lg dark:text-gray-300">
            <p className="animate-in slide-in-from-bottom-4 delay-500 duration-700">
              {joinSection.intro}
            </p>

            <p className="animate-in slide-in-from-bottom-4 delay-800 duration-700">
              {joinSection.points}
            </p>

            <ul className="ml-4 space-y-4">
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
      </div>
    </div>
  );
}
