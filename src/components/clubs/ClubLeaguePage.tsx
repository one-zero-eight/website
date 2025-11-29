export function ClubLeaguePage() {
  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-4 py-8 lg:px-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-base-content mb-4 text-3xl font-bold md:text-4xl">
          Club League
        </h1>
        <p className="text-base-content/50 mx-auto max-w-2xl text-lg">
          Compete, grow, and earn rewards for your club's achievements
        </p>
      </div>

      {/* Aims Section */}
      <div className="bg-base-200 rounded-lg p-6 md:p-8">
        <h2 className="text-base-content mb-6 text-2xl font-semibold">
          Club League Aims
        </h2>
        <div className="flex flex-col gap-4">
          <AimItem
            number={1}
            text="To determine the most active, initiative and successful student societies at Innopolis University, as well as to reward them"
          />
          <AimItem
            number={2}
            text="To promote the IU by contributing to the development of the educational institution and the formation of a strong student community"
          />
          <AimItem
            number={3}
            text="To integrate competition element into student clubs' life in order to stimulate such clubs to grow and set targets"
          />
          <AimItem
            number={4}
            text="To raise student clubs' prestige and promote them within student contingent and in outer environment, as well as to address strategic importance of non-formal education at Innopolis University"
          />
          <AimItem
            number={5}
            text="To teach student club leaders to run reports"
          />
        </div>
      </div>

      {/* Competition Principles */}
      <div className="bg-base-200 rounded-lg p-6 md:p-8">
        <h2 className="text-base-content mb-6 text-2xl font-semibold">
          Competition Principles
        </h2>
        <div className="text-base-content/90 space-y-4">
          <p>
            The main competition principle lies in sportsmanship, where each
            competitor fairly assesses its correspondence to each criteria,
            respects opponents and crediting decision-making.
          </p>
          <p>
            Report form will be published to Club Leaders telegram group every
            month, according to which points will be credited.
          </p>

          <div className="mt-6">
            <h3 className="text-base-content mb-3 font-semibold">
              Priority Order in Crediting Decision Making
            </h3>
            <ul className="ml-6 list-disc space-y-2">
              <li>Criteria from the official table</li>
              <li>
                In controversial situations decision is made by{" "}
                <a
                  href="https://t.me/janedyuzha_dyuzha"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  @janedyuzha_dyuzha
                </a>
              </li>
              <li>
                In difficult situations decision is made by group vote in Club
                Leaders telegram group
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Calendar & Rules */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-base-200 rounded-lg p-6">
          <div className="mb-4 flex items-center gap-3">
            <span className="icon-[material-symbols--calendar-month-outline] text-primary text-3xl" />
            <h2 className="text-base-content text-xl font-semibold">
              League Calendar
            </h2>
          </div>
          <div className="space-y-3">
            <div className="bg-base-300 rounded-lg p-4">
              <div className="text-primary mb-1 font-semibold">
                1st Semester
              </div>
              <div className="text-base-content/80">June - November</div>
            </div>
            <div className="bg-base-300 rounded-lg p-4">
              <div className="text-primary mb-1 font-semibold">
                2nd Semester
              </div>
              <div className="text-base-content/80">December - May</div>
            </div>
          </div>
        </div>

        <div className="bg-base-200 rounded-lg p-6">
          <div className="mb-4 flex items-center gap-3">
            <span className="icon-[material-symbols--info-outline] text-primary text-3xl" />
            <h2 className="text-base-content text-xl font-semibold">
              Important Rules
            </h2>
          </div>
          <ul className="text-base-content/90 space-y-2 text-sm">
            <li className="flex gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Budget must be spent before the end of the semester</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>
                Clubs get points only for activities related to their field
                (except criterion 16)
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Every criterion requires proof</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Unspent points from last semester expire</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Purchases */}
      <div className="bg-base-200 rounded-lg p-6 md:p-8">
        <h2 className="text-base-content mb-6 text-2xl font-semibold">
          Club Purchases
        </h2>

        <div className="space-y-6">
          <div>
            <h3 className="text-base-content mb-3 flex items-center gap-2 font-semibold">
              <span className="icon-[material-symbols--shopping-cart-outline] text-primary text-xl" />
              What Clubs Can Purchase
            </h3>
            <ul className="text-base-content/90 ml-6 list-disc space-y-2">
              <li>Equipment</li>
              <li>Workshops, lectures and other related services</li>
              <li>Merch of the club</li>
              <li>Other materials related to the activities of the club</li>
            </ul>
            <div className="bg-base-300 mt-4 rounded-lg p-4">
              <p className="text-base-content/90 text-sm">
                <span className="font-semibold">Example:</span> Badminton club
                can buy shuttlecocks, but cannot buy a flower pot.
              </p>
              <p className="mt-2 text-sm">
                Buying food for events is prohibited now.
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-base-content mb-3 flex items-center gap-2 font-semibold">
              <span className="icon-[material-symbols--receipt-long-outline] text-primary text-xl" />
              Purchase Process
            </h3>
            <div className="space-y-3">
              <div className="flex gap-3">
                <span className="bg-primary text-primary-content flex size-6 shrink-0 items-center justify-center rounded-full text-sm font-bold">
                  1
                </span>
                <p className="text-base-content/90">
                  Purchases are made only <strong>2 times per semester</strong>
                </p>
              </div>
              <div className="flex gap-3">
                <span className="bg-primary text-primary-content flex size-6 shrink-0 items-center justify-center rounded-full text-sm font-bold">
                  2
                </span>
                <p className="text-base-content/90">
                  The club manager collects orders from the club leaders in
                  advance, and later makes a purchase in the form of an official
                  order
                </p>
              </div>
              <div className="flex gap-3">
                <span className="bg-primary text-primary-content flex size-6 shrink-0 items-center justify-center rounded-full text-sm font-bold">
                  3
                </span>
                <p className="text-base-content/90">
                  If the purchase is non-standard and doesn't correspond to the
                  activities of the club, you have to write a justification for
                  the purchase and send it to{" "}
                  <a
                    href="https://t.me/janedyuzha_dyuzha"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    @janedyuzha_dyuzha
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Resources Links */}
      <div className="from-primary/10 to-primary/5 rounded-lg bg-linear-to-br p-6 md:p-8">
        <h2 className="text-base-content mb-6 text-2xl font-semibold">
          League Resources
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <a
            href="https://docs.google.com/spreadsheets/d/10fx5RQO48bcYtVpVOjONOBqvmnMrc61TYpHgIFfcwJw/edit?gid=2042208352#gid=2042208352"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-base-100 flex flex-col gap-3 rounded-lg p-6 transition-shadow hover:shadow-lg"
          >
            <div className="flex items-center gap-3">
              <span className="icon-[material-symbols--table-chart-outline] text-primary text-3xl" />
              <h3 className="text-base-content font-semibold">
                Club League Criteria
              </h3>
            </div>
            <p className="text-base-content/50 text-sm">
              Detailed criteria for earning points in the league, categorized by
              club type (Technical, Sport, Special Interest, Art/Culture)
            </p>
            <div className="text-primary mt-auto flex items-center gap-1 text-sm font-medium">
              Open Spreadsheet
              <span className="icon-[material-symbols--arrow-outward]" />
            </div>
          </a>

          <a
            href="https://docs.google.com/spreadsheets/d/1wTeuML4vdrPt1E6L-ZXLEekbz7ozBV9d0c9TpeUxIyg/edit?gid=1956341643#gid=1956341643"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-base-100 flex flex-col gap-3 rounded-lg p-6 transition-shadow hover:shadow-lg"
          >
            <div className="flex items-center gap-3">
              <span className="icon-[material-symbols--leaderboard-outline] text-primary text-3xl" />
              <h3 className="text-base-content font-semibold">
                Current League Points
              </h3>
            </div>
            <p className="text-base-content/50 text-sm">
              Live standings showing points earned by clubs throughout the
              semester
            </p>
            <div className="text-primary mt-auto flex items-center gap-1 text-sm font-medium">
              View Standings
              <span className="icon-[material-symbols--arrow-outward]" />
            </div>
          </a>
        </div>
      </div>

      {/* Contact Section */}
      <div className="bg-base-200 rounded-lg p-6 text-center md:p-8">
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

function AimItem({ number, text }: { number: number; text: string }) {
  return (
    <div className="flex gap-4">
      <span className="bg-primary text-primary-content flex size-8 shrink-0 items-center justify-center rounded-full font-bold">
        {number}
      </span>
      <p className="text-base-content/90 flex-1 pt-1">{text}</p>
    </div>
  );
}
