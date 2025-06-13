const { URL } = require('url');

class UrlUtils {
  static isValidUrl(string) {
    try {
      new URL(string);
      return true;
    } catch {
      return false;
    }
  }

  static getDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return null;
    }
  }

  static isSameDomain(url1, url2) {
    return this.getDomain(url1) === this.getDomain(url2);
  }

  static resolveUrl(baseUrl, relativeUrl) {
    try {
      return new URL(relativeUrl, baseUrl).href;
    } catch {
      return null;
    }
  }

  static normalizeUrl(url) {
    try {
      const urlObj = new URL(url);
      // Remove fragment and sort query parameters
      urlObj.hash = '';
      urlObj.search = new URLSearchParams([...urlObj.searchParams.entries()].sort()).toString();
      return urlObj.href;
    } catch {
      return url;
    }
  }

  static isInternalLink(link, baseDomain) {
    if (!link || link.startsWith('#') || link.startsWith('javascript:') || link.startsWith('mailto:')) {
      return false;
    }

    if (link.startsWith('/')) return true;
    
    const linkDomain = this.getDomain(link);
    return linkDomain === baseDomain;
  }

  static shouldSkipUrl(url) {
    const skipExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.svg', '.css', '.js', '.xml', '.txt'];
    const skipPatterns = ['/wp-admin/', '/admin/', '.json', '.rss', '.atom'];
    
    const lowerUrl = url.toLowerCase();
    
    return skipExtensions.some(ext => lowerUrl.endsWith(ext)) ||
           skipPatterns.some(pattern => lowerUrl.includes(pattern));
  }
}

module.exports = UrlUtils;