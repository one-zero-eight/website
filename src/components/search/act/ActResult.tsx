import { searchTypes } from "@/api/search";
import { cn } from "@/lib/ui/cn";

export function ActResult({
  response,
}: {
  response: searchTypes.SchemaActResponses;
}) {
  const answer = response.answer;

  return (
    <div
      tabIndex={0}
      className={cn(
        "bg-base-200 rounded-field border-base-content/50 flex flex-col border! p-4",
      )}
    >
      {answer}
    </div>
  );
}
