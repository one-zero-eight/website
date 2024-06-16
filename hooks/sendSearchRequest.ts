export type requestData = {
  searchText: string;
};

export type responseData = {
  file: string | null;
  searchText: string;
};

const url: string = "https://get_pdfs.com/";

export async function sendSearchRequest(
  data: requestData,
): Promise<responseData[]> {
  try {
    const response = await fetch(
      `${url}${encodeURIComponent(data.searchText)}`,
    );
    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }

    const result = await response.json();

    const responseData: responseData[] = result.items.map((item: any) => ({
      file: item.full_name,
      searchText: data.searchText,
    }));

    return responseData;
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error;
  }
}

export async function findPdfFile(data: requestData): Promise<responseData> {
  const available_pdfs: responseData[] = [
    {
      file: "https://ontheline.trincoll.edu/images/bookdown/sample-local-pdf.pdf",
      searchText: "Example pdf",
    },
    {
      file: "https://digitaldesignschool.github.io/data/schoolRISCV/doc/riscv-spec-20191213.pdf",
      searchText: "RISC-V instructions",
    },
    {
      file: "https://arxiv.org/pdf/1706.03762",
      searchText: "Transformers",
    },
  ];

  for (const pdf of available_pdfs) {
    if (
      pdf.searchText
        .toLocaleLowerCase()
        .includes(data.searchText.toLocaleLowerCase())
    ) {
      return pdf;
    }
  }

  return { file: null, searchText: data.searchText };
}
