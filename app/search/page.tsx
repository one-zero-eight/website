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
      <SearchField />
    </div>
  );
}
