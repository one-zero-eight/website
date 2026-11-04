import { Trans, useLingui } from "@lingui/react/macro";
export function HowToCreateClubPage() {
  const { t } = useLingui();
  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-4 py-8 lg:px-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-base-content mb-4 text-3xl font-bold md:text-4xl">
          <Trans>Create Your Own Community</Trans>
        </h1>
        <p className="text-base-content/50 mx-auto max-w-2xl text-lg">
          <Trans>
            Have an idea for a club? Start your own community and make a
            difference at Innopolis University!
          </Trans>
        </p>
      </div>

      {/* Benefits Section */}
      <div className="bg-base-200 rounded-field p-6 md:p-8">
        <h2 className="text-base-content mb-6 text-2xl font-semibold">
          <Trans>Why Create a Club?</Trans>
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          <BenefitCard
            icon="icon-[material-symbols--self-improvement-rounded]"
            title={t`Learn More About Yourself`}
            description={t`Joining a student organization contributes to your self-awareness and presents opportunities to learn more about yourself, your goals, and your strengths.`}
          />
          <BenefitCard
            icon="icon-[material-symbols--groups-rounded]"
            title={t`Develop Soft Skills`}
            description={t`Learn and improve essential people skills like communication, teamwork, and work ethic through real-world experience.`}
          />
          <BenefitCard
            icon="icon-[material-symbols--network-node]"
            title={t`Networking Opportunities`}
            description={t`Meet new students, make connections, and build relationships that will help you down the line when looking for a job.`}
          />
          <BenefitCard
            icon="icon-[material-symbols--lab-research-outline]"
            title={t`Gain Practical Experience`}
            description={t`Get hands-on experience in your field of study in a safe environment where making mistakes is OK.`}
          />
          <BenefitCard
            icon="icon-[material-symbols--diversity-3-rounded]"
            title={t`Engage with Diverse Groups`}
            description={t`Learn how different people respond to situations and develop your skills in presenting and implementing ideas.`}
          />
          <BenefitCard
            icon="icon-[material-symbols--work-outline]"
            title={t`Expand Your CV`}
            description={t`Show employers that you're ambitious, broad-minded, and an active person who takes advantage of opportunities.`}
          />
          <BenefitCard
            icon="icon-[material-symbols--school-outline]"
            title={t`Give Back to the University`}
            description={t`Set standards and build future legacy by being an active member of the campus community.`}
          />
          <BenefitCard
            icon="icon-[material-symbols--celebration-outline]"
            title={t`Have Fun!`}
            description={t`Meet new people, make friends, and participate in activities that make your university experience memorable.`}
          />
        </div>
      </div>

      {/* Club Leader Benefits */}
      <div className="bg-base-200 rounded-field p-6 md:p-8">
        <h2 className="text-base-content mb-6 text-2xl font-semibold">
          <Trans>Club Leader Benefits</Trans>
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <LeaderBenefitItem
            icon="icon-[material-symbols--trophy-outline]"
            title={t`Innopoints Rewards`}
            description={t`Apply for innopoints at the end of every semester via the Innopoints Website.`}
          />
          <LeaderBenefitItem
            icon="icon-[material-symbols--calendar-today-outline]"
            title={t`Regular Schedule & Resources`}
            description={t`Request rooms, projectors, sports halls, and other resources for your club's meetings.`}
          />
          <LeaderBenefitItem
            icon="icon-[material-symbols--badge-outline]"
            title={t`Guest Passes`}
            description={t`Get access passes for club members who need entry to IU main building.`}
          />
          <LeaderBenefitItem
            icon="icon-[material-symbols--leaderboard-outline]"
            title={t`Club League`}
            description={t`Compete in the Club League to earn higher positions and more benefits.`}
          />
          <LeaderBenefitItem
            icon="icon-[material-symbols--payments-outline]"
            title={t`Semestral Budget`}
            description={t`Get budget allocation based on your Club League position.`}
          />
          <LeaderBenefitItem
            icon="icon-[material-symbols--school]"
            title={t`Higher Scholarship`}
            description={t`Top 20 clubs earn points for higher scholarship. Top 3 can nominate 3 active members.`}
          />
        </div>
      </div>

      {/* Club Types */}
      <div className="bg-base-200 rounded-field p-6 md:p-8">
        <h2 className="text-base-content mb-6 text-2xl font-semibold">
          <Trans>Club Types</Trans>
        </h2>
        <p className="text-base-content/50 mb-6">
          <Trans>
            When registering your club, you'll need to choose one of the
            following categories. Each type has specific criteria in the Club
            League.
          </Trans>
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <ClubTypeCard
            icon="icon-[material-symbols--code]"
            title={t`Technical`}
            description={t`Clubs focused on technology, programming, engineering, robotics, and other technical disciplines.`}
            examples={t`Programming Languages, Robotics, Web Development, AI/ML`}
          />
          <ClubTypeCard
            icon="icon-[material-symbols--sports-soccer]"
            title={t({ message: "Sport", context: "club type" })}
            description={t`Clubs centered around physical activities, sports, and fitness. Can give sport hours for trainings if accredited on InnoSport.`}
            examples={t`Football, Basketball, Volleyball, Badminton, Yoga`}
          />
          <ClubTypeCard
            icon="icon-[material-symbols--palette-outline]"
            title={t`Art & Culture`}
            description={t`Clubs dedicated to artistic expression, cultural activities, and creative pursuits.`}
            examples={t`Music, Theater, Photography, Painting, Dance`}
          />
          <ClubTypeCard
            icon="icon-[material-symbols--interests-outline]"
            title={t`Special Interest`}
            description={t`Clubs focused on hobbies, special interests, and community activities that don't fit other categories.`}
            examples={t`Board Games, Languages, Debate, Movies`}
          />
        </div>
      </div>

      {/* Timeline Section */}
      <div className="bg-base-200 rounded-field p-6 md:p-8">
        <h2 className="text-base-content mb-8 text-2xl font-semibold">
          <Trans>How to Register Your Club</Trans>
        </h2>

        <ul className="timeline timeline-vertical timeline-snap-icon timeline-compact">
          {/* Step 1 */}
          <li>
            <div className="timeline-middle">
              <span className="icon-[material-symbols--group-add-outline] text-primary text-2xl" />
            </div>
            <div className="timeline-end mb-10 md:text-start">
              <div className="text-lg font-black">
                <Trans>Step 1: Find Your Team</Trans>
              </div>
              <div className="text-base-content/80 mt-2">
                <Trans>
                  You need <strong>at least two responsible clubmates</strong>{" "}
                  to set up a club. Think about positions like communications
                  officer, marketing assistant, treasurer, etc.
                </Trans>
              </div>
            </div>
            <hr className="bg-primary" />
          </li>

          {/* Step 2 */}
          <li>
            <hr className="bg-primary" />
            <div className="timeline-middle">
              <span className="icon-[material-symbols--chat-outline] text-primary text-2xl" />
            </div>
            <div className="timeline-end mb-10 md:text-start">
              <div className="text-lg font-black">
                <Trans>Step 2: Create Telegram Group</Trans>
              </div>
              <div className="text-base-content/80 mt-2">
                <Trans>
                  Set up a <strong>Telegram group</strong> for your club and
                  invite all your friends who are interested in joining!
                </Trans>
              </div>
            </div>
            <hr className="bg-primary" />
          </li>

          {/* Step 3 */}
          <li>
            <hr className="bg-primary" />
            <div className="timeline-middle">
              <span className="icon-[material-symbols--target] text-primary text-2xl" />
            </div>
            <div className="timeline-end mb-10 md:text-start">
              <div className="text-lg font-black">
                <Trans>Step 3: Define Goals & Mission</Trans>
              </div>
              <div className="text-base-content/80 mt-2">
                <Trans>
                  Think about your <strong>aims and goals</strong> to keep your
                  club going purposefully. Consider writing mission and vision
                  statements to clarify your club's purpose.
                </Trans>
              </div>
            </div>
            <hr className="bg-primary" />
          </li>

          {/* Step 4 */}
          <li>
            <hr className="bg-primary" />
            <div className="timeline-middle">
              <span className="icon-[material-symbols--image-outline] text-primary text-2xl" />
            </div>
            <div className="timeline-end mb-10 md:text-start">
              <div className="text-lg font-black">
                <Trans>Step 4: Prepare Club Materials</Trans>
              </div>
              <div className="text-base-content/80 mt-2">
                <Trans>
                  Create an <strong>avatar or logo</strong> for your club.
                </Trans>
              </div>
            </div>
            <hr className="bg-primary" />
          </li>

          {/* Step 5 */}
          <li>
            <hr className="bg-primary" />
            <div className="timeline-middle">
              <span className="icon-[material-symbols--edit-document-outline] text-primary text-2xl" />
            </div>
            <div className="timeline-end mb-10 md:text-start">
              <div className="text-lg font-black">
                <Trans>Step 5: Fill Registration Form</Trans>
              </div>
              <div className="text-base-content/80 mt-2 mb-4">
                <Trans>
                  Complete the official registration form with all required
                  information about your club. You'll need to provide:
                </Trans>
              </div>
              <ul className="text-base-content/80 ml-6 list-disc space-y-1">
                <li>
                  <Trans>Full and short official names</Trans>
                </li>
                <li>
                  <Trans>Club description and goals</Trans>
                </li>
                <li>
                  <Trans>Logo/avatar file</Trans>
                </li>
                <li>
                  <Trans>Telegram group link</Trans>
                </li>
                <li>
                  <Trans>Leader's contact information</Trans>
                </li>
              </ul>
              <a
                href="https://forms.yandex.ru/u/6a4b86f402848f003229d7d5"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary mt-4"
              >
                <span className="icon-[material-symbols--arrow-forward]" />
                <Trans>Go to Registration Form</Trans>
              </a>
            </div>
          </li>
        </ul>
      </div>

      {/* Contact Section */}
      <div className="bg-base-200 rounded-field p-6 text-center md:p-8">
        <h2 className="text-base-content mb-4 text-2xl font-semibold">
          <Trans>Need Help?</Trans>
        </h2>
        <p className="text-base-content/50 mb-4">
          <Trans>
            If you need any assistance, advice, or resources to maintain and
            develop your club, contact our Student Clubs Manager:
          </Trans>
        </p>
        <div className="text-base-content">
          <p className="text-lg font-semibold">Timofey Konovalov</p>
          <a
            href="https://telegram.me/T_Konovalov"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary inline-flex items-center gap-1 text-lg hover:underline"
          >
            @T_Konovalov
          </a>
        </div>
      </div>
    </div>
  );
}

function BenefitCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4">
      <span className={`${icon} text-primary shrink-0 text-3xl`} />
      <div>
        <h3 className="text-base-content mb-2 font-semibold">{title}</h3>
        <p className="text-base-content/50 text-sm">{description}</p>
      </div>
    </div>
  );
}

function LeaderBenefitItem({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-3">
      <span className={`${icon} text-primary shrink-0 text-2xl`} />
      <div>
        <h4 className="text-base-content mb-1 font-medium">{title}</h4>
        <p className="text-base-content/50 text-sm">{description}</p>
      </div>
    </div>
  );
}

function ClubTypeCard({
  icon,
  title,
  description,
  examples,
}: {
  icon: string;
  title: string;
  description: string;
  examples: string;
}) {
  return (
    <div className="bg-base-100 rounded-field p-5">
      <div className="mb-3 flex items-center gap-3">
        <span className={`${icon} text-primary text-3xl`} />
        <h3 className="text-base-content text-lg font-semibold">{title}</h3>
      </div>
      <p className="text-base-content/50 mb-3 text-sm">{description}</p>
      <div className="border-base-300 border-t pt-3">
        <p className="text-base-content/70 text-xs font-medium">
          <Trans>
            Examples: <span className="text-base-content/60">{examples}</span>
          </Trans>
        </p>
      </div>
    </div>
  );
}
