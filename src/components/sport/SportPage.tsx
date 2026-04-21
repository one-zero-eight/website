import { useMe } from "@/api/accounts/user.ts";
import { $sport } from "@/api/sport";
import { useMySportAccessToken } from "@/api/helpers/sport-access-token.ts";
import { AuthWall } from "@/components/common/AuthWall.tsx";
import { SportFaqSection } from "@/components/sport/SportFaqSection.tsx";
import { SportOverviewSection } from "@/components/sport/SportOverviewSection.tsx";
import { SportScheduleSection } from "@/components/sport/SportScheduleSection.tsx";

export function SportPage() {
  const { me } = useMe();
  const [sportToken] = useMySportAccessToken();

  const canQuerySport = !!me && !!sportToken;

  const {
    data: profile,
    isPending: profilePending,
    isError: profileError,
    error: profileErr,
  } = $sport.useQuery(
    "get",
    "/users/me",
    {},
    {
      enabled: canQuerySport,
      retry: 1,
    },
  );

  const studentId = profile?.user_id;
  const isStudent = !!profile?.student_info;

  const { data: hours } = $sport.useQuery(
    "get",
    "/students/{student_id}/hours-summary",
    { params: { path: { student_id: Number(studentId) } } },
    { enabled: canQuerySport && studentId != null },
  );

  const { data: currentSemester } = $sport.useQuery(
    "get",
    "/semesters/current",
    {},
    { enabled: canQuerySport && !!profile },
  );

  const { data: semesterHistory, isPending: historyPending } = $sport.useQuery(
    "get",
    "/students/{student_id}/semester-history",
    { params: { path: { student_id: Number(studentId) } } },
    { enabled: canQuerySport && studentId != null && isStudent },
  );

  if (!me) {
    return (
      <div className="px-4 py-4">
        <AuthWall />
      </div>
    );
  }

  if (!sportToken) {
    return (
      <div className="px-4 py-8">
        <div className="bg-base-200 rounded-box mx-auto max-w-md p-6 text-center">
          <div className="border-primary mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-t-transparent" />
          <p className="text-base-content/80">
            Connecting to the sport service…
          </p>
        </div>
      </div>
    );
  }

  if (profilePending) {
    return (
      <div className="flex flex-col gap-4 px-4 py-4">
        <div className="bg-base-200 rounded-box h-40 animate-pulse" />
        <div className="bg-base-200 rounded-box h-64 animate-pulse" />
      </div>
    );
  }

  if (profileError || !profile) {
    return (
      <div className="px-4 py-4">
        <div className="card card-border border-error bg-base-100">
          <div className="card-body">
            <h2 className="card-title text-error">Sport profile unavailable</h2>
            <p className="text-base-content/80 text-sm">
              {profileErr != null &&
              typeof profileErr === "object" &&
              "message" in profileErr &&
              typeof (profileErr as { message?: unknown }).message === "string"
                ? (profileErr as { message: string }).message
                : "You may not be registered in the sport system yet."}
            </p>
            <p className="text-base-content/70 text-sm">
              Try the{" "}
              <a
                href="https://t.me/IUSportBot"
                className="text-primary link"
                target="_blank"
                rel="noreferrer"
              >
                Telegram bot
              </a>{" "}
              or{" "}
              <a
                href="https://sport.innopolis.university"
                className="text-primary link"
                target="_blank"
                rel="noreferrer"
              >
                sport.innopolis.university
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-4">
      <SportOverviewSection
        profile={profile}
        hours={hours}
        currentSemester={currentSemester}
        semesterHistory={semesterHistory}
        historyPending={historyPending}
      />

      <SportScheduleSection
        enabled={canQuerySport}
        studentId={profile.user_id}
      />

      <div className="grid grid-cols-1 gap-4 @xl/content:grid-cols-2">
        <a
          href="https://t.me/IUSportBot"
          className="group bg-base-200 hover:bg-base-300 rounded-box flex flex-row gap-4 px-4 py-6"
          target="_blank"
          rel="noreferrer"
        >
          <div className="w-12 shrink-0">
            <span className="icon-[mdi--robot-excited-outline] text-primary text-5xl" />
          </div>
          <div className="flex min-w-0 flex-col gap-2">
            <p className="text-base-content flex items-center text-2xl font-semibold">
              Sport bot in Telegram
            </p>
            <p className="text-base-content/75 text-lg">
              Check in for trainings, view schedules, and track your sport hours
              with @IUSportBot.
            </p>
          </div>
        </a>
        <a
          href="https://sport.innopolis.university"
          className="group bg-base-200 hover:bg-base-300 rounded-box flex flex-row gap-4 px-4 py-6"
          target="_blank"
          rel="noreferrer"
        >
          <div className="w-12 shrink-0">
            <span className="icon-[material-symbols--quick-reference-outline-rounded] text-primary text-5xl" />
          </div>
          <div className="flex min-w-0 flex-col gap-2">
            <p className="text-base-content text-2xl font-semibold">
              Official website
            </p>
            <p className="text-base-content/75 text-lg">
              Self-sport reports, medical references, and full sport office
              features.
            </p>
          </div>
        </a>
      </div>

      <SportFaqSection enabled={canQuerySport} />

      <p className="text-base-content/60 text-center text-sm">
        Other questions? Contact your sport course curator or the sport office.
      </p>
    </div>
  );
}
