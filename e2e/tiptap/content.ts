import type { JSONContent } from "@tiptap/core";

const tinyPng =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

export const tiptapPlaygroundContent: JSONContent = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [{ type: "text", text: "First paragraph" }],
    },
    {
      type: "paragraph",
      content: [{ type: "text", text: "Second paragraph" }],
    },
    {
      type: "callout",
      attrs: { type: "note" },
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Callout text" }],
        },
      ],
    },
    {
      type: "imageWithCaption",
      content: [
        {
          type: "image",
          attrs: {
            src: tinyPng,
            alt: "Test image",
            width: 120,
            height: 120,
            originalWidth: 1,
            originalHeight: 1,
          },
        },
        {
          type: "caption",
          content: [{ type: "text", text: "Image caption" }],
        },
      ],
    },
    {
      type: "details",
      attrs: { open: true },
      content: [
        {
          type: "detailsSummary",
          content: [{ type: "text", text: "Details summary" }],
        },
        {
          type: "detailsContent",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Details body" }],
            },
          ],
        },
      ],
    },
  ],
};
