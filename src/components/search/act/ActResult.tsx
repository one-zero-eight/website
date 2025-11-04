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
        "bg-base-200 rounded-field flex flex-col border! border-gray-400 p-4",
      )}
    >
      {answer}
    </div>
  );
}
