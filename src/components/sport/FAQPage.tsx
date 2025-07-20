import React, { useState, useMemo, useEffect } from "react";
import {
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Search,
  BookOpen,
  Users,
  Clock,
  Calendar,
  Filter,
  X,
  LucideIcon,
  Loader2,
} from "lucide-react";
import { searchFAQItems } from "./utils/searchUtils";
import { faqAPI, FAQResponse } from "./services/api";

interface FAQItem {
  id: number;
  question: string;
  answer: string;
}

interface FAQItemWithSearch extends FAQItem {
  searchScore: number;
  searchMatches: string[];
}

interface FAQCategory {
  id: number;
  title: string;
  icon: LucideIcon;
  color: string;
  items: FAQItem[];
}

const FAQPage: React.FC = () => {
  const [openItems, setOpenItems] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchOptions, setSearchOptions] = useState({
    typoTolerance: true,
    multiWordSupport: true,
    exactMatch: false,
    fuzzyThreshold: 0.7,
  });
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [faqData, setFaqData] = useState<FAQResponse>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load FAQ data from API
  useEffect(() => {
    const loadFAQ = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await faqAPI.getFAQ();
        setFaqData(data);
        console.log("📋 FAQ data loaded:", data);
      } catch (error) {
        console.error("Error loading FAQ:", error);
        setError("Failed to load FAQ data. Please try again later.");
        // Set fallback data if API fails
        setFaqData({
          "How many hours should I get per semester?":
            "You should get 30 hours.",
          "How can I get sport hours throught a semester?":
            "Firstly, choose a sport or sportclub for whole semester.\r\nSecondly, try to train at least once per week on schedule.\r\n\r\nAdditional opportunities to get extra hours:\r\n1) Use self sports variants and upload results on site.\r\n2) Participate on sports events.",
          "I have medical reference about illness what do I need to do?":
            "Upload this reference on site.\r\nAfter approving you'll get 2 sport hours per week depending on the time frame.",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadFAQ();
  }, []);

  // Convert FAQ data to categorized format
  const faqCategories: FAQCategory[] = useMemo(() => {
    if (!faqData || Object.keys(faqData).length === 0) {
      return [];
    }

    // Function to categorize FAQ items based on keywords
    const categorizeItem = (question: string): number => {
      const lowerQuestion = question.toLowerCase();

      if (
        lowerQuestion.includes("medical") ||
        lowerQuestion.includes("health") ||
        lowerQuestion.includes("illness") ||
        lowerQuestion.includes("injury") ||
        lowerQuestion.includes("insurance")
      ) {
        return 4; // Medical & Health
      }
      if (
        lowerQuestion.includes("hours") ||
        lowerQuestion.includes("semester") ||
        lowerQuestion.includes("exam") ||
        lowerQuestion.includes("project") ||
        lowerQuestion.includes("test")
      ) {
        return 1; // Requirements & Hours
      }
      if (
        lowerQuestion.includes("sport") ||
        lowerQuestion.includes("change") ||
        lowerQuestion.includes("choose") ||
        lowerQuestion.includes("group")
      ) {
        return 2; // Sports & Activities
      }
      if (
        lowerQuestion.includes("online") ||
        lowerQuestion.includes("student")
      ) {
        return 3; // Online Students
      }

      return 5; // General
    };

    const categories = [
      {
        id: 1,
        title: "Requirements & Hours",
        icon: BookOpen,
        color: "bg-blue-500/10 text-blue-500",
        items: [] as FAQItem[],
      },
      {
        id: 2,
        title: "Sports & Activities",
        icon: Calendar,
        color: "bg-brand-violet/10 text-brand-violet",
        items: [] as FAQItem[],
      },
      {
        id: 3,
        title: "Online Students",
        icon: Users,
        color: "bg-green-500/10 text-green-500",
        items: [] as FAQItem[],
      },
      {
        id: 4,
        title: "Medical & Health",
        icon: Clock,
        color: "bg-red-500/10 text-red-500",
        items: [] as FAQItem[],
      },
      {
        id: 5,
        title: "General Information",
        icon: HelpCircle,
        color: "bg-orange-500/10 text-orange-500",
        items: [] as FAQItem[],
      },
    ];

    let itemId = 1;
    Object.entries(faqData).forEach(([question, answer]) => {
      const categoryId = categorizeItem(question);
      const category = categories.find((c) => c.id === categoryId);

      if (category) {
        category.items.push({
          id: itemId++,
          question,
          answer: answer.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n"), // Convert escaped newlines
        });
      }
    });

    // Filter out empty categories
    return categories.filter((category) => category.items.length > 0);
  }, [faqData]);

  const toggleItem = (itemId: number) => {
    setOpenItems((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId],
    );
  };

  const filteredCategories = useMemo(() => {
    if (!searchTerm.trim()) {
      return faqCategories.map((category) => ({
        ...category,
        items: category.items.map((item) => ({
          ...item,
          searchScore: 0,
          searchMatches: [],
        })),
      }));
    }

    return faqCategories
      .map((category) => {
        const allItems = category.items;
        const searchResults = searchFAQItems(
          allItems,
          searchTerm,
          searchOptions,
        );

        return {
          ...category,
          items: searchResults,
        };
      })
      .filter((category) => category.items.length > 0);
  }, [faqCategories, searchTerm, searchOptions]);

  const clearSearch = () => {
    setSearchTerm("");
    setOpenItems([]);
  };

  const toggleAllInCategory = (categoryId: number) => {
    const category = filteredCategories.find((c) => c.id === categoryId);
    if (!category) return;

    const categoryItemIds = category.items.map((item) => item.id);
    const allCategoryItemsOpen = categoryItemIds.every((id) =>
      openItems.includes(id),
    );

    if (allCategoryItemsOpen) {
      // Close all items in this category
      setOpenItems((prev) =>
        prev.filter((id) => !categoryItemIds.includes(id)),
      );
    } else {
      // Open all items in this category
      setOpenItems((prev) => [...new Set([...prev, ...categoryItemIds])]);
    }
  };

  const renderAnswer = (answer: string) => {
    // Handle HTML content
    if (answer.includes("<p>") || answer.includes("<strong>")) {
      return <div dangerouslySetInnerHTML={{ __html: answer }} />;
    }

    // Handle plain text with line breaks
    return (
      <div>
        {answer.split("\n").map((line, index) => (
          <React.Fragment key={index}>
            {line}
            {index < answer.split("\n").length - 1 && <br />}
          </React.Fragment>
        ))}
      </div>
    );
  };

  const highlightText = (text: string, matches: string[]) => {
    if (!matches.length) return text;

    const regex = new RegExp(`(${matches.join("|")})`, "gi");
    const parts = text.split(regex);

    return parts.map((part, index) =>
      matches.some((match) =>
        part.toLowerCase().includes(match.toLowerCase()),
      ) ? (
        <mark
          key={index}
          className="rounded bg-yellow-200 px-1 text-yellow-900"
        >
          {part}
        </mark>
      ) : (
        <span key={index}>{part}</span>
      ),
    );
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-8 p-6">
        <div className="py-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-violet/20 to-brand-violet/10">
            <Loader2 className="h-8 w-8 animate-spin text-brand-violet" />
          </div>
          <h2 className="mb-2 text-xl font-semibold text-contrast">
            Loading FAQ
          </h2>
          <p className="text-inactive">
            Please wait while we fetch the latest FAQ data...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6">
      {/* Header */}
      <div className="text-center">
        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-violet/20 to-brand-violet/10">
          <HelpCircle className="h-8 w-8 text-brand-violet" />
        </div>
        <h1 className="mb-4 bg-gradient-to-r from-brand-violet to-brand-violet/80 bg-clip-text text-3xl font-bold text-contrast text-transparent sm:text-4xl">
          Frequently Asked Questions
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-inactive">
          Find answers to common questions about sports requirements, booking
          sessions, and more.
        </p>
        {error && (
          <div className="mt-4 rounded-xl border border-orange-500/20 bg-orange-500/10 p-4 text-sm text-orange-500">
            {error}
          </div>
        )}
      </div>

      {/* Search Section */}
      <div className="innohassle-card border-2 border-secondary/50 bg-gradient-to-br from-floating to-primary/30 p-6 transition-all duration-300 hover:border-brand-violet/30">
        <div className="space-y-4">
          {/* Main Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 transform text-inactive" />
            <input
              type="text"
              placeholder="Search FAQ items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-2xl border-2 border-secondary/50 bg-primary/50 py-4 pl-12 pr-12 text-contrast placeholder-inactive transition-all duration-200 focus:border-brand-violet focus:outline-none"
            />
            {searchTerm && (
              <button
                onClick={clearSearch}
                className="absolute right-4 top-1/2 -translate-y-1/2 transform text-inactive transition-colors hover:text-contrast"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Advanced Search Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm text-inactive">
              <Search className="h-4 w-4" />
              <span>
                {searchTerm
                  ? `Found ${filteredCategories.reduce((acc, cat) => acc + cat.items.length, 0)} results`
                  : `${faqCategories.reduce((acc, cat) => acc + cat.items.length, 0)} FAQ items available`}
              </span>
            </div>
            <button
              onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
              className="flex items-center space-x-2 text-sm text-brand-violet transition-colors hover:text-brand-violet/80"
            >
              <Filter className="h-4 w-4" />
              <span>Advanced Search</span>
              {showAdvancedSearch ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* Advanced Search Options */}
          {showAdvancedSearch && (
            <div className="rounded-xl border border-secondary/30 bg-primary/30 p-4">
              <h4 className="mb-3 text-sm font-semibold text-contrast">
                Search Options
              </h4>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={searchOptions.typoTolerance}
                    onChange={(e) =>
                      setSearchOptions((prev) => ({
                        ...prev,
                        typoTolerance: e.target.checked,
                      }))
                    }
                    className="rounded border-secondary/50 text-brand-violet focus:ring-brand-violet focus:ring-offset-0"
                  />
                  <span className="text-contrast">Typo tolerance</span>
                </label>
                <label className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={searchOptions.multiWordSupport}
                    onChange={(e) =>
                      setSearchOptions((prev) => ({
                        ...prev,
                        multiWordSupport: e.target.checked,
                      }))
                    }
                    className="rounded border-secondary/50 text-brand-violet focus:ring-brand-violet focus:ring-offset-0"
                  />
                  <span className="text-contrast">Multi-word search</span>
                </label>
                <label className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={searchOptions.exactMatch}
                    onChange={(e) =>
                      setSearchOptions((prev) => ({
                        ...prev,
                        exactMatch: e.target.checked,
                      }))
                    }
                    className="rounded border-secondary/50 text-brand-violet focus:ring-brand-violet focus:ring-offset-0"
                  />
                  <span className="text-contrast">Exact match only</span>
                </label>
                <div className="flex items-center space-x-2 text-sm">
                  <span className="text-contrast">Fuzzy threshold:</span>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.1"
                    value={searchOptions.fuzzyThreshold}
                    onChange={(e) =>
                      setSearchOptions((prev) => ({
                        ...prev,
                        fuzzyThreshold: parseFloat(e.target.value),
                      }))
                    }
                    className="flex-1 accent-brand-violet"
                  />
                  <span className="w-8 text-inactive">
                    {searchOptions.fuzzyThreshold}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* FAQ Categories */}
      <div className="space-y-6">
        {filteredCategories.length === 0 ? (
          <div className="innohassle-card py-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-secondary/30 to-secondary/20">
              <Search className="h-8 w-8 text-inactive" />
            </div>
            <h3 className="mb-2 text-xl font-semibold text-contrast">
              No results found
            </h3>
            <p className="mb-4 text-inactive">
              Try adjusting your search terms or browse all categories below.
            </p>
            <button
              onClick={clearSearch}
              className="innohassle-button-primary px-6 py-2"
            >
              Clear Search
            </button>
          </div>
        ) : (
          filteredCategories.map((category) => (
            <div
              key={category.id}
              className="innohassle-card overflow-hidden border-2 border-secondary/30 transition-all duration-300 hover:border-brand-violet/40"
            >
              {/* Category Header */}
              <div className="border-b border-secondary/50 bg-gradient-to-r from-primary/50 to-secondary/30 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${category.color}`}
                    >
                      <category.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-contrast">
                        {category.title}
                      </h2>
                      <p className="text-sm text-inactive">
                        {category.items.length} question
                        {category.items.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleAllInCategory(category.id)}
                    className="innohassle-button-secondary px-4 py-2 text-sm"
                  >
                    {category.items.every((item) => openItems.includes(item.id))
                      ? "Collapse All"
                      : "Expand All"}
                  </button>
                </div>
              </div>

              {/* FAQ Items */}
              <div className="divide-y divide-secondary/30">
                {category.items.map((item) => (
                  <div key={item.id} className="group">
                    {/* Question */}
                    <button
                      onClick={() => toggleItem(item.id)}
                      className="w-full px-6 py-5 text-left transition-all duration-200 hover:bg-primary/30 focus:bg-primary/40 focus:outline-none"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 pr-4">
                          <h3 className="text-lg font-semibold text-contrast transition-colors duration-200 group-hover:text-brand-violet">
                            {highlightText(
                              item.question,
                              (item as FAQItemWithSearch).searchMatches || [],
                            )}
                          </h3>
                          {(item as FAQItemWithSearch).searchScore > 0 && (
                            <p className="mt-1 text-sm text-brand-violet">
                              Search relevance:{" "}
                              {(
                                (item as FAQItemWithSearch).searchScore * 100
                              ).toFixed(0)}
                              %
                            </p>
                          )}
                        </div>
                        <div className="flex-shrink-0">
                          {openItems.includes(item.id) ? (
                            <ChevronUp className="h-5 w-5 text-brand-violet" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-inactive transition-colors duration-200 group-hover:text-brand-violet" />
                          )}
                        </div>
                      </div>
                    </button>

                    {/* Answer */}
                    {openItems.includes(item.id) && (
                      <div className="px-6 pb-5 pt-2">
                        <div className="rounded-2xl border border-secondary/30 bg-gradient-to-r from-floating to-primary/20 p-4">
                          <div className="prose prose-sm max-w-none text-contrast prose-headings:text-contrast prose-p:text-contrast prose-strong:text-contrast prose-li:text-contrast">
                            {renderAnswer(item.answer)}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Help Section */}
      <div className="innohassle-card border-2 border-brand-violet/20 bg-gradient-to-br from-brand-violet/5 via-transparent to-brand-violet/10 p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-violet/20 to-brand-violet/10">
          <HelpCircle className="h-8 w-8 text-brand-violet" />
        </div>
        <h3 className="mb-2 text-xl font-bold text-contrast">
          Still have questions?
        </h3>
        <p className="mb-4 text-inactive">
          Can't find what you're looking for? Contact our support team for
          personalized assistance.
        </p>
        <div className="flex flex-col justify-center gap-4 sm:flex-row">
          <button className="innohassle-button-primary px-6 py-3">
            Contact Support
          </button>
          <button className="innohassle-button-secondary px-6 py-3">
            Request FAQ Topic
          </button>
        </div>
      </div>
    </div>
  );
};

export default FAQPage;
