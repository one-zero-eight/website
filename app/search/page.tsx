"use client";
import SearchResult from "@/components/search/SearchResult";
import SearchField from "@/components/search/searchfield";
import { PdfPreviewProps } from "@/components/search/pdfpreview";
const styles = {
  searchPage: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "20px",
  },
};

const preview_props: PdfPreviewProps = {
  file: "https://ontheline.trincoll.edu/images/bookdown/sample-local-pdf.pdf",
  clipX: 100,
  clipY: 100,
  description: "Oi oi oi ue ni agariya kanke ne",
};

export default function Page() {
  return (
    <div className="search-page" style={styles.searchPage}>
      <div className="my-4 grid grid-cols-1 gap-4 @xl/content:grid-cols-2">
        <SearchField />
        <SearchResult
          file={preview_props.file}
          clipX={preview_props.clipX}
          clipY={preview_props.clipY}
          description={preview_props.description}
        />
      </div>
    </div>
  );
}
