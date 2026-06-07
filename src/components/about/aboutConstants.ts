export const aboutHeadingClass =
  "text-3xl font-bold text-black sm:text-4xl dark:text-white";

export const linkClass = "text-primary hover:underline";

export const aboutButtonClass =
  "btn gap-2 border-2 border-gray-200 bg-white text-gray-900 shadow-sm hover:border-gray-300 hover:bg-gray-50 dark:border-base-100 dark:bg-base-200 dark:text-gray-100 dark:hover:bg-base-300";

export const aboutStackedButtonClass = `${aboutButtonClass} flex w-full items-center justify-start`;

export const departments = [
  {
    title: "Development",
    description: "we write code and maintain products",
    icon: "icon-[mdi--code-tags]",
  },
  {
    title: "Design",
    description: "we create presentations, post illustrations, and merch",
    icon: "icon-[mdi--palette-outline]",
  },
  {
    title: "Management",
    description: "we manage the team and choose the community direction",
    icon: "icon-[mdi--account-group-outline]",
  },
];
