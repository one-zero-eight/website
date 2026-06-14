import { useMe } from "@/api/accounts/user.ts";
import { $sport } from "@/api/sport";
import { useMySportAccessToken } from "@/api/helpers/sport-access-token.ts";
import { AuthWall } from "@/components/common/AuthWall.tsx";
import { SportFaqSection } from "@/components/sport/SportFaqSection.tsx";
import {
  SportOverviewSection,
  SportProgressSection,
  SportSemesterHistorySection,
} from "@/components/sport/SportOverviewSection.tsx";
import { SportScheduleSection } from "@/components/sport/SportScheduleSection.tsx";
import { Link, ValidateLinkOptions } from "@tanstack/react-router";

type SportTab = "dashboard" | "history" | "faq";
type SportRoute = "/sport" | "/sport/history" | "/sport/faq";

const sportTabs: { id: SportTab; title: string; to: SportRoute }[] = [
  { id: "dashboard", title: "Calendar", to: "/sport" },
  { id: "history", title: "History", to: "/sport/history" },
  { id: "faq", title: "FAQ", to: "/sport/faq" },
];

export function SportPage({ activeTab }: { activeTab: SportTab }) {
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
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-4">
      <div className="border-base-300 flex shrink-0 flex-row gap-1 overflow-x-auto border-b whitespace-nowrap">
        {sportTabs.map((tab) => (
          <SportTabLink key={tab.id} to={tab.to}>
            {tab.title}
          </SportTabLink>
        ))}
      </div>

      {activeTab === "dashboard" ? (
        <>
          <SportOverviewSection profile={profile} />
          <SportProgressSection
            hours={hours}
            currentSemester={currentSemester}
          />
          {studentId != null ? (
            <SportScheduleSection
              enabled={canQuerySport}
              studentId={Number(studentId)}
            />
          ) : null}
        </>
      ) : null}

      {activeTab === "history" ? (
        <SportSemesterHistorySection
          semesterHistory={semesterHistory}
          currentSemester={currentSemester}
          historyPending={historyPending}
        />
      ) : null}

      {activeTab === "faq" ? <SportFaqSection enabled={canQuerySport} /> : null}

      <p className="text-base-content/60 text-center text-sm">
        Other questions? Contact your sport course curator or the sport office.
      </p>
    </div>
  );
}

function SportTabLink(props: ValidateLinkOptions) {
  return (
    <Link
      className="px-2 py-1"
      activeOptions={{ exact: true, includeSearch: true }}
      activeProps={{ className: "border-b-2 border-b-primary" }}
      {...props}
    />
  );
}
