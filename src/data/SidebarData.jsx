import CanteenIcon from "../img/CanteenIcon";
import FormsIcon from "../img/FormsIcon";
import LaundryIcon from "../img/LaundryIcon";
import ScheduleIcon from "../img/ScheduleIcon";
import ScholarshipIcon from "../img/Scholarship";

export const icons = [
  <ScheduleIcon className="place-self-end mr-4 w-12" selected={true} />,
  <LaundryIcon className="place-self-end mr-4 w-12" Selected={false} />,
  <FormsIcon className="place-self-end mr-4 w-12" Selected={false} />,
  <CanteenIcon className="place-self-end mr-4 w-12" Selected={false} />,
  <ScholarshipIcon className="place-self-end mr-4 w-12" Selected={false} />,
];

export const titles = [
  "Schedule",
  "Laundry",
  "Forms",
  "Canteen",
  "Scholarship",
];
