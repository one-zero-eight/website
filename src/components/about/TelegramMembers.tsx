import { useTelegramMembers } from "./hooks/useTelegramMembers";
import { useState } from "react";

// Функция для генерации случайного цвета на основе имени пользователя
const getRandomColor = (name: string) => {
  const colors = [
    "bg-red-500",
    "bg-blue-500",
    "bg-green-500",
    "bg-yellow-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-indigo-500",
    "bg-teal-500",
    "bg-orange-500",
    "bg-cyan-500",
    "bg-lime-500",
    "bg-emerald-500",
    "bg-violet-500",
    "bg-fuchsia-500",
    "bg-rose-500",
    "bg-sky-500",
  ];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
};

const getInitials = (username?: string) => {
  const name = username || "";
  if (name.length >= 2) {
    return name.substring(0, 2).toUpperCase();
  }
  return name.charAt(0).toUpperCase();
};

export const TelegramMembers = () => {
  const {
    data: telegramMembers,
    isLoading: isLoadingMembers,
    error: membersError,
  } = useTelegramMembers();

  const Avatar = ({
    member,
  }: {
    member: { username: string; avatar_url: string };
  }) => {
    const [imageError, setImageError] = useState(false);
    const initials = getInitials(member.username);
    const bgColor = getRandomColor(member.username);

    if (imageError) {
      return (
        <div
          className={`mb-2 flex h-12 w-12 items-center justify-center rounded-full border-2 border-blue-200 text-sm font-bold text-white dark:border-blue-600 ${bgColor}`}
        >
          {initials}
        </div>
      );
    }

    return (
      <img
        src={member.avatar_url}
        alt={member.username}
        className="mb-2 h-12 w-12 rounded-full border-2 border-blue-200 object-cover dark:border-blue-600"
        loading="lazy"
        onError={() => setImageError(true)}
      />
    );
  };

  if (isLoadingMembers) {
    return (
      <div className="dark:bg-base-200 mt-8 rounded-lg bg-gray-100 p-4">
        <div className="flex items-center gap-4">
          <div className="flex animate-pulse gap-4">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-12 w-12 rounded-full bg-gray-300 dark:bg-gray-600"
              ></div>
            ))}
          </div>
          <span className="text-gray-500 dark:text-gray-400">
            Loading Telegram members...
          </span>
        </div>
      </div>
    );
  }

  if (membersError) {
    return (
      <div className="mt-8 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
        <p className="text-red-600 dark:text-red-400">
          Unable to load Telegram members. Please try again later.
        </p>
      </div>
    );
  }

  if (!telegramMembers || telegramMembers.length === 0) {
    return (
      <div className="dark:bg-base-100 mt-8 rounded-lg bg-gray-100 p-4">
        <p className="text-center text-gray-500 dark:text-gray-400">
          No Telegram members found.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 rounded-lg p-4">
      <div className="flex flex-wrap justify-center gap-4">
        {telegramMembers.map((member, index) => (
          <a
            key={member.id}
            href={`https://t.me/${member.username}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`animate-in slide-in-from-bottom-4 dark:bg-base-200 flex flex-col items-center rounded-lg bg-blue-50 p-3 shadow-sm transition-all duration-200 hover:scale-105 hover:shadow-md delay-${100 + index * 50} hover:bg-blue-100 dark:hover:bg-blue-800/20`}
          >
            <Avatar member={member} />
            <span className="text-center text-sm font-medium text-gray-900 dark:text-gray-100">
              @{member.username}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
};
