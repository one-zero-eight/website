import React, { useState, useMemo, useEffect } from 'react';
import { ChevronDown, ChevronUp, HelpCircle, Search, BookOpen, Users, Clock, Calendar, Filter, X, LucideIcon, Loader2 } from 'lucide-react';
import { searchFAQItems } from '../utils/searchUtils';
import { faqAPI, FAQResponse } from '../services/api';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [searchOptions, setSearchOptions] = useState({
    typoTolerance: true,
    multiWordSupport: true,
    exactMatch: false,
    fuzzyThreshold: 0.7
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
        console.log('📋 FAQ data loaded:', data);
      } catch (error) {
        console.error('Error loading FAQ:', error);
        setError('Failed to load FAQ data. Please try again later.');
        // Set fallback data if API fails
        setFaqData({
          "How many hours should I get per semester?": "You should get 30 hours.",
          "How can I get sport hours throught a semester?": "Firstly, choose a sport or sportclub for whole semester.\r\nSecondly, try to train at least once per week on schedule.\r\n\r\nAdditional opportunities to get extra hours:\r\n1) Use self sports variants and upload results on site.\r\n2) Participate on sports events.",
          "I have medical reference about illness what do I need to do?": "Upload this reference on site.\r\nAfter approving you'll get 2 sport hours per week depending on the time frame."
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
      
      if (lowerQuestion.includes('medical') || lowerQuestion.includes('health') || lowerQuestion.includes('illness') || lowerQuestion.includes('injury') || lowerQuestion.includes('insurance')) {
        return 4; // Medical & Health
      }
      if (lowerQuestion.includes('hours') || lowerQuestion.includes('semester') || lowerQuestion.includes('exam') || lowerQuestion.includes('project') || lowerQuestion.includes('test')) {
        return 1; // Requirements & Hours
      }
      if (lowerQuestion.includes('sport') || lowerQuestion.includes('change') || lowerQuestion.includes('choose') || lowerQuestion.includes('group')) {
        return 2; // Sports & Activities
      }
      if (lowerQuestion.includes('online') || lowerQuestion.includes('student')) {
        return 3; // Online Students
      }
      
      return 5; // General
    };

    const categories = [
      {
        id: 1,
        title: 'Requirements & Hours',
        icon: BookOpen,
        color: 'bg-blue-500/10 text-blue-500',
        items: [] as FAQItem[]
      },
      {
        id: 2,
        title: 'Sports & Activities',
        icon: Calendar,
        color: 'bg-brand-violet/10 text-brand-violet',
        items: [] as FAQItem[]
      },
      {
        id: 3,
        title: 'Online Students',
        icon: Users,
        color: 'bg-green-500/10 text-green-500',
        items: [] as FAQItem[]
      },
      {
        id: 4,
        title: 'Medical & Health',
        icon: Clock,
        color: 'bg-red-500/10 text-red-500',
        items: [] as FAQItem[]
      },
      {
        id: 5,
        title: 'General Information',
        icon: HelpCircle,
        color: 'bg-orange-500/10 text-orange-500',
        items: [] as FAQItem[]
      }
    ];

    let itemId = 1;
    Object.entries(faqData).forEach(([question, answer]) => {
      const categoryId = categorizeItem(question);
      const category = categories.find(c => c.id === categoryId);
      
      if (category) {
        category.items.push({
          id: itemId++,
          question,
          answer: answer.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n') // Convert escaped newlines
        });
      }
    });

    // Filter out empty categories
    return categories.filter(category => category.items.length > 0);
  }, [faqData]);

  const toggleItem = (itemId: number) => {
    setOpenItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const filteredCategories = useMemo(() => {
    if (!searchTerm.trim()) {
      return faqCategories.map(category => ({
        ...category,
        items: category.items.map(item => ({
          ...item,
          searchScore: 0,
          searchMatches: []
        }))
      }));
    }

    return faqCategories.map(category => {
      const allItems = category.items;
      const searchResults = searchFAQItems(allItems, searchTerm, searchOptions);
      
      return {
        ...category,
        items: searchResults
      };
    }).filter(category => category.items.length > 0);
  }, [faqCategories, searchTerm, searchOptions]);

  const clearSearch = () => {
    setSearchTerm('');
    setOpenItems([]);
  };

  const toggleAllInCategory = (categoryId: number) => {
    const category = filteredCategories.find(c => c.id === categoryId);
    if (!category) return;

    const categoryItemIds = category.items.map(item => item.id);
    const allCategoryItemsOpen = categoryItemIds.every(id => openItems.includes(id));
    
    if (allCategoryItemsOpen) {
      // Close all items in this category
      setOpenItems(prev => prev.filter(id => !categoryItemIds.includes(id)));
    } else {
      // Open all items in this category
      setOpenItems(prev => [...new Set([...prev, ...categoryItemIds])]);
    }
  };

  const renderAnswer = (answer: string) => {
    // Handle HTML content
    if (answer.includes('<p>') || answer.includes('<strong>')) {
      return <div dangerouslySetInnerHTML={{ __html: answer }} />;
    }
    
    // Handle plain text with line breaks
    return (
      <div>
        {answer.split('\n').map((line, index) => (
          <React.Fragment key={index}>
            {line}
            {index < answer.split('\n').length - 1 && <br />}
          </React.Fragment>
        ))}
      </div>
    );
  };

  const highlightText = (text: string, matches: string[]) => {
    if (!matches.length) return text;
    
    const regex = new RegExp(`(${matches.join('|')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      matches.some(match => part.toLowerCase().includes(match.toLowerCase())) ? (
        <mark key={index} className="bg-yellow-200 text-yellow-900 px-1 rounded">
          {part}
        </mark>
      ) : (
        <span key={index}>{part}</span>
      )
    );
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-brand-violet/20 to-brand-violet/10 rounded-2xl flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-brand-violet animate-spin" />
          </div>
          <h2 className="text-xl font-semibold text-contrast mb-2">Loading FAQ</h2>
          <p className="text-inactive">Please wait while we fetch the latest FAQ data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 mb-4 bg-gradient-to-br from-brand-violet/20 to-brand-violet/10 rounded-2xl">
          <HelpCircle className="w-8 h-8 text-brand-violet" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-contrast mb-4 bg-gradient-to-r from-brand-violet to-brand-violet/80 bg-clip-text text-transparent">
          Frequently Asked Questions
        </h1>
        <p className="text-lg text-inactive max-w-2xl mx-auto">
          Find answers to common questions about sports requirements, booking sessions, and more.
        </p>
        {error && (
          <div className="mt-4 p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl text-orange-500 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Search Section */}
      <div className="innohassle-card p-6 bg-gradient-to-br from-floating to-primary/30 border-2 border-secondary/50 hover:border-brand-violet/30 transition-all duration-300">
        <div className="space-y-4">
          {/* Main Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-inactive w-5 h-5" />
            <input
              type="text"
              placeholder="Search FAQ items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-12 py-4 bg-primary/50 border-2 border-secondary/50 rounded-2xl focus:border-brand-violet focus:outline-none text-contrast placeholder-inactive transition-all duration-200"
            />
            {searchTerm && (
              <button
                onClick={clearSearch}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-inactive hover:text-contrast transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Advanced Search Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm text-inactive">
              <Search className="w-4 h-4" />
              <span>
                {searchTerm 
                  ? `Found ${filteredCategories.reduce((acc, cat) => acc + cat.items.length, 0)} results` 
                  : `${faqCategories.reduce((acc, cat) => acc + cat.items.length, 0)} FAQ items available`
                }
              </span>
            </div>
            <button
              onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
              className="flex items-center space-x-2 text-sm text-brand-violet hover:text-brand-violet/80 transition-colors"
            >
              <Filter className="w-4 h-4" />
              <span>Advanced Search</span>
              {showAdvancedSearch ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {/* Advanced Search Options */}
          {showAdvancedSearch && (
            <div className="bg-primary/30 rounded-xl p-4 border border-secondary/30">
              <h4 className="text-sm font-semibold text-contrast mb-3">Search Options</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={searchOptions.typoTolerance}
                    onChange={(e) => setSearchOptions(prev => ({ ...prev, typoTolerance: e.target.checked }))}
                    className="rounded border-secondary/50 text-brand-violet focus:ring-brand-violet focus:ring-offset-0"
                  />
                  <span className="text-contrast">Typo tolerance</span>
                </label>
                <label className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={searchOptions.multiWordSupport}
                    onChange={(e) => setSearchOptions(prev => ({ ...prev, multiWordSupport: e.target.checked }))}
                    className="rounded border-secondary/50 text-brand-violet focus:ring-brand-violet focus:ring-offset-0"
                  />
                  <span className="text-contrast">Multi-word search</span>
                </label>
                <label className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={searchOptions.exactMatch}
                    onChange={(e) => setSearchOptions(prev => ({ ...prev, exactMatch: e.target.checked }))}
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
                    onChange={(e) => setSearchOptions(prev => ({ ...prev, fuzzyThreshold: parseFloat(e.target.value) }))}
                    className="flex-1 accent-brand-violet"
                  />
                  <span className="text-inactive w-8">{searchOptions.fuzzyThreshold}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* FAQ Categories */}
      <div className="space-y-6">
        {filteredCategories.length === 0 ? (
          <div className="text-center py-12 innohassle-card">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-secondary/30 to-secondary/20 rounded-2xl flex items-center justify-center">
              <Search className="w-8 h-8 text-inactive" />
            </div>
            <h3 className="text-xl font-semibold text-contrast mb-2">No results found</h3>
            <p className="text-inactive mb-4">
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
            <div key={category.id} className="innohassle-card overflow-hidden border-2 border-secondary/30 hover:border-brand-violet/40 transition-all duration-300">
              {/* Category Header */}
              <div className="bg-gradient-to-r from-primary/50 to-secondary/30 border-b border-secondary/50 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${category.color}`}>
                      <category.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-contrast">{category.title}</h2>
                      <p className="text-sm text-inactive">
                        {category.items.length} question{category.items.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleAllInCategory(category.id)}
                    className="innohassle-button-secondary px-4 py-2 text-sm"
                  >
                    {category.items.every(item => openItems.includes(item.id)) ? 'Collapse All' : 'Expand All'}
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
                      className="w-full px-6 py-5 text-left hover:bg-primary/30 transition-all duration-200 focus:outline-none focus:bg-primary/40"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 pr-4">
                          <h3 className="text-lg font-semibold text-contrast group-hover:text-brand-violet transition-colors duration-200">
                            {highlightText(item.question, (item as FAQItemWithSearch).searchMatches || [])}
                          </h3>
                          {(item as FAQItemWithSearch).searchScore > 0 && (
                            <p className="text-sm text-brand-violet mt-1">
                              Search relevance: {((item as FAQItemWithSearch).searchScore * 100).toFixed(0)}%
                            </p>
                          )}
                        </div>
                        <div className="flex-shrink-0">
                          {openItems.includes(item.id) ? (
                            <ChevronUp className="w-5 h-5 text-brand-violet" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-inactive group-hover:text-brand-violet transition-colors duration-200" />
                          )}
                        </div>
                      </div>
                    </button>

                    {/* Answer */}
                    {openItems.includes(item.id) && (
                      <div className="px-6 pb-5 pt-2">
                        <div className="bg-gradient-to-r from-floating to-primary/20 rounded-2xl p-4 border border-secondary/30">
                          <div className="prose prose-sm max-w-none text-contrast prose-headings:text-contrast prose-strong:text-contrast prose-p:text-contrast prose-li:text-contrast">
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
      <div className="text-center innohassle-card p-8 bg-gradient-to-br from-brand-violet/5 via-transparent to-brand-violet/10 border-2 border-brand-violet/20">
        <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-brand-violet/20 to-brand-violet/10 rounded-2xl flex items-center justify-center">
          <HelpCircle className="w-8 h-8 text-brand-violet" />
        </div>
        <h3 className="text-xl font-bold text-contrast mb-2">Still have questions?</h3>
        <p className="text-inactive mb-4">
          Can't find what you're looking for? Contact our support team for personalized assistance.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
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
