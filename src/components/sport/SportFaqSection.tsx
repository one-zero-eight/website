import { $sport } from "@/api/sport";
import clsx from "clsx";
import { useMemo, useState } from "react";

export function SportFaqSection({ enabled }: { enabled: boolean }) {
  const { data, isPending, isError } = $sport.useQuery(
    "get",
    "/faq",
    {},
    {
      enabled,
    },
  );

  const categories = useMemo(() => (data ? Object.keys(data) : []), [data]);
  const [active, setActive] = useState<string | null>(null);

  const selectedCategory = active ?? categories[0] ?? null;
  const qa = selectedCategory && data ? data[selectedCategory] : null;

  if (!enabled) return null;

  return (
    <div className="card card-border bg-base-100">
      <div className="card-body gap-4">
        <h3 className="text-center text-lg font-semibold">FAQ</h3>
        {isPending ? (
          <div className="bg-base-200 rounded-box h-32 animate-pulse" />
        ) : isError ? (
          <p className="text-base-content/60 text-center text-sm">
            FAQ could not be loaded.
          </p>
        ) : categories.length === 0 ? (
          <p className="text-base-content/60 text-center text-sm">
            No FAQ entries.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap justify-center gap-2">
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={clsx(
                    "btn btn-sm",
                    c === selectedCategory ? "btn-primary" : "btn-outline",
                  )}
                  onClick={() => setActive(c)}
                >
                  {c}
                </button>
              ))}
            </div>
            {qa ? (
              <div className="flex flex-col gap-2">
                {Object.entries(qa).map(([q, a]) => (
                  <div
                    key={q}
                    className="collapse-arrow border-base-300 collapse border"
                  >
                    <input
                      type="radio"
                      name={`sport-faq-${selectedCategory ?? "x"}`}
                    />
                    <div className="collapse-title text-sm font-medium">
                      {q}
                    </div>
                    <div className="collapse-content text-base-content/80 text-sm">
                      {a}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
