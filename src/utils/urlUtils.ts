// URL detection and processing utilities

export const URL_REGEX = /https?:\/\/(?:[-\w.])+(?:[:\d]+)?(?:\/(?:[\w._~!$&'()*+,;=:@]|%[\dA-F]{2})*)*(?:\?(?:[\w._~!$&'()*+,;=:@/?]|%[\dA-F]{2})*)?(?:#(?:[\w._~!$&'()*+,;=:@/?]|%[\dA-F]{2})*)?/gi;

export interface ParsedUrl {
  id: string;
  url: string;
  domain: string;
  favicon: string;
  displayText: string;
  content?: string; // Store fetched content
  isLoading?: boolean; // Track loading state
  error?: string; // Track any fetch errors
  requiresAuth?: boolean; // Flag for authentication required
}

export const parseUrl = (url: string): ParsedUrl => {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace(/^www\./, '');
    
    // Generate unique ID for this URL instance
    const id = `url-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Get favicon using DuckDuckGo's favicon service
    const favicon = `https://icons.duckduckgo.com/ip3/${domain}.ico`;
    
    // Create display text (domain + path preview)
    let displayText = domain;
    if (urlObj.pathname !== '/' && urlObj.pathname.length > 1) {
      const pathPreview = urlObj.pathname.substring(1, 20);
      displayText += `/${pathPreview}${urlObj.pathname.length > 21 ? '...' : ''}`;
    }
    
    return {
      id,
      url,
      domain,
      favicon,
      displayText,
      isLoading: true // Start in loading state
    };
  } catch (error) {
    console.error('Error parsing URL:', error);
    // Fallback for invalid URLs
    const domain = url.replace(/https?:\/\/(www\.)?/, '').split('/')[0] || url;
    return {
      id: `url-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      url,
      domain: domain.substring(0, 30),
      favicon: `https://icons.duckduckgo.com/ip3/${domain}.ico`,
      displayText: domain.substring(0, 30),
      isLoading: true
    };
  }
};

// URL content fetching
export const fetchUrlContent = async (url: string): Promise<{ content?: string; error?: string; autoAuth?: boolean }> => {
  return {
    error: 'URL content fetching is no longer supported'
  };
};

export const detectUrls = (text: string): { urls: ParsedUrl[]; cleanText: string } => {
  const urls: ParsedUrl[] = [];
  const matches = text.match(URL_REGEX);
  
  if (!matches) {
    return { urls: [], cleanText: text };
  }
  
  let cleanText = text;
  
  matches.forEach(match => {
    const parsedUrl = parseUrl(match);
    urls.push(parsedUrl);
    // Remove URL completely from text (don't replace with placeholder)
    cleanText = cleanText.replace(match, '');
  });
  
  // Clean up extra spaces that might be left behind
  cleanText = cleanText.replace(/\s+/g, ' ').trim();
  
  return { urls, cleanText };
};

export const reconstructMessage = (text: string, urlPills: ParsedUrl[]): string => {
  if (urlPills.length === 0) {
    return text;
  }
  
  // Build content string from URL pills
  const contentParts: string[] = [];
  
  urlPills.forEach(pill => {
    if (pill.content) {
      // Include the fetched content
      contentParts.push(`\n\n--- Content from ${pill.url} ---\n${pill.content}\n--- End of content ---`);
    } else if (pill.error) {
      // Include URL with error note if fetch failed
      contentParts.push(`\n\n${pill.url} (failed to fetch content: ${pill.error})`);
    } else if (pill.isLoading) {
      // Still loading, include just URL for now
      contentParts.push(`\n\n${pill.url} (fetching content...)`);
    } else {
      // Fallback to just URL
      contentParts.push(`\n\n${pill.url}`);
    }
  });
  
  const contentString = contentParts.join('');
  
  // Combine text and content
  if (text.trim() && contentString) {
    return `${text.trim()}${contentString}`;
  }
  
  if (contentString) {
    return contentString.trim();
  }
  
  return text;
};