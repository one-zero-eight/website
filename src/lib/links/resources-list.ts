export type ResourceType = {
  url: string;
  resource: string;
  title: string | null;
  description: string;
  icon: string;
  category: string;
  frequency: number;
};

const INNOHASSLE_FREQUENCY = 10;

export const resourcesList: ResourceType[] = [
  // > Main >
  {
    url: "https://sport.innopolis.university/profile/",
    resource: "Sport website",
    title: null,
    description:
      "Check in for classes at the sport complex and track the number of sport hours.",
    icon: "icon-[material-symbols--sports-gymnastics]",
    category: "Extracurricular",
    frequency: 4163,
  },
  {
    url: "https://moodle.innopolis.university/my/",
    resource: "Moodle",
    title: null,
    description: "Access official course materials and tests.",
    icon: "icon-[material-symbols--menu-book-outline]",
    category: "Academic",
    frequency: 3451,
  },
  {
    url: "https://baam.tatar/s",
    resource: "Baam",
    title: "Scan attendance",
    description: "Mark attendance by scanning QR code.",
    icon: "icon-[material-symbols--qr-code-scanner]",
    category: "Academic",
    frequency: 1686 + 1131,
  },
  {
    url: "https://mail.innopolis.ru",
    resource: "Outlook",
    title: "Mail",
    description: "Official corporate email service.",
    icon: "icon-[material-symbols--mail-outline]",
    category: "Technical",
    frequency: 61,
  },
  {
    url: "https://baam.tatar/AttendanceCheck",
    resource: "Baam",
    title: "Collect attendance",
    description: "Collect attendance for activity.",
    icon: "icon-[material-symbols--checklist]",
    category: "Academic",
    frequency: 18,
  },
  // < Main <

  // > My University >
  {
    url: "https://my.university.innopolis.ru/",
    resource: "My University",
    title: null,
    description:
      "Request references, find out your grades, scholarship, fill the forms for internships.",
    icon: "icon-[ic--baseline-school]",
    category: "Academic",
    frequency: 1521,
  },
  {
    url: "https://my.innopolis.university/event",
    resource: "New My University",
    title: "Events for innopoints",
    description: "Earn innopoints by participating in projects and activities.",
    icon: "icon-[material-symbols--currency-ruble-rounded]",
    category: "Extracurricular",
    frequency: 858 / 2 + 295,
  },
  {
    url: "https://my.innopolis.university/store",
    resource: "New My University",
    title: "InnoStore",
    description:
      "Redeem your innopoints for cool merch and rewards at the InnoStore.",
    icon: "icon-[material-symbols--storefront-outline]",
    category: "Extracurricular",
    frequency: 858 / 2 + 20,
  },
  {
    url: "https://my.university.innopolis.ru/profile/personal-form/index?tab=validations",
    resource: "My University",
    title: "Gradebook",
    description: "View your marks for all previous semesters.",
    icon: "icon-[material-symbols--assignment-outline]",
    category: "Academic",
    frequency: 0,
  },
  {
    url: "https://my.university.innopolis.ru/profile/edu-certs/create",
    resource: "My University",
    title: "Request references",
    description: "Request a reference about studying or other things.",
    icon: "icon-[material-symbols--description-outline]",
    category: "Academic",
    frequency: 0,
  },
  {
    url: "https://my.university.innopolis.ru/profile/personal-form/index?tab=scholarship",
    resource: "My University",
    title: "Scholarship",
    description:
      "See how the scholarship is calculated for your current semester in My University.",
    icon: "icon-[material-symbols--credit-card-outline]",
    category: "Financial",
    frequency: 0,
  },
  {
    url: "https://my.university.innopolis.ru/profile/applications",
    resource: "My University",
    title: "Templates of applications",
    description:
      "Access and download templates for various university applications.",
    icon: "icon-[material-symbols--article-outline]",
    category: "Academic",
    frequency: 0,
  },
  // < My University <

  // > InNoHassle >
  {
    url: "https://t.me/IUSportBot",
    resource: "InNoHassle",
    title: "Sport bot",
    description: "Conveniently check in for sports in Telegram.",
    icon: "icon-[material-symbols--sports-soccer]",
    category: "Extracurricular",
    frequency: INNOHASSLE_FREQUENCY,
  },
  {
    url: "https://t.me/InnoPrintBot",
    resource: "InNoHassle",
    title: "Inno Print Bot",
    description: "Quickly print & scan on university printers.",
    icon: "icon-[material-symbols--print]",
    category: "Technical",
    frequency: INNOHASSLE_FREQUENCY,
  },
  {
    url: "https://t.me/InnoMusicRoomBot",
    resource: "InNoHassle",
    title: "Music room",
    description: "Access the music room with musical equipment.",
    icon: "icon-[material-symbols--music-note]",
    category: "Extracurricular",
    frequency: INNOHASSLE_FREQUENCY,
  },
  {
    url: "https://t.me/IURoomsBot",
    resource: "InNoHassle",
    title: "Dorms bot",
    description:
      "Manage your dormitory room and split duties with your roommates.",
    icon: "icon-[material-symbols--home-work-outline]",
    category: "Housing",
    frequency: INNOHASSLE_FREQUENCY,
  },
  {
    url: "https://innohassle.ru/maps",
    resource: "InNoHassle",
    title: "Maps",
    description: "Find any place in Innopolis.",
    icon: "icon-[material-symbols--map-outline]",
    category: "Navigation",
    frequency: INNOHASSLE_FREQUENCY,
  },
  {
    url: "https://innohassle.ru/room-booking",
    resource: "InNoHassle",
    title: "Room booking",
    description: "Book the meeting rooms and auditoriums in the university.",
    icon: "icon-[material-symbols--door-open-outline-rounded]",
    category: "Navigation",
    frequency: INNOHASSLE_FREQUENCY,
  },
  {
    url: "https://innohassle.ru/calendar",
    resource: "InNoHassle",
    title: "Calendar",
    description: "View your personal schedule with classes, sports, deadlines.",
    icon: "icon-[material-symbols--calendar-month-outline-rounded]",
    category: "Academic",
    frequency: INNOHASSLE_FREQUENCY,
  },
  {
    url: "https://innohassle.ru/scholarship",
    resource: "InNoHassle",
    title: "Scholarship calculator",
    description:
      "Calculate your expected scholarship for the next semester in InNoHassle.",
    icon: "icon-[material-symbols--calculate-outline]",
    category: "Financial",
    frequency: INNOHASSLE_FREQUENCY,
  },
  {
    url: "https://innohassle.ru/schedule",
    resource: "InNoHassle",
    title: "Schedule",
    description: "Conveniently view your schedule in the calendar.",
    icon: "icon-[material-symbols--today-outline]",
    category: "Academic",
    frequency: INNOHASSLE_FREQUENCY,
  },
  {
    url: "https://innohassle.ru/extension",
    resource: "InNoHassle",
    title: "Browser extension",
    description:
      "Install browser extension for auto-login to Moodle and quick links.",
    icon: "icon-[material-symbols--extension-outline]",
    category: "Technical",
    frequency: INNOHASSLE_FREQUENCY,
  },
  // < InNoHassle <

  // > Eduwiki >
  {
    url: "https://eduwiki.innopolis.university/index.php/Main_Page",
    resource: "Eduwiki",
    title: null,
    description: "View the official documents from DoE.",
    icon: "icon-[material-symbols--library-books-outline]",
    category: "Academic",
    frequency: 305,
  },
  {
    url: "https://eduwiki.innopolis.university/index.php/AcademicCalendar",
    resource: "Eduwiki",
    title: "Academic calendar",
    description:
      "View the official academic calendar with holidays and study days.",
    icon: "icon-[material-symbols--calendar-month-outline]",
    category: "Academic",
    frequency: 2,
  },
  {
    url: "https://eduwiki.innopolis.university/index.php/All:Schedule",
    resource: "Eduwiki",
    title: "Schedule",
    description: "View the official schedule of classes.",
    icon: "icon-[material-symbols--schedule-outline]",
    category: "Academic",
    frequency: 0,
  },
  {
    url: "https://eduwiki.innopolis.university/index.php/ALL:StudyPlan",
    resource: "Eduwiki",
    title: "Study plan",
    description:
      "View the study plan with a documented amount of required studying hours.",
    icon: "icon-[material-symbols--book-outline]",
    category: "Academic",
    frequency: 34,
  },
  // < Eduwiki <

  // > Housing >
  {
    url: "https://hotel.innopolis.university/studentaccommodation/",
    resource: "Dormitory",
    title: "Student accommodation",
    description:
      "Fill the service requests, view the cleaning schedule, and read accommodation rules.",
    icon: "icon-[material-symbols--home-outline]",
    category: "Housing",
    frequency: 54,
  },
  {
    url: "https://hotel.innopolis.university/studentaccommodation/#block2944",
    resource: "Dormitory",
    title: "Service request",
    description:
      "Submit requests for maintenance or services in your dormitory.",
    icon: "icon-[material-symbols--construction]",
    category: "Housing",
    frequency: 18,
  },
  {
    url: "https://t.me/campus_info",
    resource: "Dormitory",
    title: "Information channel",
    description:
      "Get the latest updates and information about dormitory life and rules in Telegram.",
    icon: "icon-[material-symbols--info-outline]",
    category: "Housing",
    frequency: 15,
  },
  {
    url: "https://t.me/hoteluni",
    resource: "Dormitory",
    title: "Administration",
    description:
      "Contact the hotel administration for official inquiries and concerns.",
    icon: "icon-[material-symbols--admin-panel-settings-outline]",
    category: "Housing",
    frequency: 9,
  },
  {
    url: "https://t.me/Inno_dorm",
    resource: "Dormitory",
    title: "Student support",
    description: "Get assistance and support for dormitory-related issues.",
    icon: "icon-[material-symbols--support-agent]",
    category: "Housing",
    frequency: 8,
  },
  // < Housing <

  // > Campus life >
  {
    url: "http://campuslife.innopolis.ru/",
    resource: "Campus life",
    title: null,
    description:
      "Learn about student clubs, opportunities, events, and read the student handbook.",
    icon: "icon-[material-symbols--groups-outline]",
    category: "Extracurricular",
    frequency: 17,
  },
  {
    url: "http://campuslife.innopolis.ru/handbook2023#scholarship",
    resource: "Campus life",
    title: "Scholarship",
    description: "Read the official scholarship rules and regulations.",
    icon: "icon-[material-symbols--menu-book-outline]",
    category: "Financial",
    frequency: 43,
  },
  {
    url: "http://campuslife.innopolis.ru/clubs",
    resource: "Campus life",
    title: "Clubs",
    description: "Explore and join student clubs and organizations on campus.",
    icon: "icon-[material-symbols--diversity-3]",
    category: "Extracurricular",
    frequency: 17,
  },
  {
    url: "http://campuslife.innopolis.ru/handbook2023",
    resource: "Campus life",
    title: "Handbook",
    description:
      "Access the official student handbook for campus rules, policies, and guidelines.",
    icon: "icon-[material-symbols--menu-book-outline]",
    category: "Extracurricular",
    frequency: 0,
  },
  // < Campus life <

  // > Technical >
  {
    url: "http://campuslife.innopolis.ru/clubs",
    resource: "Campus life",
    title: "Clubs",
    description: "Explore and join student clubs and organizations on campus.",
    icon: "icon-[material-symbols--diversity-3]",
    category: "Extracurricular",
    frequency: 0,
  },
  {
    url: "https://vm.innopolis.university/",
    resource: "IT help",
    title: "Virtual machines",
    description: "Access free virtual machines.",
    icon: "icon-[material-symbols--computer-outline]",
    category: "Technical",
    frequency: 37,
  },
  {
    url: "https://it.innopolis.university",
    resource: "IT help",
    title: "Ticketing system",
    description: "Fill the tickets for the IT department.",
    icon: "icon-[material-symbols--computer-outline]",
    category: "Technical",
    frequency: 8,
  },
  {
    url: "https://t.me/iuithelp",
    resource: "IT help",
    title: "Contact for urgent messages",
    description:
      "Reach out IT department for urgent assistance or inquiries via Telegram.",
    icon: "icon-[material-symbols--contact-support-outline]",
    category: "Technical",
    frequency: 3,
  },
  {
    url: "https://help.university.innopolis.ru",
    resource: "IT help",
    title: "Wiki",
    description: "Access the IT department's instructions.",
    icon: "icon-[material-symbols--contact-support-outline]",
    category: "Technical",
    frequency: 0,
  },
  {
    url: "https://booking-innodatahub.innopolis.university/",
    resource: "InnoDataHub",
    title: null,
    description: "Book powerful computing resources.",
    icon: "icon-[material-symbols--storage]",
    category: "Technical",
    frequency: 37,
  },
  // < Technical <

  // > Miscellaneous >
  {
    url: "https://psychologist.innopolis.university/appointment/new",
    resource: "Psychologist",
    title: null,
    description:
      "Book an appointment with a psychologist by using this service.",
    icon: "icon-[material-symbols--psychology-outline]",
    category: "Support",
    frequency: 113,
  },
  {
    url: "https://portal.university.innopolis.ru/reading_hall/",
    resource: "Bitrix",
    title: "Library",
    description:
      "Explore books available in the university library and reserve some of them.",
    icon: "icon-[material-symbols--local-library-outline]",
    category: "Academic",
    frequency: 21,
  },
  {
    url: "https://t.me/InnaHelpBot",
    resource: "Inna",
    title: "Bus schedule",
    description:
      "Quickly find any city organization and view the bus schedule in Telegram.",
    icon: "icon-[material-symbols--directions-bus-outline]",
    category: "Navigation",
    frequency: 10,
  },
  {
    url: "https://t.me/+H0MsiY00PoI4Yzcy",
    resource: "Library",
    title: "Information channel",
    description:
      "Get the latest updates and information about the library in Telegram.",
    icon: "icon-[material-symbols--local-library-outline]",
    category: "Academic",
    frequency: 0,
  },
  {
    url: "https://portal.university.innopolis.ru/booking/index.php",
    resource: "Bitrix",
    title: "Ski equipment",
    description: "Book ski equipment for free.",
    icon: "icon-[material-symbols--downhill-skiing]",
    category: "Extracurricular",
    frequency: 22,
  },
  {
    url: "https://t.me/innobus",
    resource: "Bus",
    title: "Information channel",
    description: "View news about the current bus location in Telegram.",
    icon: "icon-[material-symbols--map-outline]",
    category: "Navigation",
    frequency: 5,
  },
  {
    url: "https://t.me/innolinks",
    resource: "Chat with chats",
    title: null,
    description: "Explore links to many Telegram channels and chats.",
    icon: "icon-[material-symbols--chat-outline]",
    category: "Extracurricular",
    frequency: 30,
  },
  {
    url: "https://mail.innopolis.ru/owa/#path=/calendar",
    resource: "Outlook",
    title: "Calendar",
    description: "Access the calendar and arrange meetings with IU employees.",
    icon: "icon-[material-symbols--calendar-month-outline]",
    category: "Technical",
    frequency: 11,
  },
  {
    url: "https://t.me/IU_cigen_bot",
    resource: "Course image generator",
    title: null,
    description:
      "Quickly generate an image for your course chats and channels.",
    icon: "icon-[material-symbols--image-outline]",
    category: "Technical",
    frequency: 36,
  },
  {
    url: "https://gitlab.pg.innopolis.university",
    resource: "GitLab",
    title: null,
    description: "Access the university GitLab for projects and assignments.",
    icon: "icon-[material-symbols--data-object]",
    category: "Technical",
    frequency: 13,
  },
  {
    url: "https://t.me/opportunitiesforyou",
    resource: "Opportunities For You",
    title: null,
    description:
      "Telegram channel with announcements about interesting activities and events.",
    icon: "icon-[material-symbols--info-outline]",
    category: "Extracurricular",
    frequency: 0,
  },
  {
    url: "https://t.me/StudentAffairs_bot",
    resource: "Student Affairs bot",
    title: null,
    description: "Bot for communication with 319 and DoE.",
    icon: "icon-[material-symbols--chat-outline]",
    category: "Support",
    frequency: 8,
  },
];

export const globalFrequencies = resourcesList.reduce(
  (acc, resource) => {
    acc[resource.url] = resource.frequency;
    return acc;
  },
  {} as Record<string, number>,
);
