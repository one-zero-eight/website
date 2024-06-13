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
  searchText: "PDF",
};

export default function Page() {
  return (
    <div className="search-page" style={styles.searchPage}>
      <div className="my-4 grid grid-cols-1 gap-4 @xl/content:grid-cols-2">
        <SearchField />
        <SearchResult
          file={preview_props.file}
          searchText={preview_props.searchText}
        />
      </div>
    </div>
  );
}
