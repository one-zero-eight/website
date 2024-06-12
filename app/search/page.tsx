"use client";
import SearchResult from "@/components/search/SearchResult";
import SearchField from "@/components/search/searchfield";

const styles = {
  searchPage: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "20px",
  },
};

export default function Page() {
  return (
    <div className="search-page" style={styles.searchPage}>
      <div className="my-4 grid grid-cols-1 gap-4 @xl/content:grid-cols-2">
        <SearchField />
        <SearchResult />
      </div>
    </div>
  );
}
