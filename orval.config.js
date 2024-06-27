/** @type {{[key: string]: import("orval").Options}} */
module.exports = {
  events: {
    input: {
      target: "https://api.innohassle.ru/events/staging-v0/openapi.json",
      // validation: true,
    },
    output: {
      mode: "single",
      target: "./lib/events/api/__generated__.ts",
      client: "react-query",
      prettier: true,
      override: {
        mutator: {
          path: "./lib/events/api/axios.ts",
          name: "axiosQuery",
        },
        query: {
          queryOptions: {
            path: "./lib/events/api/query.ts",
            name: "queryOptionsMutator",
          },
        },
      },
    },
  },
  accounts: {
    input: {
      target: "https://api.innohassle.ru/accounts/staging-v0/openapi.json",
      // validation: true,
    },
    output: {
      mode: "single",
      target: "./lib/accounts/api/__generated__.ts",
      client: "react-query",
      prettier: true,
      override: {
        mutator: {
          path: "./lib/accounts/api/axios.ts",
          name: "axiosQuery",
        },
        query: {
          queryOptions: {
            path: "./lib/accounts/api/query.ts",
            name: "queryOptionsMutator",
          },
        },
      },
    },
  },
  search: {
    input: {
      // target: "https://api.innohassle.ru/search/staging-v0/openapi.json",
      target: "https://api.innohassle.ru/search/staging-v0/openapi.json",
      // validation: true,
    },
    output: {
      mode: "single",
      target: "./lib/search/api/__generated__.ts",
      client: "react-query",
      prettier: true,
      override: {
        mutator: {
          path: "./lib/search/api/axios.ts",
          name: "axiosQuery",
        },
        query: {
          queryOptions: {
            path: "./lib/search/api/query.ts",
            name: "queryOptionsMutator",
          },
        },
      },
    },
  },
};
