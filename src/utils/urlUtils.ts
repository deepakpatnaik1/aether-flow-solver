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
    // Replace URL in text with placeholder that we can track
    cleanText = cleanText.replace(match, `__URL_${parsedUrl.id}__`);
  });
  
  return { urls, cleanText };
};

export const reconstructMessage = (text: string, urlPills: ParsedUrl[]): string => {
  let reconstructed = text;
  
  urlPills.forEach(pill => {
    reconstructed = reconstructed.replace(`__URL_${pill.id}__`, pill.url);
  });
  
  return reconstructed;
};