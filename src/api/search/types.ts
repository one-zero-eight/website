/**
 * This file was auto-generated by openapi-typescript.
 * Do not make direct changes to the file.
 */

export interface paths {
  "/search/search": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Search By Query */
    get: operations["search_search_by_query"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/search/search/{search_query_id}/feedback": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Add User Feedback */
    post: operations["search_add_user_feedback"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/telegram/messages": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * Save Or Update Message
     * @description Determining whether to save the message or overwrite it
     */
    post: operations["telegram_save_or_update_message"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/moodle/preview": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Preview Moodle */
    get: operations["moodle_preview_moodle"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/moodle/files": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Get Moodle Files */
    get: operations["moodle_get_moodle_files"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/moodle/courses": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Courses */
    get: operations["moodle_courses"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/moodle/batch-courses": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Batch Upsert Courses */
    post: operations["moodle_batch_upsert_courses"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/moodle/courses-content": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Courses Content */
    get: operations["moodle_courses_content"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/moodle/set-course-content": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Course Content */
    post: operations["moodle_course_content"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/moodle/need-to-upload-contents": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Need To Upload Contents */
    post: operations["moodle_need_to_upload_contents"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/moodle/content-uploaded": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Content Uploaded */
    post: operations["moodle_content_uploaded"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/compute/corpora": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Get Corpora */
    get: operations["compute_get_corpora"];
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
    /** Chat */
    Chat: {
      /** Id */
      id: number;
      /** Type */
      type: string;
      /** Title */
      title: string;
      /** Username */
      username: string;
    };
    /** DBMessageSchema */
    DBMessageSchema: {
      /** Message Id */
      message_id: number;
      /**
       * Date
       * Format: date-time
       */
      date: string;
      /** Chat Id */
      chat_id: number;
      /** Chat Title */
      chat_title: string;
      /** Chat Username */
      chat_username: string;
      /** Text */
      text: string | null;
      /** Caption */
      caption: string | null;
      /** Link */
      link: string;
    };
    /** Detail */
    Detail: {
      /** Detail */
      detail: string;
    };
    /** FlattenInContentsWithPresignedUrl */
    FlattenInContentsWithPresignedUrl: {
      /** Course Id */
      course_id: number;
      /** Module Id */
      module_id: number;
      content: components["schemas"]["MoodleContentSchema-Output"];
      /** Presigned Url */
      presigned_url: string;
    };
    /** HTTPValidationError */
    HTTPValidationError: {
      /** Detail */
      detail?: components["schemas"]["ValidationError"][];
    };
    /** InContent */
    InContent: {
      /** Course Id */
      course_id: number;
      /** Module Id */
      module_id: number;
      content: components["schemas"]["MoodleContentSchema-Input"];
    };
    /** InContents */
    InContents: {
      /** Course Id */
      course_id: number;
      /** Module Id */
      module_id: number;
      /** Contents */
      contents: components["schemas"]["MoodleContentSchema-Input"][];
    };
    /** InCourse */
    InCourse: {
      /** Id */
      id: number;
      /** Fullname */
      fullname: string;
      /** Startdate */
      startdate: number;
      /** Enddate */
      enddate: number;
      /** Coursecategory */
      coursecategory: string;
    };
    /** InCourses */
    InCourses: {
      /** Courses */
      courses: components["schemas"]["InCourse"][];
    };
    /** InModule */
    InModule: {
      /** Id */
      id: number;
      /** Name */
      name: string;
      /** Modname */
      modname: string;
      /**
       * Contents
       * @default []
       */
      contents: components["schemas"]["MoodleContentSchema-Input"][];
    };
    /** InSection */
    InSection: {
      /** Id */
      id: number;
      /** Summary */
      summary: string;
      /** Modules */
      modules: components["schemas"]["InModule"][];
    };
    /** InSections */
    InSections: {
      /** Course Id */
      course_id: number;
      /** Course Fullname */
      course_fullname: string;
      /** Sections */
      sections: components["schemas"]["InSection"][];
    };
    /** MessageSchema */
    MessageSchema: {
      /** Id */
      id: number;
      sender_chat: components["schemas"]["Chat"];
      /**
       * Date
       * Format: date-time
       */
      date: string;
      chat: components["schemas"]["Chat"];
      /** Text */
      text: string | null;
      /** Caption */
      caption: string | null;
    };
    /** MoodleContentSchema */
    "MoodleContentSchema-Input": {
      /** Type */
      type: string;
      /** Filename */
      filename: string;
      /** Timecreated */
      timecreated?: number | null;
      /** Timemodified */
      timemodified?: number | null;
      /**
       * Uploaded
       * @default false
       */
      uploaded: boolean;
    };
    /** MoodleContentSchema */
    "MoodleContentSchema-Output": {
      /** Type */
      type: string;
      /** Filename */
      filename: string;
      /** Timecreated */
      timecreated: number | null;
      /** Timemodified */
      timemodified: number | null;
      /**
       * Uploaded
       * @default false
       */
      uploaded: boolean;
    };
    /** MoodleCourse */
    MoodleCourse: {
      /**
       * Id
       * Format: objectid
       * @description MongoDB document ObjectID
       * @default None
       * @example 5eb7cf5a86d9755df3a6c593
       */
      id: string;
      /** Course Id */
      course_id: number;
      /** Fullname */
      fullname: string;
      /** Startdate */
      startdate: number;
      /** Enddate */
      enddate: number;
      /** Coursecategory */
      coursecategory: string;
    };
    /** MoodleEntry */
    MoodleEntry: {
      /**
       * Id
       * Format: objectid
       * @description MongoDB document ObjectID
       * @default None
       * @example 5eb7cf5a86d9755df3a6c593
       */
      id: string;
      /** Course Id */
      course_id: number;
      /** Course Fullname */
      course_fullname: string;
      /** Section Id */
      section_id: number;
      /** Section Summary */
      section_summary: string;
      /** Module Id */
      module_id: number;
      /** Module Name */
      module_name: string;
      /** Module Modname */
      module_modname: string;
      /** Contents */
      contents: components["schemas"]["MoodleContentSchema-Output"][];
    };
    /** MoodleFileSource */
    MoodleFileSource: {
      /**
       * Display Name
       * @description Display name of the resource.
       * @default -
       */
      display_name: string;
      /**
       * Breadcrumbs
       * @description Breadcrumbs to the resource.
       * @default [
       *       "Moodle"
       *     ]
       */
      breadcrumbs: string[];
      /**
       * Link
       * @description Anchor URL to the resource on Moodle.
       */
      link: string;
      /**
       * @description discriminator enum property added by openapi-typescript
       * @enum {string}
       */
      type: MoodleFileSourceType;
      /**
       * Resource Preview Url
       * @description URL to get the preview of the resource.
       */
      resource_preview_url: string | null;
      /**
       * Resource Download Url
       * @description URL to download the resource.
       */
      resource_download_url: string | null;
      preview_location: components["schemas"]["PdfLocation"] | null;
    };
    /** MoodleUnknownSource */
    MoodleUnknownSource: {
      /**
       * Display Name
       * @description Display name of the resource.
       * @default -
       */
      display_name: string;
      /**
       * Breadcrumbs
       * @description Breadcrumbs to the resource.
       * @default [
       *       "Moodle"
       *     ]
       */
      breadcrumbs: string[];
      /**
       * Link
       * @description Anchor URL to the resource on Moodle.
       */
      link: string;
      /**
       * @description discriminator enum property added by openapi-typescript
       * @enum {string}
       */
      type: MoodleUnknownSourceType;
    };
    /** MoodleUrlSource */
    MoodleUrlSource: {
      /**
       * Display Name
       * @description Display name of the resource.
       * @default -
       */
      display_name: string;
      /**
       * Breadcrumbs
       * @description Breadcrumbs to the resource.
       * @default [
       *       "Moodle"
       *     ]
       */
      breadcrumbs: string[];
      /**
       * Link
       * @description Anchor URL to the resource on Moodle.
       */
      link: string;
      /**
       * @description discriminator enum property added by openapi-typescript
       * @enum {string}
       */
      type: MoodleUrlSourceType;
      /**
       * Url
       * @description URL of the resource
       */
      url: string;
    };
    /** PdfLocation */
    PdfLocation: {
      /**
       * Page Index
       * @description Page index in the PDF file. Starts from 1.
       */
      page_index: number;
    };
    /** SearchResponse */
    SearchResponse: {
      /**
       * Source
       * @description Relevant source for the search.
       */
      source:
        | components["schemas"]["MoodleFileSource"]
        | components["schemas"]["MoodleUrlSource"]
        | components["schemas"]["MoodleUnknownSource"]
        | components["schemas"]["TelegramSource"];
      /**
       * Score
       * @description Score of the search response. Multiple scores if was an aggregation of multiple chunks. Optional.
       */
      score: number | number[] | null;
    };
    /** SearchResponses */
    SearchResponses: {
      /**
       * Searched For
       * @description Text that was searched for.
       */
      searched_for: string;
      /**
       * Responses
       * @description Responses to the search query.
       */
      responses: components["schemas"]["SearchResponse"][];
      /**
       * Search Query Id
       * @description Assigned search query index
       */
      search_query_id: string | null;
    };
    /** TelegramSource */
    TelegramSource: {
      /**
       * @description discriminator enum property added by openapi-typescript
       * @enum {string}
       */
      type: TelegramSourceType;
      /**
       * Display Name
       * @description Display name of the resource.
       * @default -
       */
      display_name: string;
      /**
       * Breadcrumbs
       * @description Breadcrumbs to the resource.
       * @default [
       *       "Telegram"
       *     ]
       */
      breadcrumbs: string[];
      /**
       * Chat Username
       * @description Username of the chat, channel, group
       */
      chat_username: string;
      /**
       * Chat Title
       * @description Title of the chat, channel, group
       */
      chat_title: string;
      /**
       * Message Id
       * @description Message ID in the chat
       */
      message_id: number;
      /**
       * Link
       * @description Link to the message
       */
      link: string;
    };
    /** ValidationError */
    ValidationError: {
      /** Location */
      loc: (string | number)[];
      /** Message */
      msg: string;
      /** Error Type */
      type: string;
    };
  };
  responses: never;
  parameters: never;
  requestBodies: never;
  headers: never;
  pathItems: never;
}
export type SchemaChat = components["schemas"]["Chat"];
export type SchemaDbMessageSchema = components["schemas"]["DBMessageSchema"];
export type SchemaDetail = components["schemas"]["Detail"];
export type SchemaFlattenInContentsWithPresignedUrl =
  components["schemas"]["FlattenInContentsWithPresignedUrl"];
export type SchemaHttpValidationError =
  components["schemas"]["HTTPValidationError"];
export type SchemaInContent = components["schemas"]["InContent"];
export type SchemaInContents = components["schemas"]["InContents"];
export type SchemaInCourse = components["schemas"]["InCourse"];
export type SchemaInCourses = components["schemas"]["InCourses"];
export type SchemaInModule = components["schemas"]["InModule"];
export type SchemaInSection = components["schemas"]["InSection"];
export type SchemaInSections = components["schemas"]["InSections"];
export type SchemaMessageSchema = components["schemas"]["MessageSchema"];
export type SchemaMoodleContentSchemaInput =
  components["schemas"]["MoodleContentSchema-Input"];
export type SchemaMoodleContentSchemaOutput =
  components["schemas"]["MoodleContentSchema-Output"];
export type SchemaMoodleCourse = components["schemas"]["MoodleCourse"];
export type SchemaMoodleEntry = components["schemas"]["MoodleEntry"];
export type SchemaMoodleFileSource = components["schemas"]["MoodleFileSource"];
export type SchemaMoodleUnknownSource =
  components["schemas"]["MoodleUnknownSource"];
export type SchemaMoodleUrlSource = components["schemas"]["MoodleUrlSource"];
export type SchemaPdfLocation = components["schemas"]["PdfLocation"];
export type SchemaSearchResponse = components["schemas"]["SearchResponse"];
export type SchemaSearchResponses = components["schemas"]["SearchResponses"];
export type SchemaTelegramSource = components["schemas"]["TelegramSource"];
export type SchemaValidationError = components["schemas"]["ValidationError"];
export type $defs = Record<string, never>;
export interface operations {
  search_search_by_query: {
    parameters: {
      query: {
        query: string;
        limit?: number;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SearchResponses"];
        };
      };
      /** @description Search timed out */
      408: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Validation Error */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["HTTPValidationError"];
        };
      };
    };
  };
  search_add_user_feedback: {
    parameters: {
      query: {
        response_index: number;
        feedback: PathsSearchSearchSearch_query_idFeedbackPostParametersQueryFeedback;
      };
      header?: never;
      path: {
        search_query_id: string;
      };
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
          "application/json": unknown;
        };
      };
      /** @description Validation Error */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["HTTPValidationError"];
        };
      };
    };
  };
  telegram_save_or_update_message: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["MessageSchema"];
      };
    };
    responses: {
      /** @description Successful Response */
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["DBMessageSchema"];
        };
      };
      /** @description Validation Error */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["HTTPValidationError"];
        };
      };
    };
  };
  moodle_preview_moodle: {
    parameters: {
      query: {
        course_id: number;
        module_id: number;
        filename: string;
      };
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
          "application/json": unknown;
        };
      };
      /** @description Redirect to the file */
      307: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description File not found */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Validation Error */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["HTTPValidationError"];
        };
      };
    };
  };
  moodle_get_moodle_files: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": Record<string, never>[];
        };
      };
    };
  };
  moodle_courses: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["MoodleCourse"][];
        };
      };
    };
  };
  moodle_batch_upsert_courses: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["InCourses"];
      };
    };
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": unknown;
        };
      };
      /** @description Validation Error */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["HTTPValidationError"];
        };
      };
    };
  };
  moodle_courses_content: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["MoodleEntry"][];
        };
      };
    };
  };
  moodle_course_content: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["InSections"][];
      };
    };
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": unknown;
        };
      };
      /** @description Validation Error */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["HTTPValidationError"];
        };
      };
    };
  };
  moodle_need_to_upload_contents: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["InContents"][];
      };
    };
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FlattenInContentsWithPresignedUrl"][];
        };
      };
      /** @description Validation Error */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["HTTPValidationError"];
        };
      };
    };
  };
  moodle_content_uploaded: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["InContent"];
      };
    };
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": unknown;
        };
      };
      /** @description Validation Error */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["HTTPValidationError"];
        };
      };
    };
  };
  compute_get_corpora: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": unknown;
        };
      };
      /** @description Unable to verify credentials OR Credentials not provided */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["Detail"];
        };
      };
    };
  };
}
export enum PathsSearchSearchSearch_query_idFeedbackPostParametersQueryFeedback {
  like = "like",
  dislike = "dislike",
}
export enum MoodleFileSourceType {
  moodle_file = "moodle-file",
}
export enum MoodleUnknownSourceType {
  moodle_unknown = "moodle-unknown",
}
export enum MoodleUrlSourceType {
  moodle_url = "moodle-url",
}
export enum TelegramSourceType {
  telegram = "telegram",
}