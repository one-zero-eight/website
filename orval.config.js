/** @type {{[key: string]: import("orval").Options}} */
module.exports = {
  events: {
    input: {
      target: "http://localhost:8000/openapi.json",
      // validation: true,
    },
    output: {
      mode: "single",
      target: "./lib/events/__generated__.ts",
      client: "react-query",
      prettier: true,
      override: {
        mutator: {
          path: "./lib/events/axios-instance.ts",
          name: "axiosInstance",
        },
      },
    },
  },
};
