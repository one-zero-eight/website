// referred to @evermake: https://github.com/evermake/108-website/blob/main/src/pages/about.vue
import { AboutAsideSection } from "./AboutAsideSection.tsx";
import { AboutFloatedLogo } from "./AboutFloatedLogo.tsx";
import { AboutLogoPhrase } from "../icons/InlineLogo108.tsx";
import { CarouselImage } from "./CarouselImage.tsx";
import { DepartmentCards } from "./DepartmentCards.tsx";
import { SectionHeader } from "./SectionHeader.tsx";
import { TeamMembers } from "./TeamMembers.tsx";
import { Link } from "@tanstack/react-router";
const aboutActionButtonClass =
  "bg-base-200 hover:bg-base-300 rounded-box flex items-center justify-center gap-2 px-5 py-3 text-base font-semibold text-base-content transition-colors";

export function AboutPage() {
  return (
    <div className="relative grow">
      <div className="absolute inset-0 z-[-1] h-full w-full bg-[url(/108-bg-pattern-black.svg)] mask-[radial-gradient(closest-side,rgba(0,0,0,0.4)_0%,rgba(0,0,0,0)_100%)] bg-repeat mask-size-[100%_600px] mask-position-[0_-350px] mask-no-repeat md:mask-size-[100%_500px] md:mask-[100px_-250px] dark:bg-[url(/108-bg-pattern-white.svg)]" />

      <div className="relative z-10 mx-auto max-w-4xl px-6 py-12">
        <h1 className="mb-12 text-start text-3xl font-bold sm:mb-16 sm:text-4xl">
          Welcome to <br />
          <span className="italic">one-zero-eight</span> community!
        </h1>

        <div className="text-start text-base leading-relaxed sm:text-lg [&>p]:mb-4">
          <SectionHeader id="intro" title="Who we are" className="text-start" />

          <p>
            <strong>one-zero-eight</strong> is a student community enthusiastic
            about technology, striving to improve the Innopolis University
            environment. We develop projects, participate in hackathons,
            organize events, combining learning, collaboration, and fun.
          </p>

          <SectionHeader
            id="projects"
            title="Projects"
            className="text-start"
          />

          <p>
            We develop projects for Innopolis University students and faculty.
            Our flagship project is{" "}
            <Link to="/" className="link link-hover text-primary">
              InNoHassle
            </Link>
            .
          </p>

          <AboutFloatedLogo />

          <p>
            The website is an ecosystem that brings together{" "}
            <AboutLogoPhrase before="all" after="team" /> services and useful
            Innopolis resources for students in one place.
          </p>

          <p>
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
                <span>Report an issue</span>
              </a>
            }
          >
            <p>
              Let us know if you have ideas for our projects or run into any
              issues.
            </p>
          </AboutAsideSection>

          <SectionHeader
            id="development"
            title="Development"
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
                  <span>Our GitHub</span>
                </a>
                <a
                  href="https://github.com/orgs/one-zero-eight/projects/4"
                  className={aboutActionButtonClass}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="icon-[mdi--view-dashboard-outline] text-xl" />
                  <span>Our task board</span>
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
            </p>

            <p>
              Our areas of interest include product engineering, NLP, robotics,
              and whatever else comes our way. We are constantly expanding our
              skills through hands-on experience, including hackathons.
            </p>
          </AboutAsideSection>

          <CarouselImage id="development" />

          <p>
            We have 2 Candidate Masters of Sports in competitive programming, 2
            First-Class Rank holders, and 1 Second-Class Rank holder. We have
            won over 1M rubles at hackathons.
          </p>

          <SectionHeader id="events" title="Events" className="text-start" />

          <p>
            We are an official Innopolis University club.{" "}
            <AboutLogoPhrase before="The" after="community" /> strives to
            improve the place where we live and grow. We often host movie
            nights, club presentations, and workshops.
          </p>

          <AboutAsideSection
            aside={
              <Link
                to="/clubs/$slug"
                params={{ slug: "one-zero-eight" }}
                className={aboutActionButtonClass}
              >
                <span className="icon-[mdi--school-outline] text-xl" />
                <span>108 club</span>
              </Link>
            }
          >
            <p>
              On February 6, 2023, we held our first club presentation. We now
              run this event every year.
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
                <span>Telegram channel</span>
              </a>
            }
          >
            <p>
              You can learn about all new community projects and our events from
              our Telegram channel.
            </p>
          </AboutAsideSection>

          <SectionHeader id="team" title="Team" className="text-start" />

          <p>
            The main goal <AboutLogoPhrase before="of" after="members" /> is
            improving their skills and having fun. We pass knowledge from older
            generations to younger ones and stay friends within the team.
          </p>

          <p>We have three departments, each with its own focus:</p>

          <DepartmentCards />

          <p>Our team is our main resource:</p>

          <TeamMembers />

          <p>
            <AboutLogoPhrase after="is about" /> friendship, support, and
            passion for what you do. We used to share our passions with each
            other, whether it&apos;s programming, hiking, or archery.
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
                  <span>Join us</span>
                </a>
              </div>
            }
          >
            <p>
              We welcome everyone who wants to work in our team and contribute
              to open source. Our team includes members from Russia, Belarus,
              and Uzbekistan, and we are ready to keep growing.
            </p>
          </AboutAsideSection>
        </div>
      </div>
    </div>
  );
}
