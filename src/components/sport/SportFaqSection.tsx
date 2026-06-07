import { $sport } from "@/api/sport";

export function SportFaqSection({ enabled }: { enabled: boolean }) {
  const { data, isPending, isError } = $sport.useQuery(
    "get",
    "/faq",
    {},
    {
      enabled,
    },
  );

  if (!enabled) return null;

  const categories = data ? Object.entries(data) : [];

  return (
    <div className="card card-border bg-base-100">
      <div className="card-body gap-5">
        <h3 className="text-lg font-semibold">FAQ</h3>
        {isPending ? (
          <div className="skeleton h-32" />
        ) : isError ? (
          <p className="text-base-content/60 text-sm">
            FAQ could not be loaded.
          </p>
        ) : categories.length === 0 ? (
          <p className="text-base-content/60 text-sm">No FAQ entries.</p>
        ) : (
          <div className="grid gap-6">
            {categories.map(([category, questions]) => (
              <section key={category} className="grid gap-3">
                <h4 className="border-base-300 border-b pb-2 text-base font-semibold">
                  {category}
                </h4>
                <div className="grid gap-4">
                  {Object.entries(questions).map(([question, answer]) => (
                    <div key={question} className="grid gap-2">
                      <h5 className="text-sm font-semibold">{question}</h5>
                      <div
                        className="prose prose-sm text-base-content/80 max-w-none"
                        dangerouslySetInnerHTML={{ __html: answer }}
                      />
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
