// URL detection and processing utilities

export const URL_REGEX = /https?:\/\/(?:www\.)?[-\w@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-\w()@:%_+.~#?&=]*)/g;

export interface ParsedUrl {
  id: string;
  url: string;
  domain: string;
  favicon: string;
  displayText: string;
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
      displayText
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
      displayText: domain.substring(0, 30)
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
  // Since we no longer use placeholders, just append URLs to the text
  if (urlPills.length === 0) {
    return text;
  }
  
  const urlString = urlPills.map(pill => pill.url).join(' ');
  
  // If there's text and URLs, separate them with a space
  if (text.trim() && urlString) {
    return `${text.trim()} ${urlString}`;
  }
  
  // If only URLs exist, return just the URLs
  if (urlString) {
    return urlString;
  }
  
  // If only text exists, return just the text
  return text;
};