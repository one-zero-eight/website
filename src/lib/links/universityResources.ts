const universityResources = [
  {
    title: "Gradebook – My University",
    url: "https://my.university.innopolis.ru/profile/personal-form/index?tab=validations",
    description: "View your marks for all previous semesters.",
    icon: "material-symbols--assignment-outline", // Icon for grades/assignments
  },

  {
    title: "My University",
    url: "https://my.university.innopolis.ru/",
    description:
      "Request references, find out your grades, scholarship, fill the forms for internships.",
    icon: "ic--baseline-school", // Icon for university
  },
  {
    title: "Templates of applications",
    url: "https://my.university.innopolis.ru/profile/applications",
    description:
      "Access and download templates for various university applications.",

    icon: "material-symbols--article-outline", // Icon for templates/documents
  },
  {
    title: "Request references – My University",
    url: "https://my.university.innopolis.ru/profile/edu-certs/create",
    description: "Request a reference about studying or other things.",
    icon: "material-symbols--description-outline", // Icon for documents/references
  },
  {
    title: "Scholarship – My University",
    url: "https://my.university.innopolis.ru/profile/personal-form/index?tab=scholarship",
    description:
      "See how the scholarship is calculated for your current semester.",
    icon: "material-symbols--credit-card-outline", // Icon for money/scholarship
  },
  {
    title: "Scholarship calculator – InNoHassle",
    url: "https://innohassle.ru/scholarship",
    description: "Calculate your expected scholarship for the next semester.",
    icon: "material-symbols--calculate-outline", // Icon for calculator
  },
  {
    title: "Psychologist",
    url: "https://psychologist.innopolis.university/appointment/new",
    description:
      "Book an appointment with a psychologist by using this service.",
    icon: "material-symbols--psychology-outline", // Icon for psychology
  },
  {
    title: "Academic calendar – Eduwiki",
    url: "https://eduwiki.innopolis.university/index.php/AcademicCalendar",
    description:
      "View the official academic calendar with holidays and study days.",
    icon: "material-symbols--calendar-month-outline", // Icon for calendar
  },
  {
    title: "Study plan – Eduwiki",
    url: "https://eduwiki.innopolis.university/index.php/ALL:StudyPlan",
    description:
      "View the study plan with a documented amount of required studying hours.",
    icon: "material-symbols--book-outline", // Icon for study plan
  },
  {
    title: "Classes schedule – Eduwiki",
    url: "https://eduwiki.innopolis.university/index.php/All:Schedule",
    description: "View the official schedule of classes.",
    icon: "material-symbols--schedule-outline", // Icon for schedule
  },
  {
    title: "Schedule – InNoHassle",
    url: "https://innohassle.ru/schedule",
    description: "Conveniently view your schedule in the calendar.",
    icon: "material-symbols--today-outline", // Icon for calendar/schedule
  },
  {
    title: "Eduwiki",
    url: "https://eduwiki.innopolis.university/index.php/Main_Page",
    description: "View the official documents from DoE.",
    icon: "material-symbols--library-books-outline", // Icon for documents/wiki
  },
  {
    title: "Innopoints",
    url: "https://ipts.innopolis.university/",
    description:
      "Get bonus points for volunteering and get cool merch from InnoStore.",
    icon: "material-symbols--stars-outline", // Icon for points/rewards
  },
  {
    title: "Get innopoints",
    url: "https://ipts.innopolis.university/projects",
    description: "Earn innopoints by participating in projects and activities.",
    icon: "material-symbols--currency-ruble-rounded", // Icon for rewards
  },
  {
    title: "InnoStore",
    url: "https://ipts.innopolis.university/products",
    description:
      "Redeem your innopoints for cool merch and rewards at the InnoStore.",

    icon: "material-symbols--storefront-outline", // Icon for store
  },
  {
    title: "InnoDataHub",
    url: "https://booking-innodatahub.innopolis.university/",
    description: "Book powerful computing resources.",
    icon: "material-symbols--storage", // Icon for data/computing
  },
  {
    title: "Baam",
    url: "https://baam.tatar/s",
    description: "Collect attendance at events.",
    icon: "material-symbols--qr-code-scanner", // Icon for QR code/attendance
  },
  {
    title: "Collect attendance",
    url: "https://baam.tatar/AttendanceCheck",
    description: "Track and manage attendance for events and activities.",
    icon: "material-symbols--checklist", // Icon for attendance
  },
  {
    title: "Moodle",
    url: "https://moodle.innopolis.university/my/",
    description: "Access official course materials and tests.",
    icon: "material-symbols--menu-book-outline", // Icon for course materials
  },
  {
    title: "Dormitory website",
    url: "https://hotel.innopolis.university/studentaccommodation/",
    description:
      "Fill the service requests, view the cleaning schedule, and read accommodation rules.",
    icon: "material-symbols--home-outline", // Icon for dormitory
  },
  {
    title: "Dormitory information",
    url: "https://t.me/campus_info",
    description:
      "Get the latest updates and information about dormitory life and rules.",

    icon: "material-symbols--info-outline", // Icon for information
  },
  {
    title: "Service request",
    url: "https://hotel.innopolis.university/studentaccommodation/#block2944",
    description:
      "Submit requests for maintenance or services in your dormitory.",
    icon: "material-symbols--construction", // Icon for service requests
  },
  {
    title: "Student accommodation support",
    url: "https://t.me/Inno_dorm",
    description: "Get assistance and support for dormitory-related issues.",
    icon: "material-symbols--support-agent", // Icon for support
  },
  {
    title: "Hotel administration",
    url: "https://t.me/hoteluni",
    description:
      "Contact the hotel administration for official inquiries and concerns.",
    icon: "material-symbols--admin-panel-settings-outline", // Icon for administration
  },
  {
    title: "Campus life",
    url: "http://campuslife.innopolis.ru/",
    description:
      "Learn about student clubs, opportunities, events, and read the student handbook.",
    icon: "material-symbols--groups-outline", // Icon for campus life
  },
  {
    title: "Handbook",
    url: "http://campuslife.innopolis.ru/handbook2023",
    description:
      "Access the official student handbook for campus rules, policies, and guidelines.",
    icon: "material-symbols--menu-book-outline", // Icon for handbook
  },
  {
    title: "Clubs",
    url: "http://campuslife.innopolis.ru/clubs",
    description: "Explore and join student clubs and organizations on campus.",
    icon: "material-symbols--diversity-3", // Icon for clubs
  },
  {
    title: "Virtual machines",
    url: "https://vm.innopolis.university/",
    description: "Access free virtual machines.",
    icon: "material-symbols--computer-outline", // Icon for virtual machines
  },
  {
    title: "Library",
    url: "https://portal.university.innopolis.ru/reading_hall/",
    description:
      "Explore books available in the university library and reserve some of them.",
    icon: "material-symbols--local-library-outline", // Icon for library
  },
  {
    title: "Ski equipment",
    url: "https://portal.university.innopolis.ru/booking/index.php",
    description: "Book ski equipment for free.",
    icon: "material-symbols--downhill-skiing", // Icon for ski equipment
  },
  {
    title: "Sport classes",
    url: "https://sport.innopolis.university/profile/",
    description:
      "Check in for classes at the sport complex and track the number of sport hours.",
    icon: "material-symbols--sports-gymnastics", // Icon for sports
  },
  {
    title: "Sport bot – InNoHassle",
    url: "https://t.me/IUSportBot",
    description: "Conveniently check in for sports in Telegram.",
    icon: "material-symbols--sports-soccer", // Icon for sports bot
  },
  {
    title: "Music room – InNoHassle",
    url: "https://t.me/InnoMusicRoomBot",
    description: "Access the music room with musical equipment.",
    icon: "material-symbols--music-note", // Icon for music
  },
  {
    title: "Bus schedule and other city resources",
    url: "https://t.me/InnaHelpBot",
    description:
      "Quickly find any city organization and view the bus schedule.",
    icon: "material-symbols--directions-bus-outline", // Icon for bus schedule
  },
  {
    title: "Bus information",
    url: "https://t.me/innobus",
    description: "View news about the current bus location.",
    icon: "material-symbols--map-outline", // Icon for bus information
  },
  {
    title: "Chat with chats",
    url: "https://t.me/innolinks",
    description: "Explore links to many Telegram channels and chats.",
    icon: "material-symbols--chat-outline", // Icon for chats
  },
  {
    title: "Maps – InNoHassle",
    url: "https://innohassle.ru/maps",
    description: "Find any place in Innopolis.",
    icon: "material-symbols--map-outline", // Icon for maps
  },
  {
    title: "Dorms bot – InNoHassle",
    url: "https://t.me/IURoomsBot",
    description:
      "Manage your dormitory room and split duties with your roommates.",
    icon: "material-symbols--home-work-outline", // Icon for dorms
  },
  {
    title: "Browser extension – InNoHassle",
    url: "https://innohassle.ru/extension",
    description:
      "Install browser extension for auto-login to Moodle and quick links.",
    icon: "material-symbols--extension-outline", // Icon for browser extension
  },
  {
    title: "IT support",
    url: "https://it.innopolis.university",
    description: "Fill the tickets for the IT department.",
    icon: "material-symbols--computer-outline", // Icon for IT support
  },
  {
    title: "Telegram contact for urgent messages",
    url: "https://t.me/iuithelp",
    description: "Reach out for urgent assistance or inquiries via Telegram.",

    icon: "material-symbols--contact-support-outline", // Icon for support
  },
  {
    title: "Outlook Mail",
    url: "https://mail.innopolis.ru",
    description: "Official corporate email service.",
    icon: "material-symbols--mail-outline", // Icon for email
  },
  {
    title: "Calendar",
    url: "https://mail.innopolis.ru/owa/#path=/calendar",
    description:
      "Access and manage your university schedule, events, and deadlines.",

    icon: "material-symbols--calendar-month-outline", // Icon for calendar
  },
  {
    title: "Course image generator",
    url: "https://t.me/IU_cigen_bot",
    description:
      "Quickly generate an image for your course chats and channels.",
    icon: "material-symbols--image-outline", // Icon for image generator
  },
];

export default universityResources;
