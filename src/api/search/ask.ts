import { searchTypes } from ".";

export const fetchAsk = async (
  query: string,
): Promise<searchTypes.SchemaAskResponses> => {
  const response = await fetch(
    "https://api.innohassle.ru/search/staging-v0/ask/",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    },
  );

  if (!response.ok) {
    throw new Error("Error receiving data");
  }

  return response.json();
};
