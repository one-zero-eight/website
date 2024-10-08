/**
 * This file was auto-generated by openapi-typescript.
 * Do not make direct changes to the file.
 */

export interface paths {
  "/scenes/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Scenes */
    get: operations["scenes_scenes"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
}
export type webhooks = Record<string, never>;
export interface components {
  schemas: {
    /** Area */
    Area: {
      /** Svg Polygon Id */
      svg_polygon_id?: string | null;
      /** Title */
      title?: string | null;
      /** Legend Id */
      legend_id?: string | null;
    };
    /** LegendEntry */
    LegendEntry: {
      /** Legend Id */
      legend_id: string;
      /** Color */
      color?: string | null;
      /** Legend */
      legend?: string | null;
    };
    /** Scene */
    Scene: {
      /** Scene Id */
      scene_id: string;
      /** Title */
      title: string;
      /** Svg File */
      svg_file: string;
      /**
       * Legend
       * @default []
       */
      legend: components["schemas"]["LegendEntry"][];
      /**
       * Areas
       * @default []
       */
      areas: components["schemas"]["Area"][];
    };
  };
  responses: never;
  parameters: never;
  requestBodies: never;
  headers: never;
  pathItems: never;
}
export type SchemaArea = components["schemas"]["Area"];
export type SchemaLegendEntry = components["schemas"]["LegendEntry"];
export type SchemaScene = components["schemas"]["Scene"];
export type $defs = Record<string, never>;
export interface operations {
  scenes_scenes: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["Scene"][];
        };
      };
    };
  };
}
