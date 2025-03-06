import { useState } from "react";
import CustomSelect from "../common/customSelector";
import pattern from "./pattern.svg";
const data = [
  {
    id: 1,
    name: "DSAI",
    year: "B24 DSAI",
  },
  {
    id: 2,
    name: "DSAI",
    year: "B24 DSAI",
  },
  {
    id: 3,
    name: "DSAI",
    year: "B24 DSAI",
  },
  {
    id: 4,
    name: "DSAI",
    year: "B24 DSAI",
  },
  {
    id: 5,
    name: "DSAI",
    year: "B24 DSAI",
  },
  {
    id: 6,
    name: "DSAI",
    year: "B24 DSAI",
  },
  {
    id: 7,
    name: "DSAI",
    year: "B24 DSAI",
  },
  {
    id: 8,
    name: "DSAI",
    year: "B24 DSAI",
  },
];

export function CourseMaterialsPage() {
  const [selectedTrimester, setSelectedTrimester] = useState("All");
  const [selectedCourse, setSelectedCourse] = useState("All");
  const trimesterOptions = [
    { value: "All" },
    { value: "F20" },
    { value: "S21" },
    { value: "Sum21" },
    { value: "F21" },
    { value: "S21" },
    { value: "Sum22" },
  ];
  const courseOptions = [
    { value: "All" },
    { value: "B20" },
    { value: "B21" },
    { value: "B22" },
    { value: "B23" },
    { value: "B24" },
  ];

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-4 px-4 py-4">
      <div className="flex w-[90%] flex-col gap-[30px]">
        <div className="flex">
          <div className="flex flex-1 gap-[10px]">
            <input
              autoComplete="off"
              spellCheck={false}
              className="inset-0 h-10 w-[50%] resize-none rounded-lg border-2 border-brand-violet bg-pagebg p-3 text-base caret-brand-violet outline-none dark:text-white"
              placeholder="Search services..."
            />
            <button className="flex h-10 w-[93px] items-center justify-center gap-2 rounded-lg bg-brand-violet px-2 py-1 text-base font-normal leading-6 text-white shadow-[0px-0px-4px-#00000040] hover:bg-[#6600CC]">
              Search
            </button>
          </div>
          <div className="grid flex-1 grid-cols-2 gap-[10px]">
            <CustomSelect
              selectedValue={selectedCourse}
              onChange={setSelectedCourse}
              options={courseOptions}
              className=""
            />
            <CustomSelect
              selectedValue={selectedTrimester}
              onChange={setSelectedTrimester}
              options={trimesterOptions}
              className=""
            />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-[20px]">
          {data.map((item) => (
            <div
              key={`card-${item.id}`}
              className="h-[250px] rounded-[20px] bg-primary"
            >
              <div className="h-1/2 w-full overflow-hidden rounded-[20px] bg-brand-violet">
                <img
                  src={pattern}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="flex flex-col gap-2 p-5">
                <h3 className="text-lg font-semibold text-contrast">
                  {" "}
                  {item.name}
                </h3>
                <p className="text-sm font-semibold text-contrast">
                  {" "}
                  Year : {item.year}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
