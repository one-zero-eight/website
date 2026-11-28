import { CatLogo } from "@/components/icons/CatIcon";
import type { ComponentType, ReactNode } from "react";
import BoardGamesEn from "./items/board-games.mdx";
import BoardGamesRu from "./items/board-games.ru.mdx";
import CatixEn from "./items/catix.mdx";
import CatixRu from "./items/catix.ru.mdx";

export type NewsItem = {
  /** Unique and stable. */
  id: string;
  /** ISO date (YYYY-MM-DD). */
  date: string;
  /** Banner texts are not run through Lingui: write every locale here. `Body` is an MDX file from `items/`. */
  content: Record<
    "en" | "ru",
    { title: ReactNode; summary: string; Body: ComponentType }
  >;
};

/** Dashboard slider shows up to 5 newest fresh items, sorted by date. */
export const NEWS: NewsItem[] = [
  {
    id: "2026-11-catix",
    date: "2026-11-25",
    content: {
      en: {
        title: (
          <>
            Meet <CatLogo className="size-[1.2em] align-text-bottom" /> catix,
            the assistant for Innopolis!
          </>
        ),
        summary:
          "Ask about schedule, deadlines, clubs, events and rooms, and get answers with sources.",
        Body: CatixEn,
      },
      ru: {
        title: (
          <>
            Знакомьтесь, <CatLogo className="size-[1.2em] align-text-bottom" />{" "}
            catix — ассистент для Иннополиса!
          </>
        ),
        summary:
          "Спрашивайте про расписание, дедлайны, клубы, события и аудитории — ответы со ссылками на источники.",
        Body: CatixRu,
      },
    },
  },
  {
    id: "2026-11-board-games",
    date: "2026-11-19",
    content: {
      en: {
        title: "Board games are now on InNoHassle!",
        summary: "Browse and reserve games from Umar's Mafia club.",
        Body: BoardGamesEn,
      },
      ru: {
        title: "Настольные игры теперь в InNoHassle!",
        summary: "Смотрите каталог и бронируйте игры клуба Umar's Mafia.",
        Body: BoardGamesRu,
      },
    },
  },
];
