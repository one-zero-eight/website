// Search utility functions for improved FAQ search
export interface SearchResult {
  score: number;
  matches: string[];
}

/**
 * Calculate Levenshtein distance between two strings
 * Used for fuzzy matching and typo tolerance
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1)
    .fill(null)
    .map(() => Array(str1.length + 1).fill(null));

  for (let i = 0; i <= str1.length; i++) {
    matrix[0][i] = i;
  }

  for (let j = 0; j <= str2.length; j++) {
    matrix[j][0] = j;
  }

  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Check if a word is similar to another word within a certain threshold
 */
export function isSimilarWord(word1: string, word2: string, threshold: number = 0.7): boolean {
  const maxLength = Math.max(word1.length, word2.length);
  if (maxLength === 0) return true;
  
  const distance = levenshteinDistance(word1.toLowerCase(), word2.toLowerCase());
  const similarity = 1 - distance / maxLength;
  
  return similarity >= threshold;
}

/**
 * Normalize text for search - remove special characters, convert to lowercase
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract keywords from text
 */
export function extractKeywords(text: string): string[] {
  const normalized = normalizeText(text);
  const stopWords = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
    'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
    'to', 'was', 'were', 'will', 'with', 'you', 'your', 'i', 'my',
    'me', 'we', 'us', 'they', 'them', 'this', 'can', 'do', 'how',
    'what', 'when', 'where', 'why', 'if', 'or', 'but', 'not', 'so'
  ]);
  
  return normalized
    .split(' ')
    .filter(word => word.length > 2 && !stopWords.has(word));
}

/**
 * Advanced search function that supports multi-word queries and typos
 */
export function searchText(
  searchQuery: string,
  targetText: string,
  options: {
    exactMatch?: boolean;
    typoTolerance?: boolean;
    multiWordSupport?: boolean;
    fuzzyThreshold?: number;
  } = {}
): SearchResult {
  const {
    exactMatch = false,
    typoTolerance = true,
    multiWordSupport = true,
    fuzzyThreshold = 0.7
  } = options;

  if (!searchQuery.trim() || !targetText.trim()) {
    return { score: 0, matches: [] };
  }

  const normalizedQuery = normalizeText(searchQuery);
  const normalizedTarget = normalizeText(targetText);
  const targetWords = extractKeywords(targetText);
  const queryWords = normalizedQuery.split(' ').filter(word => word.length > 0);
  
  let score = 0;
  const matches: string[] = [];

  // Exact phrase matching (highest priority)
  if (normalizedTarget.includes(normalizedQuery)) {
    score += 100;
    matches.push('exact phrase');
  }

  // Multi-word support
  if (multiWordSupport && queryWords.length > 1) {
    const allWordsFound = queryWords.every(queryWord => {
      return targetWords.some(targetWord => {
        if (exactMatch) {
          return targetWord === queryWord;
        } else if (typoTolerance) {
          return targetWord.includes(queryWord) || 
                 isSimilarWord(queryWord, targetWord, fuzzyThreshold);
        } else {
          return targetWord.includes(queryWord);
        }
      });
    });

    if (allWordsFound) {
      score += 80;
      matches.push('all words found');
    }

    // Partial word matching
    const partialMatches = queryWords.filter(queryWord => {
      return targetWords.some(targetWord => {
        if (exactMatch) {
          return targetWord === queryWord;
        } else if (typoTolerance) {
          return targetWord.includes(queryWord) || 
                 isSimilarWord(queryWord, targetWord, fuzzyThreshold);
        } else {
          return targetWord.includes(queryWord);
        }
      });
    });

    if (partialMatches.length > 0) {
      score += (partialMatches.length / queryWords.length) * 40;
      matches.push(`${partialMatches.length}/${queryWords.length} words matched`);
    }
  } else {
    // Single word or phrase matching
    const queryWord = queryWords[0] || normalizedQuery;
    
    for (const targetWord of targetWords) {
      if (exactMatch) {
        if (targetWord === queryWord) {
          score += 60;
          matches.push('exact word');
          break;
        }
      } else if (targetWord.includes(queryWord)) {
        score += 50;
        matches.push('contains word');
        break;
      } else if (typoTolerance && isSimilarWord(queryWord, targetWord, fuzzyThreshold)) {
        score += 30;
        matches.push('similar word');
        break;
      }
    }
  }

  // Boost score for shorter target text (more relevant)
  if (score > 0) {
    const lengthBoost = Math.max(0, 1 - (targetText.length / 200));
    score += lengthBoost * 10;
  }

  return { score, matches };
}

/**
 * Search through FAQ items with advanced matching
 */
export function searchFAQItems<T extends { question: string; answer: string }>(
  items: T[],
  searchQuery: string,
  options?: {
    exactMatch?: boolean;
    typoTolerance?: boolean;
    multiWordSupport?: boolean;
    fuzzyThreshold?: number;
    minScore?: number;
  }
): Array<T & { searchScore: number; searchMatches: string[] }> {
  const { minScore = 5, ...searchOptions } = options || {};
  
  if (!searchQuery.trim()) {
    return items.map(item => ({
      ...item,
      searchScore: 0,
      searchMatches: []
    }));
  }

  const results = items.map(item => {
    const questionResult = searchText(searchQuery, item.question, searchOptions);
    const answerResult = searchText(searchQuery, item.answer, searchOptions);
    
    // Question matches are weighted higher than answer matches
    const totalScore = questionResult.score * 1.5 + answerResult.score;
    const allMatches = [...questionResult.matches, ...answerResult.matches];
    
    return {
      ...item,
      searchScore: totalScore,
      searchMatches: allMatches
    };
  });

  return results
    .filter(item => item.searchScore >= minScore)
    .sort((a, b) => b.searchScore - a.searchScore);
}
