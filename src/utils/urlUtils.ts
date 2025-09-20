// URL detection and processing utilities

export const URL_REGEX = /https?:\/\/(?:www\.)?[-\w@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-\w()@:%_+.~#?&=]*)/g;

export interface ParsedUrl {
  id: string;
  url: string;
  domain: string;
  favicon: string;
  displayText: string;
  content?: string; // Store fetched content
  isLoading?: boolean; // Track loading state
  error?: string; // Track any fetch errors
}

export const parseUrl = (url: string): ParsedUrl => {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace(/^www\./, '');
    
    // Generate unique ID for this URL instance
    const id = `url-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Get favicon from Google's favicon service
    const favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=16`;
    
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
      favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=16`,
      displayText: domain.substring(0, 30),
      isLoading: true
    };
  }
};

// Fetch URL content using Lovable's fetch website tool
export const fetchUrlContent = async (url: string): Promise<{ content?: string; error?: string }> => {
  try {
    console.log('🌐 Fetching content for URL:', url);
    
    // Note: In a real implementation, you'd make an API call to a backend service
    // that can fetch website content. For now, we'll simulate this.
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // For now, return a placeholder - this would be replaced with actual content fetching
    return {
      content: `[Website content from ${url} would be fetched here]`
    };
  } catch (error) {
    console.error('Failed to fetch URL content:', error);
    return {
      error: 'Failed to fetch website content'
    };
  }
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