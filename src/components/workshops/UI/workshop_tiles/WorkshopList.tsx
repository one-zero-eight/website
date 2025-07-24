import React from "react";
import WorkshopItem from "./WorkshopItem";
import type { Workshop, WorkshopListProps } from "../../types";
import { groupWorkshopsByDate, sortWorkshopsByTime, getDayName, formatDateWithDay } from "../../utils";

/**
 * Компонент списка воркшопов с группировкой по датам
 */
const WorkshopList: React.FC<WorkshopListProps> = ({
  workshops,
  remove,
  edit,
  openDescription,
  currentUserRole,
  refreshParticipants,
}) => {
  // Группируем воркшопы по датам для удобного отображения
  const groups = groupWorkshopsByDate(workshops);

  return (
    <div
      style={{ textAlign: "center" }}
      className="flex flex-col gap-2 px-4 pb-28"
    >
      {/* Условное отображение: либо список воркшопов, либо плейсхолдер */}
      {groups && Object.keys(groups).length > 0 ? (
        Object.keys(groups)
          .sort()
          .map((tagName) => (
            <React.Fragment key={tagName}>
              <div className="my-1 flex w-full flex-wrap justify-between">
                <div className="text-2xl font-medium sm:text-3xl">
                  {formatDateWithDay(tagName)}
                </div>
                <div className="mb-1 mt-4 grid w-full grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2 sm:grid-cols-[repeat(auto-fit,minmax(225px,1fr))]">
                  {sortWorkshopsByTime(groups[tagName]).map((workshop) => (
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
