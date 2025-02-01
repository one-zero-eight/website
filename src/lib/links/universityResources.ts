const universityResources = [
  {
    title: "My University",
    url: "https://my.university.innopolis.ru/",
    description:
      "Request references, find out your grades, scholarship, fill the forms for internships.",
    icon: "icon-[ic--baseline-school]",
    category: "Academic",
  },
  {
    title: "Gradebook – My University",
    url: "https://my.university.innopolis.ru/profile/personal-form/index?tab=validations",
    description: "View your marks for all previous semesters.",
    icon: "icon-[material-symbols--assignment-outline]",
    category: "Academic",
  },
  {
    title: "Request references – My University",
    url: "https://my.university.innopolis.ru/profile/edu-certs/create",
    description: "Request a reference about studying or other things.",
    icon: "icon-[material-symbols--description-outline]",
    category: "Academic",
  },
  {
    title: "Scholarship – My University",
    url: "https://my.university.innopolis.ru/profile/personal-form/index?tab=scholarship",
    description:
      "See how the scholarship is calculated for your current semester in My University.",
    icon: "icon-[material-symbols--credit-card-outline]",
    category: "Financial",
  },
  {
    title: "Templates of applications – My University",
    url: "https://my.university.innopolis.ru/profile/applications",
    description:
      "Access and download templates for various university applications.",
    icon: "icon-[material-symbols--article-outline]",
    category: "Academic",
  },
  {
    title: "Scholarship calculator - InNoHassle",
    url: "https://innohassle.ru/scholarship",
    description:
      "Calculate your expected scholarship for the next semester in InNoHassle.",
    icon: "icon-[material-symbols--calculate-outline]",
    category: "Financial",
  },
  {
    title: "Psychologist",
    url: "https://psychologist.innopolis.university/appointment/new",
    description:
      "Book an appointment with a psychologist by using this service.",
    icon: "icon-[material-symbols--psychology-outline]",
    category: "Support",
  },
  {
    title: "Eduwiki",
    url: "https://eduwiki.innopolis.university/index.php/Main_Page",
    description: "View the official documents from DoE.",
    icon: "icon-[material-symbols--library-books-outline]",
    category: "Academic",
  },
  {
    title: "Academic calendar – Eduwiki",
    url: "https://eduwiki.innopolis.university/index.php/AcademicCalendar",
    description:
      "View the official academic calendar with holidays and study days.",
    icon: "icon-[material-symbols--calendar-month-outline]",
    category: "Academic",
  },
  {
    title: "Study plan – Eduwiki",
    url: "https://eduwiki.innopolis.university/index.php/ALL:StudyPlan",
    description:
      "View the study plan with a documented amount of required studying hours.",
    icon: "icon-[material-symbols--book-outline]",
    category: "Academic",
  },
  {
    title: "Schedule – Eduwiki",
    url: "https://eduwiki.innopolis.university/index.php/All:Schedule",
    description: "View the official schedule of classes.",
    icon: "icon-[material-symbols--schedule-outline]",
    category: "Academic",
  },
  {
    title: "Schedule – InNoHassle",
    url: "https://innohassle.ru/schedule",
    description: "Conveniently view your schedule in the calendar.",
    icon: "icon-[material-symbols--today-outline]",
    category: "Academic",
  },
  {
    title: "Innopoints",
    url: "https://ipts.innopolis.university/",
    description:
      "Get bonus points for volunteering and get cool merch from InnoStore.",
    icon: "icon-[material-symbols--stars-outline]",
    category: "Extracurricular",
  },
  {
    title: "Get innopoints",
    url: "https://ipts.innopolis.university/projects",
    description: "Earn innopoints by participating in projects and activities.",
    icon: "icon-[material-symbols--currency-ruble-rounded]",
    category: "Extracurricular",
  },
  {
    title: "InnoStore",
    url: "https://ipts.innopolis.university/products",
    description:
      "Redeem your innopoints for cool merch and rewards at the InnoStore.",
    icon: "icon-[material-symbols--storefront-outline]",
    category: "Extracurricular",
  },
  {
    title: "InnoDataHub",
    url: "https://booking-innodatahub.innopolis.university/",
    description: "Book powerful computing resources.",
    icon: "icon-[material-symbols--storage]",
    category: "Technical",
  },
  {
    title: "Baam",
    url: "https://baam.tatar/s",
    description: "Collect attendance at events.",
    icon: "icon-[material-symbols--qr-code-scanner]",
    category: "Extracurricular",
  },
  {
    title: "Collect attendance - Baam",
    url: "https://baam.tatar/AttendanceCheck",
    description: "Track and manage attendance for events and activities.",
    icon: "icon-[material-symbols--checklist]",
    category: "Extracurricular",
  },
  {
    title: "Moodle",
    url: "https://moodle.innopolis.university/my/",
    description: "Access official course materials and tests.",
    icon: "icon-[material-symbols--menu-book-outline]",
    category: "Academic",
  },
  {
    title: "Dormitory website",
    url: "https://hotel.innopolis.university/studentaccommodation/",
    description:
      "Fill the service requests, view the cleaning schedule, and read accommodation rules.",
    icon: "icon-[material-symbols--home-outline]",
    category: "Housing",
  },
  {
    title: "Service request in dormitory",
    url: "https://hotel.innopolis.university/studentaccommodation/#block2944",
    description:
      "Submit requests for maintenance or services in your dormitory.",
    icon: "icon-[material-symbols--construction]",
    category: "Housing",
  },
  {
    title: "Dormitory information channel",
    url: "https://t.me/campus_info",
    description:
      "Get the latest updates and information about dormitory life and rules.",
    icon: "icon-[material-symbols--info-outline]",
    category: "Housing",
  },
  {
    title: "Student dormitory support",
    url: "https://t.me/Inno_dorm",
    description: "Get assistance and support for dormitory-related issues.",
    icon: "icon-[material-symbols--support-agent]",
    category: "Housing",
  },
  {
    title: "Dormitory administration",
    url: "https://t.me/hoteluni",
    description:
      "Contact the hotel administration for official inquiries and concerns.",
    icon: "icon-[material-symbols--admin-panel-settings-outline]",
    category: "Housing",
  },
  {
    title: "Campus life",
    url: "http://campuslife.innopolis.ru/",
    description:
      "Learn about student clubs, opportunities, events, and read the student handbook.",
    icon: "icon-[material-symbols--groups-outline]",
    category: "Extracurricular",
  },
  {
    title: "Handbook - Campus life",
    url: "http://campuslife.innopolis.ru/handbook2023",
    description:
      "Access the official student handbook for campus rules, policies, and guidelines.",
    icon: "icon-[material-symbols--menu-book-outline]",
    category: "Extracurricular",
  },
  {
    title: "Clubs - Campus life",
    url: "http://campuslife.innopolis.ru/clubs",
    description: "Explore and join student clubs and organizations on campus.",
    icon: "icon-[material-symbols--diversity-3]",
    category: "Extracurricular",
  },
  {
    title: "Virtual machines",
    url: "https://vm.innopolis.university/",
    description: "Access free virtual machines.",
    icon: "icon-[material-symbols--computer-outline]",
    category: "Technical",
  },
  {
    title: "Library",
    url: "https://portal.university.innopolis.ru/reading_hall/",
    description:
      "Explore books available in the university library and reserve some of them.",
    icon: "icon-[material-symbols--local-library-outline]",
    category: "Academic",
  },
  {
    title: "Ski equipment",
    url: "https://portal.university.innopolis.ru/booking/index.php",
    description: "Book ski equipment for free.",
    icon: "icon-[material-symbols--downhill-skiing]",
    category: "Extracurricular",
  },
  {
    title: "Sport classes",
    url: "https://sport.innopolis.university/profile/",
    description:
      "Check in for classes at the sport complex and track the number of sport hours.",
    icon: "icon-[material-symbols--sports-gymnastics]",
    category: "Extracurricular",
  },
  {
    title: "Sport bot – InNoHassle",
    url: "https://t.me/IUSportBot",
    description: "Conveniently check in for sports in Telegram.",
    icon: "icon-[material-symbols--sports-soccer]",
    category: "Extracurricular",
  },
  {
    title: "Music room – InNoHassle",
    url: "https://t.me/InnoMusicRoomBot",
    description: "Access the music room with musical equipment.",
    icon: "icon-[material-symbols--music-note]",
    category: "Extracurricular",
  },
  {
    title: "Bus schedule",
    url: "https://t.me/InnaHelpBot",
    description:
      "Quickly find any city organization and view the bus schedule via Inna bot.",
    icon: "icon-[material-symbols--directions-bus-outline]",
    category: "Transport",
  },
  {
    title: "Bus information channel",
    url: "https://t.me/innobus",
    description: "View news about the current bus location.",
    icon: "icon-[material-symbols--map-outline]",
    category: "Transport",
  },
  {
    title: "Chat with chats",
    url: "https://t.me/innolinks",
    description: "Explore links to many Telegram channels and chats.",
    icon: "icon-[material-symbols--chat-outline]",
    category: "Communication",
  },
  {
    title: "Maps – InNoHassle",
    url: "https://innohassle.ru/maps",
    description: "Find any place in Innopolis.",
    icon: "icon-[material-symbols--map-outline]",
    category: "Navigation",
  },
  {
    title: "Dorms bot – InNoHassle",
    url: "https://t.me/IURoomsBot",
    description:
      "Manage your dormitory room and split duties with your roommates.",
    icon: "icon-[material-symbols--home-work-outline]",
    category: "Housing",
  },
  {
    title: "Browser extension – InNoHassle",
    url: "https://innohassle.ru/extension",
    description:
      "Install browser extension for auto-login to Moodle and quick links.",
    icon: "icon-[material-symbols--extension-outline]",
    category: "Technical",
  },
  {
    title: "IT support",
    url: "https://it.innopolis.university",
    description: "Fill the tickets for the IT department.",
    icon: "icon-[material-symbols--computer-outline]",
    category: "Technical",
  },
  {
    title: "Contact for urgent messages - IT support",
    url: "https://t.me/iuithelp",
    description: "Reach out for urgent assistance or inquiries via Telegram.",
    icon: "icon-[material-symbols--contact-support-outline]",
    category: "Support",
  },
  {
    title: "Outlook Mail",
    url: "https://mail.innopolis.ru",
    description: "Official corporate email service.",
    icon: "icon-[material-symbols--mail-outline]",
    category: "Communication",
  },
  {
    title: "Outlook Calendar",
    url: "https://mail.innopolis.ru/owa/#path=/calendar",
    description:
      "Access and manage your university schedule, events, and deadlines.",
    icon: "icon-[material-symbols--calendar-month-outline]",
    category: "Academic",
  },
  {
    title: "Course image generator",
    url: "https://t.me/IU_cigen_bot",
    description:
      "Quickly generate an image for your course chats and channels.",
    icon: "icon-[material-symbols--image-outline]",
    category: "Technical",
  },
];

export default universityResources;
