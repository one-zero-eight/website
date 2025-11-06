import Fuse from "fuse.js";
import { Resource } from "./types.ts";

// Ranking weights for RRF calculation
const FUSE_WEIGHT = 5;
const USER_WEIGHT = 2;
const GLOBAL_WEIGHT = 0.5;
const RRF_K = 60;

export const createFuseInstance = (resourcesList: Resource[]) => {
  return new Fuse(resourcesList, {
    keys: [
      { name: "resource", weight: 5 },
      { name: "title", weight: 3 },
      { name: "description", weight: 1 },
    ],
    threshold: 0.3,
  });
};

interface FrequencyMap {
  [key: string]: number;
}

export const getFilteredResources = (
  resourcesList: Resource[],
  searchQuery: string,
  activeGroup: string,
  fuse: Fuse<Resource>,
  globalFrequencies: FrequencyMap,
  userFrequencies: FrequencyMap,
) => {
  let filteredResults: Resource[];

  if (searchQuery) {
    const fuseResults = fuse.search(searchQuery).map((result) => result.item);
    if (fuseResults.length === 0) return [];
    filteredResults = fuseResults;
  } else {
    filteredResults = resourcesList.filter(
      (item) => activeGroup === item.category || activeGroup === "All",
    );
  }

  // Fuse ranking (for search results) or initial order (for filtered results)
  const fuseRanking = filteredResults.map((item, index) => ({
    item,
    rankFuse: index + 1,
  }));

  // User frequencies ranking
  const userRanking = [...filteredResults]
    .filter((item) => (userFrequencies[item.url] || 0) > 0)
    .sort((a, b) => {
      const numA = userFrequencies[a.url] || 0;
      const numB = userFrequencies[b.url] || 0;
      return numB - numA;
    });

  const userRankMap = new Map();
  userRanking.forEach((item, index) => {
    userRankMap.set(item.url, index + 1);
  });

  // Global frequencies ranking
  const globalRanking = [...filteredResults]
    .filter((item) => (globalFrequencies[item.url] || 0) > 0)
    .sort((a, b) => {
      const numA = globalFrequencies[a.url] || 0;
      const numB = globalFrequencies[b.url] || 0;
      return numB - numA;
    });

  const globalRankMap = new Map();
  globalRanking.forEach((item, index) => {
    globalRankMap.set(item.url, index + 1);
  });

  const itemsWithRRF = fuseRanking.map(({ item, rankFuse }) => {
    const rankUser = userRankMap.get(item.url) || filteredResults.length + 1;
    const rankGlobal =
      globalRankMap.get(item.url) || filteredResults.length + 1;
    let score = 0;
    if (searchQuery) {
      score =
        FUSE_WEIGHT / (rankFuse + RRF_K) +
        USER_WEIGHT / (rankUser + RRF_K) +
        GLOBAL_WEIGHT / (rankGlobal + RRF_K);
    } else {
      score =
        USER_WEIGHT / (rankUser + RRF_K) + GLOBAL_WEIGHT / (rankGlobal + RRF_K);
    }
    return { item, score };
  });
  itemsWithRRF.sort((a, b) => b.score - a.score);
  return itemsWithRRF.map(({ item }) => item);
};
