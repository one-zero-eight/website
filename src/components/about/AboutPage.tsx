// referred to @evermake: https://github.com/evermake/108-website/blob/main/src/pages/about.vue
import { AboutAsideSection } from "./AboutAsideSection.tsx";
import { Trans, useLingui } from "@lingui/react/macro";
import { AboutFloatedLogo } from "./AboutFloatedLogo.tsx";
import { AboutLogoPhrase } from "@/components/icons/InlineLogo108.tsx";
import { CarouselImage } from "./CarouselImage.tsx";
import { DepartmentCards } from "./DepartmentCards.tsx";
import { SectionHeader } from "./SectionHeader.tsx";
import { TeamMembers } from "./TeamMembers.tsx";
import { Link } from "@tanstack/react-router";
const aboutActionButtonClass =
  "bg-base-200 hover:bg-base-300 rounded-box flex items-center justify-center gap-2 px-5 py-3 text-base font-semibold text-base-content transition-colors";

export function AboutPage() {
  const { t } = useLingui();

  return (
    <div className="relative grow">
      <div className="absolute inset-0 z-[-1] h-full w-full bg-[url(/108-bg-pattern-black.svg)] mask-[radial-gradient(closest-side,rgba(0,0,0,0.4)_0%,rgba(0,0,0,0)_100%)] bg-repeat mask-size-[100%_600px] mask-position-[0_-350px] mask-no-repeat md:mask-size-[100%_500px] md:mask-[100px_-250px] dark:bg-[url(/108-bg-pattern-white.svg)]" />

      <div className="relative z-10 mx-auto max-w-4xl px-6 py-12">
        <h1 className="mb-12 text-start text-3xl font-bold sm:mb-16 sm:text-4xl">
          <Trans>
            Welcome to <br />
            <span className="italic">one-zero-eight</span> community!
          </Trans>
        </h1>

        <div className="text-start text-base leading-relaxed sm:text-lg [&>p]:mb-4">
          <SectionHeader
            id="intro"
            title={t`Who we are`}
            className="text-start"
          />

          <p>
            <Trans>
              <strong>one-zero-eight</strong> is a student community
              enthusiastic about technology, striving to improve the Innopolis
              University environment. We develop projects, participate in
              hackathons, organize events, combining learning, collaboration,
              and fun.
            </Trans>
          </p>

          <SectionHeader
            id="projects"
            title={t`Projects`}
            className="text-start"
          />

          <p>
            <Trans>
              We develop projects for Innopolis University students and faculty.
              Our flagship project is{" "}
              <Link to="/" className="link link-hover text-primary">
                InNoHassle
              </Link>
              .
            </Trans>
          </p>

          <AboutFloatedLogo />

          <p>
            <Trans>
              The website is an ecosystem that brings together all{" "}
              <AboutLogoPhrase /> team services and useful Innopolis resources
              for students in one place.
            </Trans>
          </p>

          <p>
            <Trans>
              We are not limited to a single website: we also build internal
              university tools and maintain the sports website. See the full
              project list{" "}
              <a
                href="https://github.com/one-zero-eight/.github/blob/main/profile/README.md"
                className="link link-hover text-primary"
                target="_blank"
                rel="noopener noreferrer"
              >
                here
              </a>
              .
            </Trans>
          </p>

          <AboutAsideSection
            aside={
              <a
                href="https://forms.gle/2vMmu4vSoVShvbMw6"
                className={aboutActionButtonClass}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="icon-[mdi--message-alert-outline] text-xl" />
                <span>
                  <Trans>Report an issue</Trans>
                </span>
              </a>
            }
          >
            <p>
              <Trans>
                Let us know if you have ideas for our projects or run into any
                issues.
              </Trans>
            </p>
          </AboutAsideSection>

          <SectionHeader
            id="development"
            title={t`Development`}
            className="text-start"
          />

          <AboutAsideSection
            aside={
              <>
                <a
                  href="https://github.com/one-zero-eight"
                  className={aboutActionButtonClass}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="icon-[mdi--github] text-xl" />
                  <span>
                    <Trans>Our GitHub</Trans>
                  </span>
                </a>
                <a
                  href="https://github.com/orgs/one-zero-eight/projects/4"
                  className={aboutActionButtonClass}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="icon-[mdi--view-dashboard-outline] text-xl" />
                  <span>
                    <Trans>Our task board</Trans>
                  </span>
                </a>
                <a
                  href="https://github.com/one-zero-eight/.github/blob/main/CONTRIBUTING.md"
                  className={aboutActionButtonClass}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="icon-[mdi--file-document-outline] text-2xl" />
                  <span>CONTRIBUTING.md</span>
                </a>
              </>
            }
          >
            <p>
              <Trans>
                We love open source, we are open source, and we support open
                source. Projects for Innopolis University are built by students
                and everyone who cares, on a voluntary basis. You can support us
                by{" "}
                <a
                  href="https://github.com/orgs/one-zero-eight/projects/4"
                  className="link link-hover text-primary"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  contributing
                </a>
                .
              </Trans>
            </p>

            <p>
              <Trans>
                Our areas of interest include product engineering, NLP,
                robotics, and whatever else comes our way. We are constantly
                expanding our skills through hands-on experience, including
                hackathons.
              </Trans>
            </p>
          </AboutAsideSection>

          <CarouselImage id="development" />

          <p>
            <Trans>
              We have 2 Candidate Masters of Sports in competitive programming,
              2 First-Class Rank holders, and 1 Second-Class Rank holder. We
              have won over 1M rubles at hackathons.
            </Trans>
          </p>

          <SectionHeader
            id="events"
            title={t({ message: "Events", context: "about-us" })}
            className="text-start"
          />

          <p>
            <Trans>
              We are an official Innopolis University club. The{" "}
              <AboutLogoPhrase /> community strives to improve the place where
              we live and grow. We often host movie nights, club presentations,
              and workshops.
            </Trans>
          </p>

          <AboutAsideSection
            aside={
              <Link
                to="/clubs/$slug"
                params={{ slug: "one-zero-eight" }}
                className={aboutActionButtonClass}
              >
                <span className="icon-[mdi--school-outline] text-xl" />
                <span>
                  <Trans>108 club</Trans>
                </span>
              </Link>
            }
          >
            <p>
              <Trans>
                On February 6, 2023, we held our first club presentation. We now
                run this event every year.
              </Trans>
            </p>
          </AboutAsideSection>

          <CarouselImage id="events" />

          <AboutAsideSection
            aside={
              <a
                href="https://telegram.me/one_zero_eight"
                className={aboutActionButtonClass}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="icon-[uil--telegram-alt] text-xl" />
                <span>
                  <Trans>Telegram channel</Trans>
                </span>
              </a>
            }
          >
            <p>
              <Trans>
                You can learn about all new community projects and our events
                from our Telegram channel.
              </Trans>
            </p>
          </AboutAsideSection>

          <SectionHeader id="team" title={t`Team`} className="text-start" />

          <p>
            <Trans>
              The main goal of <AboutLogoPhrase /> members is improving their
              skills and having fun. We pass knowledge from older generations to
              younger ones and stay friends within the team.
            </Trans>
          </p>

          <p>
            <Trans>We have three departments, each with its own focus:</Trans>
          </p>

          <DepartmentCards />

          <p>
            <Trans>Our team is our main resource:</Trans>
          </p>

          <TeamMembers />

          <p>
            <Trans>
              <AboutLogoPhrase /> is about friendship, support, and passion for
              what you do. We used to share our passions with each other,
              whether it's programming, hiking, or archery.
            </Trans>
          </p>

          <CarouselImage id="team" />

          <AboutAsideSection
            aside={
              <div className="flex w-full flex-col items-center gap-2">
                <a
                  href="https://telegram.me/one_zero_eight_bot"
                  className={aboutActionButtonClass}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="icon-[mdi--robot-excited-outline] text-xl" />
                  <span>
                    <Trans>Join us</Trans>
                  </span>
                </a>
                <text className="text-base-100">
                  <Trans>meow!</Trans>
                </text>
              </div>
            }
          >
            <p>
              <Trans>
                We welcome everyone who wants to work in our team and contribute
                to open source. Our team includes members from Russia, Belarus,
                and Uzbekistan, and we are ready to keep growing.
              </Trans>
            </p>
          </AboutAsideSection>
        </div>
      </div>
    </div>
  );
}
