import { Helmet } from "react-helmet-async";
import { Topbar } from "../layout/Topbar";
import FavoriteButton from "./group-card/FavoriteButton";
import { useWindowSize } from "usehooks-ts";
import { Calendar } from "@/components/calendar/Calendar.tsx";
const group = {
  id: 108,
  alias: "fall25-b25-ro-108",
  updated_at: Date.now().toString(),
  created_at: Date.now().toString(),
  path: "fall25-b25-ro-108",
  name: "B25-RO-108",
  description:
    "one-zero-eight — is a community of Innopolis University students passionate about technology. We care about education we get, tools we use and place we live in. Our mission is to create the perfect environment for student life.",
  tags: [
    {
      id: 1,
      alias: "core-courses",
      type: "category",
      name: "Core Courses",
      satellite: null,
    },

    {
      id: 82033,
      alias: "bs-year-1",
      type: "core-courses",
      name: "BS - Year 1",
      satellite: null,
    },
  ],
};

const CLubFestEvent = () => {
  const { width } = useWindowSize();

  return (
    <>
      <Helmet>
        <title>{group.name} group — Schedule</title>
        <meta name="description" content={group.description ?? undefined} />
      </Helmet>

      <Topbar title="Group" />
      <div
        style={{ backgroundImage: "url(/background-pattern.svg)" }}
        className="min-h-64 bg-primary bg-repeat p-4"
      />
      <div className="p-4">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex min-h-full flex-grow flex-col gap-2">
            <h1 className="text-3xl font-semibold">{group.name}</h1>
            <p className="whitespace-pre-wrap text-base text-contrast/75">
              {group.description ||
                "Hello world, this is a long description about my life and this elective."}
            </p>
          </div>
          <FavoriteButton groupId={group.id} />
        </div>
        <h2 className="my-4 flex text-3xl font-medium">Tags</h2>
        <div className="flex flex-wrap gap-2">
          {group.tags?.map((tag) => (
            <div
              key={tag.id}
              className="flex w-fit rounded-2xl bg-secondary px-4 py-2"
            >
              {tag.name}
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-row flex-wrap items-center">
          <h2 className="flex grow text-3xl font-medium">Calendar</h2>
        </div>
      </div>
      <Calendar
        urls={[
          {
            url: "/clubfest.ics",
          },
        ]}
        initialView={
          width
            ? width >= 1280
              ? "dayGridMonth"
              : width >= 1024
                ? "timeGridWeek"
                : "listMonth"
            : "dayGridMonth"
        }
        viewId="page"
      />
    </>
  );
};

export default CLubFestEvent;
