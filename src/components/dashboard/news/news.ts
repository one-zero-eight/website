import type { ComponentType } from "react";
import BoardGamesEn from "./items/board-games.mdx";
import BoardGamesRu from "./items/board-games.ru.mdx";

export type NewsItem = {
  /** Unique and stable: used to remember that the user dismissed the item. */
  id: string;
  /** ISO date (YYYY-MM-DD). */
  date: string;
  /** Banner texts are not run through Lingui: write every locale here. `Body` is an MDX file from `items/`. */
  content: Record<
    "en" | "ru",
    { title: string; summary: string; Body: ComponentType }
  >;
};

/** The first item is shown in the dashboard banner: add new items to the top. */
export const NEWS: NewsItem[] = [
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
