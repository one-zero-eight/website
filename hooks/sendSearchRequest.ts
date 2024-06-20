function deepClone<T>(obj: T): T {
  if (typeof obj !== "object" || obj === null) {
    return obj; // базовый случай: возвращаем примитивы и null как есть
  }

  if (Array.isArray(obj)) {
    // если объект является массивом, клонируем каждый элемент
    return obj.map((item) => deepClone(item)) as any;
  }

  // если объект не является массивом, клонируем его свойства
  const clonedObj = {} as T;
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      clonedObj[key] = deepClone(obj[key]);
    }
  }

  return clonedObj;
}

export type requestData = {
  searchText: string;
};

export type MoodleSource = {
  type: "moodle";
  course_id: number;
  course_name: string;
  module_id: number;
  module_name: string;
  data_id: number;
  display_name: string;
  resource_type: string;
  resource_download_url: string;
  resource_preview_url: string;
  preview_location: {
    page_index: number;
  };
};

export type TelegramSource = {
  type: "telegram";
  chat_username: string;
  chat_title: string;
  message_id: number;
  link: string;
};

export type Response = {
  markdown_text: string;
  sources: (MoodleSource | TelegramSource)[];
};

export type ResponseData = {
  search_text: string;
  responses: Response[] | null;
};

// const url: string = "https://get_pdfs.com/";

// export async function sendSearchRequest(
//   data: requestData,
// ): Promise<ResponseData> {
//   try {
//     const response = await fetch(
//       `${url}${encodeURIComponent(data.searchText)}`,
//     );
//     if (!response.ok) {
//       throw new Error(`Error: ${response.status}`);
//     }

//     const result = await response.json();

//     const responseData: ResponseData = result;

//     return responseData;
//   } catch (error) {
//     console.error("Error fetching data:", error);
//     throw error;
//   }
// }

const example: ResponseData = {
  search_text: "",
  responses: [
    {
      markdown_text:
        "# Computer Architecture. Week 2\n\n### Content of the Class:\n\n- The role of performance characteristics and their relation to computer speed\n- The measurement of performance characteristics\n- Decision-making based on various performance metrics\n- Programs to determine comprehensive performance indexes",
      sources: [
        {
          type: "moodle",
          course_id: 1114,
          course_name: "[F22] Fundamentals of Computer Architecture",
          module_id: 82752,
          module_name: "Week 01 - 01 August 2022",
          data_id: 82752,
          display_name: "Lecture 2 Slides Файл",
          resource_type: "pdf",
          resource_download_url:
            "https://ontheline.trincoll.edu/images/bookdown/sample-local-pdf.pdf",
          resource_preview_url:
            "https://ontheline.trincoll.edu/images/bookdown/sample-local-pdf.pdf",
          preview_location: {
            page_index: 1,
          },
        },
        {
          type: "telegram",
          chat_username: "one_zero_eight",
          chat_title: "one-zero-eight – 108",
          message_id: 63,
          link: "https://t.me/one_zero_eight/63",
        },
      ],
    },

    {
      markdown_text:
        "# Computer Architecture 2. Week 2\n\n### Content of the Class:\n\n- The role of performance characteristics and their relation to computer speed\n- The measurement of performance characteristics\n- Decision-making based on various performance metrics\n- Programs to determine comprehensive performance indexes",
      sources: [
        {
          type: "moodle",
          course_id: 1114,
          course_name: "[F22] Fundamentals of Computer Architecture",
          module_id: 82752,
          module_name: "Week 01 - 01 August 2022",
          data_id: 82752,
          display_name: "Lecture 2 Slides Файл",
          resource_type: "pdf",
          resource_download_url:
            "https://ontheline.trincoll.edu/images/bookdown/sample-local-pdf.pdf",
          resource_preview_url:
            "https://ontheline.trincoll.edu/images/bookdown/sample-local-pdf.pdf",
          preview_location: {
            page_index: 1,
          },
        },
        {
          type: "telegram",
          chat_username: "one_zero_eight",
          chat_title: "one-zero-eight – 108",
          message_id: 63,
          link: "https://t.me/one_zero_eight/63",
        },
      ],
    },
  ],
};

export async function sendSearchRequest(
  data: requestData,
): Promise<ResponseData> {
  const example1: ResponseData = deepClone(example);
  example1.search_text = "Computer";

  const example2: ResponseData = deepClone(example);
  example2.search_text = "Computer Networks";

  const available_responses: ResponseData[] = [example1, example2];
  console.log(example1.search_text);
  console.log(data.searchText);
  for (const response of available_responses) {
    if (
      response.search_text.toLocaleLowerCase() ==
      data.searchText.toLocaleLowerCase()
    ) {
      return response;
    }
  }

  return { search_text: data.searchText, responses: null };
}
