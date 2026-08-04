import { $sport } from "@/api/sport";
import { SportPageShell } from "@/components/sport/SportPageShell.tsx";

export function SportFaqPage() {
  return (
    <SportPageShell>
      {(sport) => <SportFaqContent enabled={sport.canQuerySport} />}
    </SportPageShell>
  );
}

function SportFaqContent({ enabled }: { enabled: boolean }) {
  const { data, isPending, isError } = $sport.useQuery(
    "get",
    "/faq",
    {},
    {
      enabled,
    },
  );

  if (!enabled) return null;

  if (isPending) {
    return (
      <div className="flex flex-col gap-4 @4xl/content:flex-row">
        <div className="skeleton h-48 w-full flex-1" />
        <div className="skeleton h-48 w-full flex-1" />
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-base-content/60 text-base">FAQ could not be loaded.</p>
    );
  }

  const categories = data ? Object.entries(data) : [];

  if (categories.length === 0) {
    return <p className="text-base-content/60 text-base">No FAQ entries.</p>;
  }

  // Two fully independent columns (left = first half, right = second half) so
  // expanding a card in one column never affects row heights in the other.
  const midpoint = Math.ceil(categories.length / 2);
  const columns = [categories.slice(0, midpoint), categories.slice(midpoint)];

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-3xl font-medium">FAQ</h2>
      <div className="flex flex-col items-start gap-4 @4xl/content:flex-row">
        {columns.map((column, columnIndex) => (
          <div key={columnIndex} className="flex w-full flex-1 flex-col gap-4">
            {column.map(([category, questions]) => (
              <div key={category} className="card card-border bg-base-100">
                <div className="card-body gap-3">
                  <h3 className="text-xl font-semibold">{category}</h3>
                  <div className="flex flex-col gap-2">
                    {Object.entries(questions).map(([question, answer]) => (
                      <details
                        key={question}
                        className="collapse-arrow bg-base-200 collapse"
                      >
                        <summary className="collapse-title text-lg font-medium">
                          {question}
                        </summary>
                        <div className="collapse-content">
                          <div
                            className="prose dark:prose-invert text-base-content/80 max-w-none text-base"
                            dangerouslySetInnerHTML={{ __html: answer }}
                          />
                        </div>
                      </details>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
