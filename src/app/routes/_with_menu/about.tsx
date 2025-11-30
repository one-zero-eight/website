// referred to @evermake: https://github.com/evermake/108-website/blob/main/src/pages/about.vue
import { createFileRoute } from "@tanstack/react-router";
import { useGitHubMembers } from "@/components/about/useGitHubMembers.ts";

export const Route = createFileRoute("/_with_menu/about")({
  component: RouteComponent,
});

function RouteComponent() {
  const {
    data: githubMembers,
    isLoading: isLoadingMembers,
    error: membersError,
  } = useGitHubMembers();

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
    negativePoints: [
      {
        title: "No money",
        description:
          "We have no sponsors and by spending most of our time on study and university projects for free we don't earn much.",
      },
      {
        title: "No expert advice",
        description:
          "We are students just like you with nearly the same amount of experience and knowledge.",
      },
    ],
    positiveIntro:
      "But why work for free? Because there are reasons besides money, which are more important to us:",
    positivePoints: [
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

  const GitHubMembers = () => {
    if (isLoadingMembers) {
      return (
        <div className="dark:bg-base-200 mt-8 rounded-lg bg-gray-100 p-4">
          <h3 className="mb-4 text-center text-lg font-semibold text-black dark:text-white">
            Our GitHub Contributors
          </h3>
          <div className="flex items-center gap-4">
            <div className="flex animate-pulse gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-12 w-12 rounded-full"></div>
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
          <h3 className="mb-2 text-center text-lg font-semibold text-black dark:text-white">
            Our GitHub Contributors
          </h3>
          <p className="text-red-600 dark:text-red-400">
            {/* Unable to load GitHub members. Please try again later. */}
          </p>
        </div>
      );
    }

    if (!githubMembers || githubMembers.length === 0) {
      return (
        <div className="dark:bg-base-100 mt-8 rounded-lg bg-gray-100 p-4">
          <h3 className="mb-2 text-center text-lg font-semibold text-black dark:text-white">
            Our GitHub Contributors
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            No public members found.
          </p>
        </div>
      );
    }

    return (
      <div className="mt-8 rounded-lg p-4">
        <h3 className="mb-4 text-center text-lg font-semibold text-black dark:text-white">
          Our GitHub Contributors
        </h3>
        <div className="flex flex-wrap justify-center gap-4">
          {githubMembers.map((member, index) => (
            <a
              key={member.id}
              href={member.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className={`animate-in slide-in-from-bottom-4 dark:bg-base-200 flex flex-col items-center rounded-lg bg-gray-200 p-3 shadow-sm transition-all duration-200 hover:scale-105 hover:shadow-md delay-${100 + index * 50}`}
            >
              <img
                src={member.avatar_url}
                alt={member.login}
                className="mb-2 h-12 w-12 rounded-full border-2 border-gray-200 dark:border-gray-600"
                loading="lazy"
              />
              <span className="text-center text-sm font-medium text-gray-900 dark:text-gray-100">
                {member.login}
              </span>
            </a>
          ))}
        </div>
      </div>
    );
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
                className={`mb-6 text-2xl font-semibold ${section.titleColor}`}
              >
                {section.title}
              </h2>
              <div className="space-y-4 text-base leading-relaxed text-gray-700 sm:text-lg dark:text-gray-300">
                {section.paragraphs.map((paragraph, paragraphIndex) => (
                  <p
                    key={paragraphIndex}
                    className={`animate-in slide-in-from-bottom-4 duration-700 delay-${100 + sectionIndex * 300 + paragraphIndex * 100}`}
                    dangerouslySetInnerHTML={{ __html: paragraph }}
                  />
                ))}
              </div>
              {section.id === "team" && <GitHubMembers />}
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
          <h2 className="mb-6 text-2xl font-semibold text-black dark:text-white">
            {joinSection.title}
          </h2>
          <div className="space-y-6 text-base leading-relaxed text-gray-700 sm:text-lg dark:text-gray-300">
            <p className="animate-in slide-in-from-bottom-4 delay-500 duration-700">
              {joinSection.intro}
            </p>

            <div className="ml-4 space-y-4">
              {joinSection.negativePoints.map((point, index) => (
                <div
                  key={`negative-${index}`}
                  className={`animate-in slide-in-from-bottom-4 duration-700 delay-${600 + index * 100}`}
                >
                  <h3 className="mb-2 font-semibold text-black dark:text-white">
                    {point.title}
                  </h3>
                  <p>{point.description}</p>
                </div>
              ))}
            </div>

            <p className="animate-in slide-in-from-bottom-4 delay-800 duration-700">
              {joinSection.positiveIntro}
            </p>

            <ul className="ml-4 space-y-4">
              {joinSection.positivePoints.map((point, index) => (
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
          </div>
        </section>
      </div>
    </div>
  );
}
