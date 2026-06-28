import { mergeAttributes, ResizableNodeView } from "@tiptap/core";
import { Image as BaseImage } from "@tiptap/extension-image";
import type { Editor } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import {
  applyImageDisplayStyles,
  getHeightForWidth,
  type ImageSizeAttrs,
} from "@/components/editor/utils/imageDisplay";
import { resolveImageAttrSrc } from "@/components/editor/utils/getEditorImageHandlers";
import { createImageResizeTouchFixPlugin } from "./imageResizeTouchFix";

function selectImageBlock(editor: Editor, imagePos: number) {
  const $pos = editor.state.doc.resolve(imagePos);

  for (let depth = $pos.depth; depth > 0; depth--) {
    if ($pos.node(depth).type.name !== "imageWithCaption") {
      continue;
    }

    const figure = $pos.node(depth);
    const imageNode = figure.firstChild;
    if (!imageNode || imageNode.type.name !== "image") {
      return;
    }

    const captionContentPos = $pos.start(depth) + imageNode.nodeSize + 1;
    editor.chain().focus().setTextSelection(captionContentPos).run();
    return;
  }
}

function parseNumericAttr(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function getSizeAttrs(node: ProseMirrorNode): ImageSizeAttrs {
  return {
    width: node.attrs.width,
    height: node.attrs.height,
    originalWidth: node.attrs.originalWidth,
    originalHeight: node.attrs.originalHeight,
  };
}

function createImageElement(
  HTMLAttributes: Record<string, unknown>,
  nodeHTMLAttributes: Record<string, unknown>,
  src: string,
) {
  const el = document.createElement("img");
  el.draggable = false;

  const mergedAttributes = mergeAttributes(HTMLAttributes, nodeHTMLAttributes);

  Object.entries(mergedAttributes).forEach(([key, value]) => {
    if (value == null) {
      return;
    }

    switch (key) {
      case "src":
      case "width":
      case "height":
      case "originalWidth":
      case "originalHeight":
      case "imageId":
        break;
      default:
        el.setAttribute(key, String(value));
        break;
    }
  });

  if (src) {
    el.src = src;
  }

  return el;
}

function createReadOnlyImageNodeView(
  HTMLAttributes: Record<string, unknown>,
  nodeHTMLAttributes: Record<string, unknown>,
  node: ProseMirrorNode,
  editor: Editor,
) {
  const el = createImageElement(
    HTMLAttributes,
    nodeHTMLAttributes,
    resolveImageAttrSrc(editor, node.attrs),
  );
  applyImageDisplayStyles(el, getSizeAttrs(node));

  return {
    dom: el,
    update: (updatedNode: ProseMirrorNode) => {
      if (updatedNode.type.name !== "image") {
        return false;
      }

      el.src = resolveImageAttrSrc(editor, updatedNode.attrs);
      applyImageDisplayStyles(el, getSizeAttrs(updatedNode));
      return true;
    },
  };
}

// https://tiptap.dev/docs/editor/extensions/nodes/image
export const Image = BaseImage.extend({
  group: "image-with-caption-group",

  selectable: false,
  draggable: false,

  addOptions() {
    return {
      ...this.parent?.(),
      allowBase64: true,
      resize: {
        enabled: true,
        directions: ["left", "right"] as const,
        minWidth: 100,
        minHeight: 100,
        alwaysPreserveAspectRatio: true,
      },
    };
  },

  addAttributes() {
    return {
      ...this.parent?.(),
      imageId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-image-id"),
        renderHTML: (attributes) => {
          if (!attributes.imageId) {
            return {};
          }

          return {
            "data-image-id": attributes.imageId,
          };
        },
      },
      src: {
        default: null,
        parseHTML: (element) => element.getAttribute("src"),
        renderHTML: (attributes) => {
          if (attributes.imageId || !attributes.src) {
            return {};
          }

          return {
            src: attributes.src,
          };
        },
      },
      originalWidth: {
        default: null,
        parseHTML: (element) =>
          parseNumericAttr(element.getAttribute("data-original-width")),
        renderHTML: (attributes) => {
          if (!attributes.originalWidth) {
            return {};
          }

          return {
            "data-original-width": attributes.originalWidth,
          };
        },
      },
      originalHeight: {
        default: null,
        parseHTML: (element) =>
          parseNumericAttr(element.getAttribute("data-original-height")),
        renderHTML: (attributes) => {
          if (!attributes.originalHeight) {
            return {};
          }

          return {
            "data-original-height": attributes.originalHeight,
          };
        },
      },
    };
  },

  addNodeView() {
    if (
      !this.options.resize ||
      !this.options.resize.enabled ||
      typeof document === "undefined"
    ) {
      return null;
    }

    const { directions, minWidth, minHeight, alwaysPreserveAspectRatio } =
      this.options.resize;
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const extension = this;

    return ({ node, getPos, HTMLAttributes, editor }) => {
      if (!editor.isEditable) {
        return createReadOnlyImageNodeView(
          extension.options.HTMLAttributes,
          HTMLAttributes,
          node,
          editor,
        );
      }

      let currentNode = node;
      const el = createImageElement(
        extension.options.HTMLAttributes,
        HTMLAttributes,
        resolveImageAttrSrc(editor, currentNode.attrs),
      );
      applyImageDisplayStyles(el, getSizeAttrs(currentNode));

      let lastCommittedWidth =
        currentNode.attrs.width ?? currentNode.attrs.originalWidth ?? 0;

      const nodeView = new ResizableNodeView({
        element: el,
        editor,
        node: currentNode,
        getPos,
        onResize: (width) => {
          lastCommittedWidth = width;
          applyImageDisplayStyles(el, {
            ...getSizeAttrs(currentNode),
            width,
          });
        },
        onCommit: () => {
          const pos = getPos();
          if (pos === undefined) {
            return;
          }

          const sizeAttrs = getSizeAttrs(currentNode);
          const width = lastCommittedWidth;
          const height = getHeightForWidth(width, sizeAttrs);

          editor
            .chain()
            .focus()
            .updateAttributes(extension.name, {
              width,
              height,
              originalWidth:
                sizeAttrs.originalWidth ??
                currentNode.attrs.originalWidth ??
                width,
              originalHeight:
                sizeAttrs.originalHeight ??
                currentNode.attrs.originalHeight ??
                height,
            })
            .run();

          applyImageDisplayStyles(el, {
            ...sizeAttrs,
            width,
            height,
          });
        },
        onUpdate: (updatedNode) => {
          if (updatedNode.type !== currentNode.type) {
            return false;
          }

          currentNode = updatedNode;
          el.src = resolveImageAttrSrc(editor, currentNode.attrs);
          applyImageDisplayStyles(el, getSizeAttrs(currentNode));
          return true;
        },
        options: {
          directions,
          min: {
            width: minWidth,
            height: minHeight,
          },
          preserveAspectRatio: alwaysPreserveAspectRatio === true,
        },
      });

      const dom = nodeView.dom as HTMLElement;
      dom.style.visibility = "hidden";
      dom.style.pointerEvents = "none";

      el.onload = () => {
        dom.style.visibility = "";
        dom.style.pointerEvents = "";

        if (currentNode.attrs.originalWidth || !el.naturalWidth) {
          applyImageDisplayStyles(el, getSizeAttrs(currentNode));
          return;
        }

        const pos = getPos();
        if (pos === undefined) {
          return;
        }

        const width = currentNode.attrs.width ?? el.naturalWidth;
        const sizeAttrs = {
          originalWidth: el.naturalWidth,
          originalHeight: el.naturalHeight,
          width,
          height: getHeightForWidth(width, {
            originalWidth: el.naturalWidth,
            originalHeight: el.naturalHeight,
          }),
        };

        editor.commands.command(({ tr, dispatch }) => {
          if (dispatch) {
            tr.setNodeMarkup(pos, undefined, {
              ...currentNode.attrs,
              ...sizeAttrs,
            });
          }

          return true;
        });

        applyImageDisplayStyles(el, sizeAttrs);
      };

      dom.addEventListener("click", (event) => {
        const pos = getPos();
        if (pos === undefined) {
          return;
        }

        selectImageBlock(editor, pos);
        event.preventDefault();
      });

      return nodeView;
    };
  },

  addProseMirrorPlugins() {
    const parentPlugins = this.parent?.() || [];

    return [
      createImageResizeTouchFixPlugin(),
      ...parentPlugins.filter(
        (plugin: Plugin) => plugin.key !== "imageClipboardParser",
      ),
      new Plugin({
        key: new PluginKey("imageClipboardParser"),
        props: {
          handlePaste: (view, event) => {
            const items = event.clipboardData?.items;
            if (!items) {
              return false;
            }

            for (let i = 0; i < items.length; i++) {
              const item = items[i];
              if (item.type.startsWith("image/")) {
                const file = item.getAsFile();
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (e) => {
                    const dataUrl = e.target?.result as string;
                    if (dataUrl) {
                      const currentState = view.state;
                      const currentFrom = currentState.selection.from;

                      const placeholderNode =
                        currentState.schema.nodes.imageUploadPlaceholder.create(
                          {
                            fileDataUrl: dataUrl,
                          },
                        );

                      const tr = currentState.tr.insert(
                        currentFrom,
                        placeholderNode,
                      );
                      view.dispatch(tr);
                    }
                  };
                  reader.readAsDataURL(file);

                  return true;
                }
              }
            }

            return false;
          },
        },
      }),
    ];
  },
});
