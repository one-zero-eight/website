import React from "react";
import "./Description.css";

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
          className="links"
          href={"https://t.me/" + url.slice(1)}
          target="_blank"
          key={url}
        >
          {url}
        </a>
      );
    } else {
      return (
        <a className="links" href={url} target="_blank" key={url}>
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
  if (!workshop) return <div>No description</div>;

  return (
    <div className="description-content">
      <h2 className="description-title">{workshop.title}</h2>
      <p style={{ marginBottom: "5px" }}>{ReplaceURL(workshop.body)}</p>
      <div className="flex flex-row items-center gap-2 text-xl text-contrast/75">
        <div className="flex h-fit w-6">
          <span className="icon-[material-symbols--location-on-outline] text-2xl" />
        </div>
        <p className="flex w-full items-center whitespace-pre-wrap py-1 [overflow-wrap:anywhere]">
          {workshop.room}
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
