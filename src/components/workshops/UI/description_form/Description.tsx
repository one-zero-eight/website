import React from "react";
import { useNavigate } from "@tanstack/react-router";

type Workshop = {
  id: string;
  title: string;
  body: string;
  date: string;
  startTime: string;
  endTime: string;
  room: string;
  remainPlaces?: number; // Добавляем поле для оставшихся мест
};

interface WorkshopProps {
  workshop: Workshop | null;
}
const formatDate = (dateString: string) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("ru-RU");
};
const formatTime = (timeString: string) => {
  if (!timeString) return "";
  return timeString;
};
const urlRegex = /https?:\/\/(.\.?)+\..+/;
const telegramUsernameRegex = /(^|\s)@[a-zA-Z0-9_]{5,32}\b/;

const ReplaceURL = (str: string) => {
  const texts = str.split(" ").reduce(
    (acc: { array: string[]; urls: string[]; text: string }, text) => {
      if (urlRegex.test(text) || telegramUsernameRegex.test(text)) {
        acc.array.push(acc.text);
        acc.urls.push(text);
        acc.text = " ";

        return acc;
      }

      acc.text += `${text} `;

      return acc;
    },
    { array: [], urls: [], text: "" },
  );

  if (texts.text) texts.array.push(texts.text);
  const links = texts.urls.map((url) => {
    if (telegramUsernameRegex.test(url)) {
      return (
        <a
          className="text-brand-violet transition-all duration-200 hover:scale-110 hover:text-brand-violet/80"
          href={"https://t.me/" + url.slice(1)}
          target="_blank"
          rel="noopener noreferrer"
          key={url}
        >
          {url}
        </a>
      );
    } else {
      return (
        <a
          className="text-brand-violet transition-all duration-200 hover:scale-110 hover:text-brand-violet/80"
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          key={url}
        >
          {url}
        </a>
      );
    }
  });

  const merged = [];

  for (let i = 0; i < texts.array.length; i += 1) {
    merged.push(texts.array[i]);
    if (links[i]) merged.push(links[i]);
  }

  return merged;
};
const Description: React.FC<WorkshopProps> = ({ workshop }) => {
  const navigate = useNavigate();
  
  const handleRoomClick = (e: React.MouseEvent<HTMLSpanElement>) => {
    e.stopPropagation();
    if (workshop?.room) {
      navigate({
        to: "/maps",
        search: { q: workshop.room },
      });
    }
  };
  
  if (!workshop) return <div>No description</div>;
  return (
    <div className="flex flex-col p-5 text-contrast">
      <p className="mb-1.5 text-lg">{ReplaceURL(workshop.body)}</p>
      <div className="flex flex-row items-center gap-2 text-xl text-contrast/75">
        <div className="flex h-fit w-6">
          <span className="icon-[material-symbols--location-on-outline] text-2xl" />
        </div>
        <p className="flex w-full items-center whitespace-pre-wrap py-1 [overflow-wrap:anywhere]">
          <span
            onClick={handleRoomClick}
            className="cursor-pointer text-brand-violet underline hover:text-brand-violet/80"
            title="Click to view on map"
          >
            {workshop.room}
          </span>
        </p>
      </div>
      <div className="flex flex-row items-center gap-2 text-xl text-contrast/75">
        <div className="flex h-fit w-6">
          <span className="icon-[material-symbols--today-outline] text-2xl" />
        </div>
        <p className="flex w-full items-center whitespace-pre-wrap py-1 [overflow-wrap:anywhere]">
          {formatDate(workshop.date)}
        </p>
      </div>
      <div className="flex flex-row items-center gap-2 text-xl text-contrast/75">
        <div className="flex h-fit w-6">
          <span className="icon-[material-symbols--schedule-outline] text-2xl" />
        </div>
        {formatTime(workshop.startTime) + "-" + formatTime(workshop.endTime)}
      </div>
    </div>
  );
};

export default Description;
