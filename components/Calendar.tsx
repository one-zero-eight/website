"use client";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import iCalendarPlugin from "./iCalendarPlugin";

function Calendar({ url, ...props }: { url: string }) {
  return (
    <div {...props}>
      <FullCalendar
        events={{ url: url, format: "ics" }} // Load events by url
        timeZone="Europe/Moscow" // Use the same timezone for everyone
        plugins={[
          dayGridPlugin,
          timeGridPlugin,
          listPlugin,
          interactionPlugin,
          iCalendarPlugin,
        ]}
        initialView="listMonth" // Default view
        eventTimeFormat={{
          // Use 24-hour format
          hour: "2-digit",
          minute: "2-digit",
          meridiem: false,
          hour12: false,
        }}
        slotLabelFormat={{
          // Use 24-hour format
          hour: "2-digit",
          minute: "2-digit",
          meridiem: false,
          hour12: false,
        }}
        headerToolbar={{
          // Buttons in header
          left: "prev,next",
          center: "title",
          right: "listMonth,dayGridMonth,timeGridWeek",
        }}
        views={{
          timeGridWeek: {
            titleFormat: () => "", // Do not show title in week view
          },
        }}
        allDaySlot={false} // Do not display "all day" events
        // displayEventEnd={true} // Display end time
        nowIndicator={true} // Display current time as line
        firstDay={1} // From Monday
        navLinks={true} // Dates are clickable
        weekNumbers={true} // Display numbers of weeks
        weekNumberFormat={{ week: "long" }} // Show "Week 1", not "W1"
        weekNumberClassNames="text-sm" // Small text size
        // weekNumberCalculation={calculateWeek} // Display academic week numbers
        // height="100dvh" // Full height
        contentHeight="auto" // Do not add scrollbar
        stickyHeaderDates={false}
        eventInteractive={true} // Make event tabbable
        eventClassNames="cursor-pointer text-sm" // Show that events are clickable
        // eventClick={(info) => {
        //   info.jsEvent.preventDefault();
        //   console.log(info);
        // }}
        scrollTime="07:30:00" // Scroll to 7:30am on launch
        scrollTimeReset={false} // Do not reset scroll on date switch
        noEventsContent={() => "No events this month"} // Custom message
      />
    </div>
  );
}

export default Calendar;
