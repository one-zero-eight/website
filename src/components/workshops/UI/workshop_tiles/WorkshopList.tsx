import React from "react";
import WorkshopItem from "./WorkshopItem";
import type { Workshop, WorkshopListProps, WorkshopsByDate } from "../../types";
const WorkshopList: React.FC<WorkshopListProps> = ({
  workshops,
  remove,
  edit,
  openDescription,
  currentUserRole,
  refreshParticipants,
}) => {
  const groups: WorkshopsByDate<Workshop> = {};
  workshops.forEach((workshop) => {
    const dateTag = workshop.date;
    if (!groups[dateTag]) {
      groups[dateTag] = [];
    }
    groups[dateTag].push(workshop);
  });
  const currday = (dayInDig: number) => {
    if (dayInDig === 1) {
      return "Monday";
    } else if (dayInDig === 2) {
      return "Tuesday";
    } else if (dayInDig === 3) {
      return "Wednesday";
    } else if (dayInDig === 4) {
      return "Thursday";
    } else if (dayInDig === 5) {
      return "Friday";
    } else if (dayInDig === 6) {
      return "Saturday";
    } else {
      return "Sunday";
    }
  };
  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const day = date.getDay();
    return currday(day) + " " + date.getDate();
  };
  return (
    <div
      style={{ textAlign: "center" }}
      className="flex flex-col gap-2 px-4 pb-28"
    >
      {/* Тернарное? выражение чтобы плейсходдер рисовать если нет воркшопов */}
      {groups && Object.keys(groups).length > 0 ? (
        Object.keys(groups)
          .sort()
          .map((tagName) => (
            <React.Fragment key={tagName}>
              <div className="my-1 flex w-full flex-wrap justify-between">
                <div className="text-2xl font-medium sm:text-3xl">
                  {formatDate(tagName)}
                </div>
                <div className="mb-1 mt-4 grid w-full grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2 sm:grid-cols-[repeat(auto-fit,minmax(225px,1fr))]">
                  {groups[tagName]
                    .sort((a, b) => {
                      const [hoursA, minutesA] = a.startTime
                        .split(":")
                        .map(Number);
                      const [hoursB, minutesB] = b.startTime
                        .split(":")
                        .map(Number);

                      return (
                        hoursA * 60 +
                        minutesA * 60 -
                        (hoursB * 60 + minutesB * 60)
                      );
                    })
                    .map((workshop) => (
                      <WorkshopItem
                        remove={remove}
                        edit={edit}
                        workshop={workshop}
                        openDescription={openDescription}
                        key={workshop.id}
                        currentUserRole={currentUserRole}
                        refreshParticipants={refreshParticipants}
                      />
                    ))}
                </div>
              </div>
            </React.Fragment>
          ))
      ) : (
        <div className="col-span-full w-full text-center text-xl">
          <h2 className="text-gray-500">No workshops yet!</h2>
        </div>
      )}
    </div>
  );
};

export default WorkshopList;
