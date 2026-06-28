export type EditorImageHandlers = {
  resolveImageUrl: (imageId: string) => string;
  uploadImage?: (file: File) => Promise<string>;
};

declare module "@tiptap/core" {
  interface Storage {
    editorImageHandlers: EditorImageHandlers;
  }
}
