import { cn } from "@/lib/ui/cn";
import { useMemo, useState, useEffect } from "react";

type PlayerEntry = {
  place: number;
  name: string;
  rating: number;
  status: "beginner" | "advanced";
  visible: boolean;
};

type SortKey = "name" | "rating";
type SortDir = "asc" | "desc";

type Filters = {
  status: "all" | "beginner" | "advanced";
  ratingMin: number;
  ratingMax: number;
  nameSearch: string;
  showHidden: boolean;
  sortKey: SortKey;
  sortDir: SortDir;
};

const mockPlayers: PlayerEntry[] = [
  {
    place: 1,
    name: "Ivan Petrov",
    rating: 1500,
    status: "advanced",
    visible: true,
  },
  {
    place: 2,
    name: "Maria Sidorova",
    rating: 1420,
    status: "advanced",
    visible: true,
  },
  {
    place: 3,
    name: "Alexey Smirnov",
    rating: 1350,
    status: "advanced",
    visible: true,
  },
  {
    place: 4,
    name: "Elena Kuznetsova",
    rating: 1280,
    status: "advanced",
    visible: true,
  },
  {
    place: 5,
    name: "Dmitry Ivanov",
    rating: 1240,
    status: "advanced",
    visible: false,
  },
  {
    place: 6,
    name: "Olga Popova",
    rating: 1180,
    status: "advanced",
    visible: true,
  },
  {
    place: 7,
    name: "Sergey Vasiliev",
    rating: 1120,
    status: "beginner",
    visible: true,
  },
  {
    place: 8,
    name: "Anna Novikova",
    rating: 1080,
    status: "beginner",
    visible: true,
  },
  {
    place: 9,
    name: "Mikhail Fedorov",
    rating: 1050,
    status: "beginner",
    visible: true,
  },
  {
    place: 10,
    name: "Tatiana Morozova",
    rating: 1020,
    status: "beginner",
    visible: true,
  },
  {
    place: 11,
    name: "Andrey Volkov",
    rating: 980,
    status: "beginner",
    visible: true,
  },
  {
    place: 12,
    name: "Natalia Pavlova",
    rating: 950,
    status: "beginner",
    visible: false,
  },
  {
    place: 13,
    name: "Viktor Semenov",
    rating: 920,
    status: "beginner",
    visible: true,
  },
  {
    place: 14,
    name: "Irina Zaitseva",
    rating: 880,
    status: "beginner",
    visible: true,
  },
  {
    place: 15,
    name: "Pavel Mikhailov",
    rating: 850,
    status: "beginner",
    visible: true,
  },
  {
    place: 16,
    name: "Ekaterina Belova",
    rating: 820,
    status: "beginner",
    visible: true,
  },
  {
    place: 17,
    name: "Roman Gusev",
    rating: 780,
    status: "beginner",
    visible: true,
  },
  {
    place: 18,
    name: "Svetlana Titova",
    rating: 750,
    status: "beginner",
    visible: false,
  },
  {
    place: 19,
    name: "Denis Sorokin",
    rating: 720,
    status: "beginner",
    visible: true,
  },
  {
    place: 20,
    name: "Yulia Krylova",
    rating: 680,
    status: "beginner",
    visible: true,
  },
  {
    place: 21,
    name: "Artem Kozlov",
    rating: 990,
    status: "beginner",
    visible: true,
  },
  {
    place: 22,
    name: "Daria Fomina",
    rating: 1030,
    status: "beginner",
    visible: true,
  },
  {
    place: 23,
    name: "Nikita Orlov",
    rating: 1150,
    status: "advanced",
    visible: true,
  },
  {
    place: 24,
    name: "Polina Grigorieva",
    rating: 890,
    status: "beginner",
    visible: false,
  },
  {
    place: 25,
    name: "Maxim Lebedev",
    rating: 1070,
    status: "beginner",
    visible: true,
  },
  {
    place: 26,
    name: "Alina Nikolaeva",
    rating: 1210,
    status: "advanced",
    visible: true,
  },
  {
    place: 27,
    name: "Gleb Solovyov",
    rating: 940,
    status: "beginner",
    visible: true,
  },
  {
    place: 28,
    name: "Veronika Zakharova",
    rating: 1110,
    status: "advanced",
    visible: true,
  },
  {
    place: 29,
    name: "Timur Morozov",
    rating: 870,
    status: "beginner",
    visible: true,
  },
  {
    place: 30,
    name: "Ksenia Belyaeva",
    rating: 1000,
    status: "beginner",
    visible: false,
  },
  {
    place: 31,
    name: "Vladimir Kovalev",
    rating: 1190,
    status: "advanced",
    visible: true,
  },
  {
    place: 32,
    name: "Anastasia Sokolova",
    rating: 960,
    status: "beginner",
    visible: true,
  },
  {
    place: 33,
    name: "Egor Petukhov",
    rating: 770,
    status: "beginner",
    visible: true,
  },
  {
    place: 34,
    name: "Sofia Rybakova",
    rating: 1140,
    status: "advanced",
    visible: true,
  },
  {
    place: 35,
    name: "Boris Chernov",
    rating: 860,
    status: "beginner",
    visible: false,
  },
  {
    place: 36,
    name: "Margarita Frolova",
    rating: 1220,
    status: "advanced",
    visible: true,
  },
  {
    place: 37,
    name: "Daniil Kiselev",
    rating: 910,
    status: "beginner",
    visible: true,
  },
  {
    place: 38,
    name: "Evgenia Ponomareva",
    rating: 1040,
    status: "beginner",
    visible: true,
  },
  {
    place: 39,
    name: "Yaroslav Loginov",
    rating: 1170,
    status: "advanced",
    visible: true,
  },
  {
    place: 40,
    name: "Ulyana Kozlova",
    rating: 930,
    status: "beginner",
    visible: true,
  },
  {
    place: 41,
    name: "Konstantin Baranov",
    rating: 810,
    status: "beginner",
    visible: true,
  },
  {
    place: 42,
    name: "Lilia Sergeeva",
    rating: 1060,
    status: "beginner",
    visible: false,
  },
  {
    place: 43,
    name: "Stepan Vorobyov",
    rating: 1230,
    status: "advanced",
    visible: true,
  },
  {
    place: 44,
    name: "Zlata Egorova",
    rating: 760,
    status: "beginner",
    visible: true,
  },
  {
    place: 45,
    name: "Filipp Sorokin",
    rating: 1090,
    status: "beginner",
    visible: true,
  },
  {
    place: 46,
    name: "Varvara Timofeeva",
    rating: 1160,
    status: "advanced",
    visible: true,
  },
  {
    place: 47,
    name: "Petr Grigoriev",
    rating: 840,
    status: "beginner",
    visible: true,
  },
  {
    place: 48,
    name: "Kira Zhukova",
    rating: 1100,
    status: "advanced",
    visible: false,
  },
  {
    place: 49,
    name: "Makar Lazarev",
    rating: 900,
    status: "beginner",
    visible: true,
  },
  {
    place: 50,
    name: "Vladislava Kuzmina",
    rating: 1250,
    status: "advanced",
    visible: true,
  },
  {
    place: 51,
    name: "Ilya Borisov",
    rating: 790,
    status: "beginner",
    visible: true,
  },
  {
    place: 52,
    name: "Olesya Makarova",
    rating: 1010,
    status: "beginner",
    visible: true,
  },
  {
    place: 53,
    name: "Grigory Shevchenko",
    rating: 1200,
    status: "advanced",
    visible: true,
  },
  {
    place: 54,
    name: "Lada Zaitseva",
    rating: 880,
    status: "beginner",
    visible: true,
  },
  {
    place: 55,
    name: "Vsevolod Markov",
    rating: 1130,
    status: "advanced",
    visible: false,
  },
  {
    place: 56,
    name: "Tamara Pavlova",
    rating: 970,
    status: "beginner",
    visible: true,
  },
  {
    place: 57,
    name: "Valentin Kuznetsov",
    rating: 740,
    status: "beginner",
    visible: true,
  },
  {
    place: 58,
    name: "Raisa Vinogradova",
    rating: 1080,
    status: "beginner",
    visible: true,
  },
  {
    place: 59,
    name: "German Tarasov",
    rating: 1180,
    status: "advanced",
    visible: true,
  },
  {
    place: 60,
    name: "Regina Fedoseeva",
    rating: 700,
    status: "beginner",
    visible: false,
  },
  {
    place: 61,
    name: "Arkady Yakovlev",
    rating: 1270,
    status: "advanced",
    visible: true,
  },
  {
    place: 62,
    name: "Maya Voronova",
    rating: 850,
    status: "beginner",
    visible: true,
  },
  {
    place: 63,
    name: "Rostislav Belov",
    rating: 1050,
    status: "beginner",
    visible: true,
  },
  {
    place: 64,
    name: "Elizaveta Medvedeva",
    rating: 1140,
    status: "advanced",
    visible: true,
  },
  {
    place: 65,
    name: "Savely Alekseev",
    rating: 830,
    status: "beginner",
    visible: true,
  },
  {
    place: 66,
    name: "Vasilisa Andreeva",
    rating: 1000,
    status: "beginner",
    visible: false,
  },
  {
    place: 67,
    name: "Platon Korolev",
    rating: 1210,
    status: "advanced",
    visible: true,
  },
  {
    place: 68,
    name: "Milana Nikitina",
    rating: 910,
    status: "beginner",
    visible: true,
  },
  {
    place: 69,
    name: "Anton Karpov",
    rating: 730,
    status: "beginner",
    visible: true,
  },
  {
    place: 70,
    name: "Alevtina Sazonova",
    rating: 1090,
    status: "beginner",
    visible: true,
  },
  {
    place: 71,
    name: "Leonid Komarov",
    rating: 1260,
    status: "advanced",
    visible: true,
  },
  {
    place: 72,
    name: "Agata Golubeva",
    rating: 890,
    status: "beginner",
    visible: true,
  },
  {
    place: 73,
    name: "Miron Fadeev",
    rating: 700,
    status: "beginner",
    visible: true,
  },
  {
    place: 74,
    name: "Karina Kalinina",
    rating: 1030,
    status: "beginner",
    visible: false,
  },
  {
    place: 75,
    name: "Vitaly Pavlov",
    rating: 1150,
    status: "advanced",
    visible: true,
  },
  {
    place: 76,
    name: "Diana Rodionova",
    rating: 950,
    status: "beginner",
    visible: true,
  },
  {
    place: 77,
    name: "Luka Gorshkov",
    rating: 810,
    status: "beginner",
    visible: true,
  },
  {
    place: 78,
    name: "Nina Danilova",
    rating: 1070,
    status: "beginner",
    visible: true,
  },
  {
    place: 79,
    name: "Evdokim Melnikov",
    rating: 1200,
    status: "advanced",
    visible: false,
  },
  {
    place: 80,
    name: "Larisa Denisova",
    rating: 860,
    status: "beginner",
    visible: true,
  },
  {
    place: 81,
    name: "Semyon Kolesnikov",
    rating: 1110,
    status: "advanced",
    visible: true,
  },
  {
    place: 82,
    name: "Eleonora Gerasimova",
    rating: 780,
    status: "beginner",
    visible: true,
  },
  {
    place: 83,
    name: "Ignat Volodin",
    rating: 980,
    status: "beginner",
    visible: true,
  },
  {
    place: 84,
    name: "Emma Prokhorova",
    rating: 1120,
    status: "advanced",
    visible: false,
  },
  {
    place: 85,
    name: "Demyan Stepanov",
    rating: 940,
    status: "beginner",
    visible: true,
  },
  {
    place: 86,
    name: "Vera Filippova",
    rating: 1060,
    status: "beginner",
    visible: true,
  },
  {
    place: 87,
    name: "Modest Rumyantsev",
    rating: 1170,
    status: "advanced",
    visible: true,
  },
  {
    place: 88,
    name: "Inna Soboleva",
    rating: 820,
    status: "beginner",
    visible: true,
  },
  {
    place: 89,
    name: "Kuzma Tikhomirov",
    rating: 1010,
    status: "beginner",
    visible: true,
  },
  {
    place: 90,
    name: "Eva Mironova",
    rating: 1190,
    status: "advanced",
    visible: true,
  },
  {
    place: 91,
    name: "Akim Guryanov",
    rating: 870,
    status: "beginner",
    visible: false,
  },
  {
    place: 92,
    name: "Praskovya Filippova",
    rating: 1040,
    status: "beginner",
    visible: true,
  },
  {
    place: 93,
    name: "Evstafy Ermakov",
    rating: 1220,
    status: "advanced",
    visible: true,
  },
  {
    place: 94,
    name: "Klavdia Veselova",
    rating: 760,
    status: "beginner",
    visible: true,
  },
  {
    place: 95,
    name: "Venedikt Zubov",
    rating: 1100,
    status: "advanced",
    visible: true,
  },
  {
    place: 96,
    name: "Kapitolina Sysoeva",
    rating: 920,
    status: "beginner",
    visible: false,
  },
  {
    place: 97,
    name: "Nazar Artemyev",
    rating: 1130,
    status: "advanced",
    visible: true,
  },
  {
    place: 98,
    name: "Feodora Lazareva",
    rating: 840,
    status: "beginner",
    visible: true,
  },
  {
    place: 99,
    name: "Prokhor Nikonov",
    rating: 1050,
    status: "beginner",
    visible: true,
  },
  {
    place: 100,
    name: "Avdotya Samsonova",
    rating: 1160,
    status: "advanced",
    visible: true,
  },
];

function SortArrow({
  sortKey,
  activeSortKey,
  sortDir,
}: {
  sortKey: SortKey;
  activeSortKey: SortKey;
  sortDir: SortDir;
}) {
  if (activeSortKey !== sortKey)
    return <span className="text-base-content/30 ml-1">↑</span>;
  return <span className="ml-1">{sortDir === "desc" ? "↓" : "↑"}</span>;
}

const INITIAL_FILTERS: Filters = {
  status: "all",
  ratingMin: 0,
  ratingMax: 9999,
  nameSearch: "",
  showHidden: false,
  sortKey: "rating",
  sortDir: "desc",
};

export function TabletennisPlayersTop() {
  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);
  const [debounced, setDebounced] = useState<Filters>(INITIAL_FILTERS);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(filters), 200);
    return () => clearTimeout(timer);
  }, [filters]);

  const [visibleCount, setVisibleCount] = useState(20);

  useEffect(() => {
    setVisibleCount(20);
  }, [debounced]);

  const results = useMemo(() => {
    const filtered = mockPlayers
      .filter((p) => debounced.showHidden || p.visible)
      .filter(
        (p) => debounced.status === "all" || p.status === debounced.status,
      )
      .filter(
        (p) =>
          p.rating >= debounced.ratingMin && p.rating <= debounced.ratingMax,
      )
      .filter((p) =>
        p.name.toLowerCase().includes(debounced.nameSearch.toLowerCase()),
      );

    const sorted = [...filtered].sort((a, b) => {
      const mul = debounced.sortDir === "asc" ? 1 : -1;
      return debounced.sortKey === "name"
        ? a.name.localeCompare(b.name) * mul
        : (a.rating - b.rating) * mul;
    });

    return sorted;
  }, [debounced]);

  const visibleResults = results.slice(0, visibleCount);

  function toggleSort(key: SortKey) {
    setFilters((prev) => ({
      ...prev,
      sortKey: key,
      sortDir: prev.sortKey === key && prev.sortDir === "desc" ? "asc" : "desc",
    }));
  }

  return (
    <div className="mx-5 my-4 flex flex-col gap-4">
      {/* Status tabs */}
      <div className="tabs tabs-box bg-base-200 w-fit text-sm md:text-base">
        {(["all", "beginner", "advanced"] as const).map((s) => (
          <button
            key={s}
            type="button"
            className={cn(
              "tab rounded-btn",
              debounced.status === s && "bg-[#712BB2] text-white",
            )}
            onClick={() => setFilters((prev) => ({ ...prev, status: s }))}
          >
            {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-2">
          <label className="text-base-content/70 text-sm">Rating:</label>
          <input
            type="number"
            placeholder="Min"
            value={filters.ratingMin || ""}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                ratingMin: Number(e.target.value) || 0,
              }))
            }
            className="input input-sm bg-base-200 w-20 rounded-lg"
          />
          <span className="text-base-content/50">—</span>
          <input
            type="number"
            placeholder="Max"
            value={filters.ratingMax === 9999 ? "" : filters.ratingMax}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                ratingMax: Number(e.target.value) || 9999,
              }))
            }
            className="input input-sm bg-base-200 w-20 rounded-lg"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-base-content/70 text-sm">Name:</label>
          <input
            type="text"
            placeholder="Search..."
            value={filters.nameSearch}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, nameSearch: e.target.value }))
            }
            className="input input-sm bg-base-200 w-36 rounded-lg"
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="toggle toggle-sm"
            checked={filters.showHidden}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, showHidden: e.target.checked }))
            }
          />
          <span className="text-base-content/70">Show hidden</span>
        </label>
      </div>

      {/* Results count */}
      <p className="text-base-content/50 text-xs">
        Showing {visibleResults.length} of {results.length} players
      </p>

      {/* Table */}
      <div className="bg-base-200 rounded-box overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-base-300 text-base-content/50 border-b text-xs uppercase">
              <th className="w-12 px-4 py-4">#</th>
              <th
                className="cursor-pointer px-4 py-4 select-none"
                onClick={() => toggleSort("name")}
              >
                Name{" "}
                <SortArrow
                  sortKey="name"
                  activeSortKey={debounced.sortKey}
                  sortDir={debounced.sortDir}
                />
              </th>
              <th
                className="w-24 cursor-pointer px-4 py-4 select-none"
                onClick={() => toggleSort("rating")}
              >
                Rating{" "}
                <SortArrow
                  sortKey="rating"
                  activeSortKey={debounced.sortKey}
                  sortDir={debounced.sortDir}
                />
              </th>
              <th className="w-24 px-4 py-4">Status</th>
              <th className="w-24 px-4 py-4">Visible</th>
            </tr>
          </thead>
          <tbody>
            {visibleResults.map((p) => (
              <tr
                key={p.name}
                className="border-base-300 border-b last:border-0"
              >
                <td className="text-base-content/70 px-4 py-3">{p.place}</td>
                <td className="px-4 py-3 font-medium">{p.name}</td>
                <td className="px-4 py-3">{p.rating}</td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "badge badge-sm",
                      p.status === "advanced" ? "badge-primary" : "badge-ghost",
                    )}
                  >
                    {p.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={
                      p.visible ? "text-green-500" : "text-base-content/30"
                    }
                  >
                    {p.visible ? "visible" : "hidden"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {visibleResults.length === 0 && (
          <p className="text-base-content/50 py-6 text-center">
            No players match the current filters
          </p>
        )}
        {visibleResults.length < results.length && (
          <div className="flex justify-center py-4">
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setVisibleCount((prev) => prev + 50)}
            >
              Show more (remaining {results.length - visibleResults.length})
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
