import { searchTypes } from "@/api/search";
import clsx from "clsx";

export function ActResult({
  response,
}: {
  response: searchTypes.SchemaActResponses;
}) {
  const answer = response.answer;

  return (
    <div
      tabIndex={0}
      className={clsx(
        "bg-floating flex flex-col rounded-lg border! border-gray-400 p-4",
      )}
    >
      {answer}
    </div>
  );
}
