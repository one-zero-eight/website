import chalk from "chalk";
import { globalFrequencies, resourcesList } from "./resources-list.ts";
import { createFuseInstance, getFilteredResources } from "./searchUtils.ts";
import { Resource } from "./types.ts";

// Use all resources for testing
const testResources = resourcesList;

// Define types for the test scenarios
type RelevanceMap = Record<string, number>;
type FrequencyMap = Record<string, number>;

interface TestScenario {
  name: string;
  searchQuery: string;
  userFrequencies: FrequencyMap;
  relevanceScores: RelevanceMap;
}

// Create separate scenarios with search query, user frequency, and ground truth relevance
const testScenarios: TestScenario[] = [
  {
    name: "Without search",
    searchQuery: "",
    userFrequencies: {},
    relevanceScores: {
      "https://sport.innopolis.university/profile/": 3,
      "https://moodle.innopolis.university/my/": 3,
      "https://baam.tatar/s": 3,
      "https://my.innopolis.university/event": 3,
      "https://t.me/IUSportBot": 3,
      "https://my.innopolis.university/store": 3,
      "https://eduwiki.innopolis.university/index.php/Main_Page": 3,
      "https://psychologist.innopolis.university/appointment/new": 3,
      "https://mail.innopolis.ru": 3,
    },
  },
  {
    name: "Moodle",
    searchQuery: "moodle",
    userFrequencies: {},
    relevanceScores: {
      "https://moodle.innopolis.university/my/": 3,
    },
  },
  {
    name: "Sports",
    searchQuery: "sport",
    userFrequencies: {},
    relevanceScores: {
      "https://sport.innopolis.university/profile/": 3,
      "https://t.me/IUSportBot": 2,
    },
  },
  {
    name: "Sports but with userFrequency",
    searchQuery: "sport",
    userFrequencies: {
      "https://t.me/IUSportBot": 1,
    },
    relevanceScores: {
      "https://t.me/IUSportBot": 3,
      "https://sport.innopolis.university/profile/": 2,
    },
  },
];

// Calculate DCG (Discounted Cumulative Gain)
function calculateDCG(
  results: Resource[],
  relevanceScores: RelevanceMap,
): number {
  return results.reduce((dcg, result, index) => {
    const relevance = relevanceScores[result.url] || 0;
    const rank = index + 1;
    return dcg + (Math.pow(2, relevance) - 1) / Math.log2(rank + 1);
  }, 0);
}

// Calculate IDCG (Ideal DCG)
function calculateIDCG(
  results: Resource[],
  relevanceScores: RelevanceMap,
): number {
  const sortedByRelevance = [...results].sort((a, b) => {
    return (relevanceScores[b.url] || 0) - (relevanceScores[a.url] || 0);
  });
  return calculateDCG(sortedByRelevance, relevanceScores);
}

// Calculate NDCG
function calculateNDCG(
  results: Resource[],
  relevanceScores: RelevanceMap,
): number {
  const dcg = calculateDCG(results, relevanceScores);
  const idcg = calculateIDCG(results, relevanceScores);
  return idcg === 0 ? 0 : dcg / idcg;
}

// Helper function to get relevance color
function getRelevanceColor(relevance: number) {
  switch (relevance) {
    case 3:
      return chalk.green;
    case 2:
      return chalk.yellow;
    case 1:
      return chalk.red;
    default:
      return chalk.gray;
  }
}

// Helper function to format resource name
function formatResourceName(resource: Resource): string {
  return `${resource.resource}${resource.title ? `: ${resource.title}` : ""}`;
}

// Run tests
function runTests() {
  const fuse = createFuseInstance(testResources);

  console.log(
    chalk.bgBlue.white.bold(
      "\n 🔍 Running NDCG Tests for getFilteredResources with All Resources \n",
    ),
  );

  testScenarios.forEach((scenario) => {
    // Get search results
    const results = getFilteredResources(
      testResources,
      scenario.searchQuery,
      "All",
      fuse,
      globalFrequencies,
      scenario.userFrequencies,
    );

    // Calculate NDCG for the top 10 results
    const topResults = results.slice(0, 10);
    const ndcg = calculateNDCG(topResults, scenario.relevanceScores);

    console.log(
      chalk.blue.bold(
        `📊 Test: ${scenario.name} 🔎 Search Query: "${chalk.white(scenario.searchQuery)}"`,
      ),
    );
    console.log(
      chalk.cyan.bold(
        `🏆 NDCG Score: ${chalk.white.bgGreen.bold(` ${ndcg.toFixed(4)} `)}\n`,
      ),
    );

    console.log(chalk.blue.bold("📋 Results order:"));
    console.log(chalk.dim("─".repeat(106)));

    // Print results table header
    console.log(
      chalk.dim("│"),
      chalk.cyan.bold("Rank"),
      chalk.dim("│"),
      chalk.cyan.bold("Resource".padEnd(40)),
      chalk.dim("│"),
      chalk.cyan.bold("Relevance".padEnd(9)),
      chalk.dim("│"),
      chalk.cyan.bold("URL".padEnd(40)),
      chalk.dim("│"),
    );
    console.log(chalk.dim("─".repeat(106)));

    topResults.forEach((result, index) => {
      const relevance = scenario.relevanceScores[result.url] || 0;
      const colorFn = getRelevanceColor(relevance);
      const relevanceText = relevance > 0 ? relevance.toString() : "-";

      console.log(
        chalk.dim("│"),
        chalk.white.bold(`${index + 1}`.padEnd(4)),
        chalk.dim("│"),
        colorFn(formatResourceName(result).padEnd(40).substring(0, 40)),
        chalk.dim("│"),
        colorFn(relevanceText.padEnd(9)),
        chalk.dim("│"),
        chalk.blue(result.url.padEnd(40).substring(0, 40)),
        chalk.dim("│"),
      );
    });
    console.log(chalk.dim("─".repeat(106)));

    // Show expected order
    console.log(chalk.blue.bold("\n🎯 Expected Order (by relevance):"));
    console.log(chalk.dim("─".repeat(106)));

    // Print expected order table header
    console.log(
      chalk.dim("│"),
      chalk.cyan.bold("Rank"),
      chalk.dim("│"),
      chalk.cyan.bold("Resource".padEnd(40)),
      chalk.dim("│"),
      chalk.cyan.bold("Relevance".padEnd(9)),
      chalk.dim("│"),
      chalk.cyan.bold("URL".padEnd(40)),
      chalk.dim("│"),
    );
    console.log(chalk.dim("─".repeat(106)));

    const expectedOrder = Object.entries(scenario.relevanceScores)
      .sort(([, a], [, b]) => b - a)
      .map(([url]) => url);

    expectedOrder.forEach((url, index) => {
      const resource = testResources.find((r) => r.url === url);
      if (resource) {
        const relevance = scenario.relevanceScores[url];
        const colorFn = getRelevanceColor(relevance);

        console.log(
          chalk.dim("│"),
          chalk.white.bold(`${index + 1}`.padEnd(4)),
          chalk.dim("│"),
          colorFn(formatResourceName(resource).padEnd(40).substring(0, 40)),
          chalk.dim("│"),
          colorFn(relevance.toString().padEnd(9)),
          chalk.dim("│"),
          chalk.blue(url.padEnd(40).substring(0, 40)),
          chalk.dim("│"),
        );
      }
    });
    console.log(chalk.dim("─".repeat(106)));

    console.log(chalk.dim("\n" + "=".repeat(100) + "\n"));
  });
}

// Run the tests
runTests();
