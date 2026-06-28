import { Details } from "@/components/editor/extensions/Details.ts";
import { Highlight } from "@/components/editor/extensions/Highlight.ts";
import { Link } from "@/components/editor/extensions/Link.ts";
import { TableKit } from "@tiptap/extension-table";
import {
  useEditor,
  EditorContent,
  EditorContext,
  Editor,
  Content,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { cn } from "@/lib/ui/cn";
import { useMemo, useEffect, useImperativeHandle, forwardRef } from "react";
import { Placeholder } from "@tiptap/extensions";
import { DetailsSummary, DetailsContent } from "@tiptap/extension-details";
import { Callout } from "@/components/editor/extensions/Callout";
import { ImageWithCaption } from "@/components/editor/extensions/image/ImageWithCaption.ts";
import { Image } from "@/components/editor/extensions/image/Image.ts";
import { Caption } from "@/components/editor/extensions/image/Caption.ts";
import { ImageUploadPlaceholder } from "@/components/editor/extensions/image/ImageUploadPlaceholder.ts";
import { BubbleMenuContent } from "@/components/editor/menus/BubbleMenuContent";
import { ClickableDragHandle } from "@/components/editor/menus/ClickableDragHandle";
import { MobileBottomMenu } from "@/components/editor/menus/MobileBottomMenu";
import { EditorImageHandlersExtension } from "@/components/editor/extensions/EditorImageHandlers";
import type { EditorImageHandlers } from "@/components/editor/types";

import "./tiptap-styles.css";

const baseExtensions = [
  /*
  STARTER KIT:
    Bold, // https://tiptap.dev/docs/editor/extensions/marks/bold
    Blockquote, // https://tiptap.dev/docs/editor/extensions/nodes/blockquote
    BulletList, // https://tiptap.dev/docs/editor/extensions/nodes/bullet-list
    Code, // https://tiptap.dev/docs/editor/extensions/marks/code
    CodeBlock, // https://tiptap.dev/docs/editor/extensions/nodes/code-block
    Document, // https://tiptap.dev/docs/editor/extensions/nodes/document
    Dropcursor, // https://tiptap.dev/docs/editor/extensions/functionality/dropcursor
    Gapcursor, // https://tiptap.dev/docs/editor/extensions/functionality/gapcursor
    HardBreak, // https://tiptap.dev/docs/editor/extensions/nodes/hard-break
    Heading, // https://tiptap.dev/docs/editor/extensions/nodes/heading
    UndoRedo, // https://tiptap.dev/docs/editor/extensions/functionality/undo-redo
    HorizontalRule, // https://tiptap.dev/docs/editor/extensions/nodes/horizontal-rule
    Italic, // https://tiptap.dev/docs/editor/extensions/marks/italic
    ListItem, // https://tiptap.dev/docs/editor/extensions/nodes/list-item
    ListKeymap, // https://tiptap.dev/docs/editor/extensions/functionality/listkeymap
    //Link, // We use custom
    OrderedList, // https://tiptap.dev/docs/editor/extensions/nodes/ordered-list
    Paragraph, // https://tiptap.dev/docs/editor/extensions/nodes/paragraph
    Strike, // https://tiptap.dev/docs/editor/extensions/marks/strike
    Text, // https://tiptap.dev/docs/editor/extensions/nodes/text
    Underline, // https://tiptap.dev/docs/editor/extensions/marks/underline
    TrailingNode, // https://tiptap.dev/docs/editor/extensions/functionality/trailing-node
   */
  StarterKit.configure({
    heading: {
      levels: [1, 2, 3], // Leave only 3 levels
    },
    link: false,
  }),
  Link,
  /*
  TABLE KIT:
    Table, // https://tiptap.dev/docs/editor/extensions/nodes/table
    TableCell, // https://tiptap.dev/docs/editor/extensions/nodes/table-cell
    TableHeader, // https://tiptap.dev/docs/editor/extensions/nodes/table-header
    TableRow, // https://tiptap.dev/docs/editor/extensions/nodes/table-row
   */
  TableKit.configure({
    table: { resizable: true, cellMinWidth: 100 },
  }),
  // https://tiptap.dev/docs/editor/extensions/functionality/placeholder
  Placeholder.configure({
    includeChildren: true,
    showOnlyCurrent: false,
    placeholder: ({ node }) => {
      if (node.type.name === "heading") {
        return `Heading ${node.attrs.level}…`;
      } else if (node.type.name === "caption") {
        return "Write caption…";
      } else if (node.type.name === "detailsSummary") {
        return "Toggle…";
      }
      return "Write something…";
    },
  }),
  Highlight,
  Callout,
  Details,
  DetailsSummary, // https://tiptap.dev/docs/editor/extensions/nodes/details-summary
  DetailsContent, // https://tiptap.dev/docs/editor/extensions/nodes/details-content
  ImageWithCaption,
  Image,
  Caption,
  ImageUploadPlaceholder,
];

export interface TiptapEditorRef {
  editor: Editor | null;
  getJSON: () => any;
}

function TiptapDescriptionEditor(
  {
    className,
    isReadOnly,
    initialContent,
    imageHandlers,
  }: {
    className?: string;
    isReadOnly?: boolean;
    initialContent?: Content;
    imageHandlers?: EditorImageHandlers;
  },
  ref: React.Ref<TiptapEditorRef>,
) {
  const extensions = useMemo(
    () => [
      ...baseExtensions,
      EditorImageHandlersExtension.configure(imageHandlers ?? {}),
    ],
    [imageHandlers],
  );

  const editor = useEditor({
    editable: !isReadOnly,
    immediatelyRender: false, // Lazy loading sometimes causes errors when this is true
    shouldRerenderOnTransaction: false, // Prevent unnecessary re-renders
    editorProps: {
      attributes: {
        autocomplete: "off",
        autocorrect: "off",
        autocapitalize: "off",
        class: cn(className, isReadOnly && "tiptap-readonly"),
      },
      handleDOMEvents: {
        mousedown: (_view, event) => {
          const target = event.target;
          if (
            target instanceof Element &&
            target.closest("[data-callout-picker]")
          ) {
            event.preventDefault();
            return true;
          }

          return false;
        },
        pointerdown: (_view, event) => {
          const target = event.target;
          if (
            target instanceof Element &&
            target.closest("[data-callout-picker]")
          ) {
            event.preventDefault();
            return true;
          }

          return false;
        },
      },
    },
    extensions: extensions,
    content: initialContent || "",
  });

  // Expose editor ref
  useImperativeHandle(ref, () => ({
    editor,
    getJSON: () => editor?.getJSON() || null,
  }));

  // Update editor content when value prop changes (but not on every keystroke to avoid re-renders)
  useEffect(() => {
    if (editor && initialContent !== undefined && initialContent !== null) {
      const currentJSON = editor.getJSON();

      // Simple comparison - if JSON strings differ, update
      if (JSON.stringify(currentJSON) !== JSON.stringify(initialContent)) {
        editor.commands.setContent(initialContent, { emitUpdate: false });
      }
    } else if (editor && (initialContent === null || initialContent === "")) {
      // Clear editor if value is null or empty
      editor.commands.setContent("", { emitUpdate: false });
    }
  }, [editor, initialContent]);

  // Memoize the provider value to avoid unnecessary re-renders
  const providerValue = useMemo(() => ({ editor }), [editor]);

  if (!editor) {
    return null;
  }

  return (
    <EditorContext.Provider value={providerValue}>
      <article className="relative grid min-w-0 grid-cols-[minmax(0,1fr)] md:block">
        <EditorContent
          editor={editor}
          role="presentation"
          className="col-start-1 row-start-1 min-w-0 [&_.tiptap]:pb-12 md:[&_.tiptap]:pb-0"
        />
        {!isReadOnly && <ClickableDragHandle editor={editor} />}
        {!isReadOnly && <BubbleMenuContent editor={editor} />}
        {!isReadOnly && (
          <MobileBottomMenu
            editor={editor}
            className="col-start-1 row-start-1 w-full min-w-0 self-end"
          />
        )}
      </article>
    </EditorContext.Provider>
  );
}

export default forwardRef(TiptapDescriptionEditor);
