const UrlUtils = require('./UrlUtils');

class DataExtractor {
  static extractPageData($, url, depth, parent) {
    return {
      url,
      title: this.extractTitle($),
      meta: this.extractMeta($),
      headings: this.extractHeadings($),
      content: this.extractContent($),
      images: this.extractImages($, url),
      depth,
      parent,
      crawledAt: new Date().toISOString(),
      contentType: this.extractContentType($),
      wordCount: this.getWordCount($),
      responseTime: Date.now()
    };
  }

  static extractTitle($) {
    return $('title').first().text().trim() || 
           $('h1').first().text().trim() || 
           'No title found';
  }

  static extractMeta($) {
    const meta = {};
    
    // Standard meta tags
    $('meta').each((_, element) => {
      const $el = $(element);
      const name = $el.attr('name') || $el.attr('property') || $el.attr('http-equiv');
      const content = $el.attr('content');
      
      if (name && content) {
        meta[name] = content;
      }
    });

    // Canonical URL
    const canonical = $('link[rel="canonical"]').attr('href');
    if (canonical) meta.canonical = canonical;

    return meta;
  }

  static extractHeadings($) {
    const headings = [];
    
    $('h1, h2, h3, h4, h5, h6').each((_, element) => {
      const $el = $(element);
      const level = parseInt(element.tagName.substring(1));
      const text = $el.text().trim();
      
      if (text) {
        headings.push({
          level,
          text,
          id: $el.attr('id') || null
        });
      }
    });

    return headings;
  }

  static extractContent($) {
    // Remove script and style elements
    $('script, style, nav, header, footer, aside').remove();
    
    // Extract main content
    const mainContent = $('main, article, .content, #content, .post-content').first();
    const contentText = mainContent.length > 0 ? 
      mainContent.text() : 
      $('body').text();

    return {
      text: contentText.replace(/\s+/g, ' ').trim(),
      paragraphs: this.extractParagraphs($),
      lists: this.extractLists($)
    };
  }

  static extractParagraphs($) {
    const paragraphs = [];
    $('p').each((_, element) => {
      const text = $(element).text().trim();
      if (text && text.length > 10) {
        paragraphs.push(text);
      }
    });
    return paragraphs.slice(0, 10); // Limit to first 10 paragraphs
  }

  static extractLists($) {
    const lists = [];
    $('ul, ol').each((_, element) => {
      const $list = $(element);
      const items = [];
      $list.find('li').each((_, li) => {
        const text = $(li).text().trim();
        if (text) items.push(text);
      });
      if (items.length > 0) {
        lists.push({
          type: element.tagName.toLowerCase(),
          items
        });
      }
    });
    return lists.slice(0, 5); // Limit to first 5 lists
  }

  static extractImages($, baseUrl) {
    const images = [];
    $('img').each((_, element) => {
      const $img = $(element);
      const src = $img.attr('src');
      const alt = $img.attr('alt') || '';
      
      if (src) {
        const absoluteUrl = UrlUtils.resolveUrl(baseUrl, src);
        if (absoluteUrl) {
          images.push({
            src: absoluteUrl,
            alt,
            title: $img.attr('title') || ''
          });
        }
      }
    });
    return images.slice(0, 20); // Limit to first 20 images
  }

  static extractLinks($, baseUrl, baseDomain) {
    const links = [];
    const seenUrls = new Set();

    $('a[href]').each((_, element) => {
      const $link = $(element);
      const href = $link.attr('href');
      const text = $link.text().trim();
      
      if (!href) return;

      const absoluteUrl = UrlUtils.resolveUrl(baseUrl, href);
      if (!absoluteUrl || UrlUtils.shouldSkipUrl(absoluteUrl)) return;

      const normalizedUrl = UrlUtils.normalizeUrl(absoluteUrl);
      if (seenUrls.has(normalizedUrl)) return;
      seenUrls.add(normalizedUrl);

      const isInternal = UrlUtils.isSameDomain(absoluteUrl, `https://${baseDomain}`);
      
      links.push({
        url: normalizedUrl,
        text,
        title: $link.attr('title') || '',
        isInternal,
        domain: UrlUtils.getDomain(absoluteUrl)
      });
    });

    return links;
  }

  static extractContentType($) {
    // Try to determine content type from meta tags or structure
    if ($('article, .post, .blog-post').length > 0) return 'article';
    if ($('nav, .navigation, .menu').length > 3) return 'navigation';
    if ($('form').length > 2) return 'form-page';
    if ($('.product, .item, .listing').length > 5) return 'listing';
    return 'page';
  }

  static getWordCount($) {
    const text = $('body').text();
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }
}

module.exports = DataExtractor;