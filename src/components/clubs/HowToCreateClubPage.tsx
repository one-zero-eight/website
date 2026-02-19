export function HowToCreateClubPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-4 py-8 lg:px-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-base-content mb-4 text-3xl font-bold md:text-4xl">
          Create Your Own Community
        </h1>
        <p className="text-base-content/50 mx-auto max-w-2xl text-lg">
          Have an idea for a club? Start your own community and make a
          difference at Innopolis University!
        </p>
      </div>

      {/* Benefits Section */}
      <div className="bg-base-200 rounded-field p-6 md:p-8">
        <h2 className="text-base-content mb-6 text-2xl font-semibold">
          Why Create a Club?
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          <BenefitCard
            icon="icon-[material-symbols--self-improvement-rounded]"
            title="Learn More About Yourself"
            description="Joining a student organization contributes to your self-awareness and presents opportunities to learn more about yourself, your goals, and your strengths."
          />
          <BenefitCard
            icon="icon-[material-symbols--groups-rounded]"
            title="Develop Soft Skills"
            description="Learn and improve essential people skills like communication, teamwork, and work ethic through real-world experience."
          />
          <BenefitCard
            icon="icon-[material-symbols--network-node]"
            title="Networking Opportunities"
            description="Meet new students, make connections, and build relationships that will help you down the line when looking for a job."
          />
          <BenefitCard
            icon="icon-[material-symbols--lab-research-outline]"
            title="Gain Practical Experience"
            description="Get hands-on experience in your field of study in a safe environment where making mistakes is OK."
          />
          <BenefitCard
            icon="icon-[material-symbols--diversity-3-rounded]"
            title="Engage with Diverse Groups"
            description="Learn how different people respond to situations and develop your skills in presenting and implementing ideas."
          />
          <BenefitCard
            icon="icon-[material-symbols--work-outline]"
            title="Expand Your CV"
            description="Show employers that you're ambitious, broad-minded, and an active person who takes advantage of opportunities."
          />
          <BenefitCard
            icon="icon-[material-symbols--school-outline]"
            title="Give Back to the University"
            description="Set standards and build future legacy by being an active member of the campus community."
          />
          <BenefitCard
            icon="icon-[material-symbols--celebration-outline]"
            title="Have Fun!"
            description="Meet new people, make friends, and participate in activities that make your university experience memorable."
          />
        </div>
      </div>

      {/* Club Leader Benefits */}
      <div className="bg-base-200 rounded-field p-6 md:p-8">
        <h2 className="text-base-content mb-6 text-2xl font-semibold">
          Club Leader Benefits
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <LeaderBenefitItem
            icon="icon-[material-symbols--trophy-outline]"
            title="Innopoints Rewards"
            description="Apply for innopoints at the end of every semester via the Innopoints Website."
          />
          <LeaderBenefitItem
            icon="icon-[material-symbols--calendar-today-outline]"
            title="Regular Schedule & Resources"
            description="Request rooms, projectors, sports halls, and other resources for your club's meetings."
          />
          <LeaderBenefitItem
            icon="icon-[material-symbols--badge-outline]"
            title="Guest Passes"
            description="Get access passes for club members who need entry to IU main building."
          />
          <LeaderBenefitItem
            icon="icon-[material-symbols--leaderboard-outline]"
            title="Club League"
            description="Compete in the Club League to earn higher positions and more benefits."
          />
          <LeaderBenefitItem
            icon="icon-[material-symbols--payments-outline]"
            title="Semestral Budget"
            description="Get budget allocation based on your Club League position."
          />
          <LeaderBenefitItem
            icon="icon-[material-symbols--school]"
            title="Higher Scholarship"
            description="Top 20 clubs earn points for higher scholarship. Top 3 can nominate 3 active members."
          />
        </div>
      </div>

      {/* Club Types */}
      <div className="bg-base-200 rounded-field p-6 md:p-8">
        <h2 className="text-base-content mb-6 text-2xl font-semibold">
          Club Types
        </h2>
        <p className="text-base-content/50 mb-6">
          When registering your club, you'll need to choose one of the following
          categories. Each type has specific criteria in the Club League.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <ClubTypeCard
            icon="icon-[material-symbols--code]"
            title="Technical"
            description="Clubs focused on technology, programming, engineering, robotics, and other technical disciplines."
            examples="Programming Languages, Robotics, Web Development, AI/ML"
          />
          <ClubTypeCard
            icon="icon-[material-symbols--sports-soccer]"
            title="Sport"
            description="Clubs centered around physical activities, sports, and fitness. Can give sport hours for trainings if accredited on InnoSport."
            examples="Football, Basketball, Volleyball, Badminton, Yoga"
          />
          <ClubTypeCard
            icon="icon-[material-symbols--palette-outline]"
            title="Art & Culture"
            description="Clubs dedicated to artistic expression, cultural activities, and creative pursuits."
            examples="Music, Theater, Photography, Painting, Dance"
          />
          <ClubTypeCard
            icon="icon-[material-symbols--interests-outline]"
            title="Special Interest"
            description="Clubs focused on hobbies, special interests, and community activities that don't fit other categories."
            examples="Board Games, Languages, Debate, Movies"
          />
        </div>
      </div>

      {/* Timeline Section */}
      <div className="bg-base-200 rounded-field p-6 md:p-8">
        <h2 className="text-base-content mb-8 text-2xl font-semibold">
          How to Register Your Club
        </h2>

        <ul className="timeline timeline-vertical timeline-snap-icon timeline-compact">
          {/* Step 1 */}
          <li>
            <div className="timeline-middle">
              <span className="icon-[material-symbols--group-add-outline] text-primary text-2xl" />
            </div>
            <div className="timeline-end mb-10 md:text-start">
              <div className="text-lg font-black">Step 1: Find Your Team</div>
              <div className="text-base-content/80 mt-2">
                You need <strong>at least two responsible clubmates</strong> to
                set up a club. Think about positions like communications
                officer, marketing assistant, treasurer, etc.
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
                Step 2: Create Telegram Group
              </div>
              <div className="text-base-content/80 mt-2">
                Set up a <strong>Telegram group</strong> for your club and
                invite all your friends who are interested in joining!
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
                Step 3: Define Goals & Mission
              </div>
              <div className="text-base-content/80 mt-2">
                Think about your <strong>aims and goals</strong> to keep your
                club going purposefully. Consider writing mission and vision
                statements to clarify your club's purpose.
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
                Step 4: Prepare Club Materials
              </div>
              <div className="text-base-content/80 mt-2">
                Create an <strong>avatar or logo</strong> for your club.
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
                Step 5: Fill Registration Form
              </div>
              <div className="text-base-content/80 mt-2 mb-4">
                Complete the official registration form with all required
                information about your club. You'll need to provide:
              </div>
              <ul className="text-base-content/80 ml-6 list-disc space-y-1">
                <li>Full and short official names</li>
                <li>Club description and goals</li>
                <li>Logo/avatar file</li>
                <li>Telegram group link</li>
                <li>Leader's contact information</li>
              </ul>
              <a
                href="https://forms.yandex.ru/u/68aeb40ceb614608b252337e"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary mt-4"
              >
                <span className="icon-[material-symbols--arrow-forward]" />
                Go to Registration Form
              </a>
            </div>
          </li>
        </ul>
      </div>

      {/* Contact Section */}
      <div className="bg-base-200 rounded-field p-6 text-center md:p-8">
        <h2 className="text-base-content mb-4 text-2xl font-semibold">
          Need Help?
        </h2>
        <p className="text-base-content/50 mb-4">
          If you need any assistance, advice, or resources to maintain and
          develop your club, contact our Student Clubs Manager:
        </p>
        <div className="text-base-content">
          <p className="text-lg font-semibold">Timofey Konovalov</p>
          <a
            href="https://t.me/T_Konovalov"
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
          Examples: <span className="text-base-content/60">{examples}</span>
        </p>
      </div>
    </div>
  );
}
