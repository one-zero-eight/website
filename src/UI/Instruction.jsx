import LinkIcon from "../img/LinkIcon";

function Instruction() {
  return (
    <div className="flex flex-col  sm:flex-row justify-between items-center w-full sm:w-8/12 sm:mt-3 mt-6">
      <div className="flex flex-col justify-center items-start ml-4 sm:ml-0 text-sm sm:text-lg w-10/12">
        <h1>HOW TO IMPORT:</h1>
        <ul className="list-decimal pl-4 ">
          <li key={1}>COPY THE LINK FOR YOUR GROUP. </li>
          <li key={2}>OPEN YOUR CALENDAR SETTINGS ADD THE CALENDAR BY URL:</li>
          <li key={3}>PASTE THE LINK AND CLICK ADD.</li>
        </ul>
      </div>
      <div className="flex flex-row sm:justify-center ml-8 sm:ml-0 items-center w-full">
        <LinkIcon />
        <a
          className="underline ml-4 text-sm sm:text-lg"
          href="https://calendar.google.com/calendar/u/0/r/settings/addbyurl"
        >
          GOOGLE CALENDAR
        </a>
      </div>
    </div>
  );
}

export default Instruction;
