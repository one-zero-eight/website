import { Trans, useLingui } from "@lingui/react/macro";
export function ClubLeaguePage() {
  const { t } = useLingui();
  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-4 py-8 lg:px-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-base-content mb-4 text-3xl font-bold md:text-4xl">
          <Trans>Club League</Trans>
        </h1>
        <p className="text-base-content/50 mx-auto max-w-2xl text-lg">
          <Trans>
            Compete, grow, and earn rewards for your club's achievements
          </Trans>
        </p>
      </div>

      {/* Aims Section */}
      <div className="bg-base-200 rounded-field p-6 md:p-8">
        <h2 className="text-base-content mb-6 text-2xl font-semibold">
          <Trans>Club League Aims</Trans>
        </h2>
        <div className="flex flex-col gap-4">
          <AimItem
            number={1}
            text={t`To determine the most active, initiative and successful student societies at Innopolis University, as well as to reward them`}
          />
          <AimItem
            number={2}
            text={t`To promote the IU by contributing to the development of the educational institution and the formation of a strong student community`}
          />
          <AimItem
            number={3}
            text={t`To integrate competition element into student clubs' life in order to stimulate such clubs to grow and set targets`}
          />
          <AimItem
            number={4}
            text={t`To raise student clubs' prestige and promote them within student contingent and in outer environment, as well as to address strategic importance of non-formal education at Innopolis University`}
          />
          <AimItem
            number={5}
            text={t`To teach student club leaders to run reports`}
          />
        </div>
      </div>

      {/* Competition Principles */}
      <div className="bg-base-200 rounded-field p-6 md:p-8">
        <h2 className="text-base-content mb-6 text-2xl font-semibold">
          <Trans>Competition Principles</Trans>
        </h2>
        <div className="text-base-content/90 space-y-4">
          <p>
            <Trans>
              The main competition principle lies in sportsmanship, where each
              competitor fairly assesses its correspondence to each criteria,
              respects opponents and crediting decision-making.
            </Trans>
          </p>
          <p>
            <Trans>
              Report form will be published to Club Leaders telegram group every
              month, according to which points will be credited.
            </Trans>
          </p>

          <div className="mt-6">
            <h3 className="text-base-content mb-3 font-semibold">
              <Trans>Priority Order in Crediting Decision Making</Trans>
            </h3>
            <ul className="ml-6 list-disc space-y-2">
              <li>
                <Trans>Criteria from the official table</Trans>
              </li>
              <li>
                <Trans>
                  In controversial situations decision is made by{" "}
                  <a
                    href="https://telegram.me/T_Konovalov"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    @T_Konovalov
                  </a>
                </Trans>
              </li>
              <li>
                <Trans>
                  In difficult situations decision is made by group vote in Club
                  Leaders telegram group
                </Trans>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Calendar & Rules */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-base-200 rounded-field p-6">
          <div className="mb-4 flex items-center gap-3">
            <span className="icon-[material-symbols--calendar-month-outline] text-primary text-3xl" />
            <h2 className="text-base-content text-xl font-semibold">
              <Trans>League Calendar</Trans>
            </h2>
          </div>
          <div className="space-y-3">
            <div className="bg-base-300 rounded-field p-4">
              <div className="text-primary mb-1 font-semibold">
                <Trans>1st Semester</Trans>
              </div>
              <div className="text-base-content/80">
                <Trans>August - December</Trans>
              </div>
            </div>
            <div className="bg-base-300 rounded-field p-4">
              <div className="text-primary mb-1 font-semibold">
                <Trans>2nd Semester</Trans>
              </div>
              <div className="text-base-content/80">
                <Trans>January - July</Trans>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-base-200 rounded-field p-6">
          <div className="mb-4 flex items-center gap-3">
            <span className="icon-[material-symbols--info-outline] text-primary text-3xl" />
            <h2 className="text-base-content text-xl font-semibold">
              <Trans>Important Rules</Trans>
            </h2>
          </div>
          <ul className="text-base-content/90 space-y-2 text-sm">
            <li className="flex gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>
                <Trans>
                  Budget must be spent before the end of the semester
                </Trans>
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>
                <Trans>
                  Clubs get points only for activities related to their field
                  (except criterion 16)
                </Trans>
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>
                <Trans>Every criterion requires proof</Trans>
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>
                <Trans>Unspent points from last semester expire</Trans>
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* Purchases */}
      <div className="bg-base-200 rounded-field p-6 md:p-8">
        <h2 className="text-base-content mb-6 text-2xl font-semibold">
          <Trans>Club Purchases</Trans>
        </h2>

        <div className="space-y-6">
          <div>
            <h3 className="text-base-content mb-3 flex items-center gap-2 font-semibold">
              <span className="icon-[material-symbols--shopping-cart-outline] text-primary text-xl" />
              <Trans>What Clubs Can Purchase</Trans>
            </h3>
            <ul className="text-base-content/90 ml-6 list-disc space-y-2">
              <li>
                <Trans>Equipment</Trans>
              </li>
              <li>
                <Trans>Workshops, lectures and other related services</Trans>
              </li>
              <li>
                <Trans>Merch of the club</Trans>
              </li>
              <li>
                <Trans>
                  Other materials related to the activities of the club
                </Trans>
              </li>
            </ul>
            <div className="bg-base-300 rounded-field mt-4 p-4">
              <p className="text-base-content/90 text-sm">
                <Trans>
                  <span className="font-semibold">Example:</span> Badminton club
                  can buy shuttlecocks, but cannot buy a flower pot.
                </Trans>
              </p>
              <p className="mt-2 text-sm">
                <Trans>Buying food for events is prohibited now.</Trans>
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-base-content mb-3 flex items-center gap-2 font-semibold">
              <span className="icon-[material-symbols--receipt-long-outline] text-primary text-xl" />
              <Trans>Purchase Process</Trans>
            </h3>
            <div className="space-y-3">
              <div className="flex gap-3">
                <span className="bg-primary text-primary-content flex size-6 shrink-0 items-center justify-center rounded-full text-sm font-bold">
                  1
                </span>
                <p className="text-base-content/90">
                  <Trans>
                    Purchases are made only{" "}
                    <strong>2 times per semester</strong>
                  </Trans>
                </p>
              </div>
              <div className="flex gap-3">
                <span className="bg-primary text-primary-content flex size-6 shrink-0 items-center justify-center rounded-full text-sm font-bold">
                  2
                </span>
                <p className="text-base-content/90">
                  <Trans>
                    The club manager collects orders from the club leaders in
                    advance, and later makes a purchase in the form of an
                    official order
                  </Trans>
                </p>
              </div>
              <div className="flex gap-3">
                <span className="bg-primary text-primary-content flex size-6 shrink-0 items-center justify-center rounded-full text-sm font-bold">
                  3
                </span>
                <p className="text-base-content/90">
                  <Trans>
                    If the purchase is non-standard and doesn't correspond to
                    the activities of the club, you have to write a
                    justification for the purchase and send it to{" "}
                    <a
                      href="https://telegram.me/T_Konovalov"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      @T_Konovalov
                    </a>
                  </Trans>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Resources Links */}
      <div className="from-primary/10 to-primary/5 rounded-field bg-linear-to-br p-6 md:p-8">
        <h2 className="text-base-content mb-6 text-2xl font-semibold">
          <Trans>League Resources</Trans>
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <a
            href="https://docs.google.com/spreadsheets/d/10fx5RQO48bcYtVpVOjONOBqvmnMrc61TYpHgIFfcwJw/edit?gid=2042208352#gid=2042208352"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-base-100 rounded-field flex flex-col gap-3 p-6 transition-shadow hover:shadow-lg"
          >
            <div className="flex items-center gap-3">
              <span className="icon-[material-symbols--table-chart-outline] text-primary text-3xl" />
              <h3 className="text-base-content font-semibold">
                <Trans>Club League Criteria</Trans>
              </h3>
            </div>
            <p className="text-base-content/50 text-sm">
              <Trans>
                Detailed criteria for earning points in the league, categorized
                by club type (Technical, Sport, Special Interest, Art/Culture)
              </Trans>
            </p>
            <div className="text-primary mt-auto flex items-center gap-1 text-sm font-medium">
              <Trans>Open Spreadsheet</Trans>
              <span className="icon-[material-symbols--arrow-outward]" />
            </div>
          </a>

          <a
            href="https://docs.google.com/spreadsheets/d/1wTeuML4vdrPt1E6L-ZXLEekbz7ozBV9d0c9TpeUxIyg/edit?gid=1956341643#gid=1956341643"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-base-100 rounded-field flex flex-col gap-3 p-6 transition-shadow hover:shadow-lg"
          >
            <div className="flex items-center gap-3">
              <span className="icon-[material-symbols--leaderboard-outline] text-primary text-3xl" />
              <h3 className="text-base-content font-semibold">
                <Trans>Current League Points</Trans>
              </h3>
            </div>
            <p className="text-base-content/50 text-sm">
              <Trans>
                Live standings showing points earned by clubs throughout the
                semester
              </Trans>
            </p>
            <div className="text-primary mt-auto flex items-center gap-1 text-sm font-medium">
              <Trans>View Standings</Trans>
              <span className="icon-[material-symbols--arrow-outward]" />
            </div>
          </a>
        </div>
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
