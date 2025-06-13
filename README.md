# Web Crawler

A comprehensive Node.js web crawler that can crawl entire websites and save the extracted data in JSON format with flexible restriction handling and unrestricted crawling modes.

## Features

- 🕸️ **Complete Website Crawling**: Automatically discovers and crawls all internal pages
- 📄 **Rich Data Extraction**: Extracts titles, meta tags, headings, content, images, and links
- 🤖 **Flexible Robots.txt Handling**: Optional robots.txt compliance (can be disabled)
- 🔒 **Smart Authorization Handling**: Configurable handling of blocked and unauthorized URLs
- 🚫 **Unrestricted Mode**: Option to ignore all crawling restrictions and limitations
- 🚫 **Duplicate Prevention**: Avoids crawling the same URL multiple times
- ⚡ **Rate Limiting**: Configurable delays between requests to be respectful
- 🔄 **Retry Logic**: Automatic retries for failed requests with exponential backoff
- 📊 **Progress Tracking**: Real-time progress updates and statistics
- 💾 **JSON Output**: Saves all data in structured JSON format with domain-specific filenames
- 📈 **Comprehensive Statistics**: Detailed crawl statistics including skip reasons

## Installation

1. Clone or download the project
2. Install dependencies:
```bash
npm install
```

## Usage

### Interactive Mode
```bash
npm start
```

Then enter the website URL when prompted.

### Direct Command
```bash
node crawler.js
```

## Configuration Options

You can modify the crawler options in `crawler.js`:

```javascript
const crawler = new WebCrawler({
  maxPages: 100,            // Maximum pages to crawl
  delay: 1000,              // Delay between requests (ms)
  maxDepth: 5,              // Maximum crawl depth
  respectRobots: false,     // Respect robots.txt (default: false)
  timeout: 30000,           // Request timeout (ms)
  retries: 3,               // Number of retries for failed requests
  skipUnauthorized: false,  // Skip unauthorized/blocked URLs (default: false)
  ignoreRestrictions: true  // Ignore ALL restrictions (default: false)
});
```

## Crawling Modes

### 1. Unrestricted Mode (Default)
```javascript
const crawler = new WebCrawler({
  respectRobots: false,
  skipUnauthorized: false,
  ignoreRestrictions: true
});
```
- **Ignores robots.txt completely**
- **Attempts to crawl all URLs regardless of status codes**
- **Maximum crawling capability**
- **Best for comprehensive data collection**

### 2. Respectful Mode
```javascript
const crawler = new WebCrawler({
  respectRobots: true,
  skipUnauthorized: true,
  ignoreRestrictions: false
});
```
- **Respects robots.txt restrictions**
- **Skips unauthorized and blocked URLs**
- **More ethical crawling approach**
- **Suitable for public websites**

### 3. Custom Mode
```javascript
const crawler = new WebCrawler({
  respectRobots: false,     // Ignore robots.txt
  skipUnauthorized: true,   // But skip auth errors
  ignoreRestrictions: false // Don't ignore other restrictions
});
```

## Authorization & Error Handling

The crawler can handle various types of blocked and unauthorized URLs based on configuration:

### Status Codes Handled:
- **401** - Unauthorized (Authentication required)
- **403** - Forbidden (Access denied)
- **407** - Proxy authentication required
- **429** - Too many requests (Rate limited)
- **451** - Unavailable for legal reasons
- **404** - Not found
- **410** - Gone
- **500** - Internal server error
- **502** - Bad gateway
- **503** - Service unavailable
- **504** - Gateway timeout

### Behavior by Mode:
- **Unrestricted Mode**: Attempts to crawl everything, treats errors as failures but continues
- **Respectful Mode**: Skips blocked URLs and respects all restrictions
- **Custom Mode**: Configurable behavior for different types of restrictions

## Output Format

The crawler generates two files for each crawl:

### 1. Main Data File (`domain_YYYY-MM-DD.json`)
Contains complete crawl data:
- **crawlInfo**: Metadata about the crawl session including options used
- **pages**: Array of all crawled pages with extracted data
- **failedUrls**: URLs that couldn't be crawled due to errors
- **skippedUrls**: URLs that were skipped due to authorization/blocking
- **statistics**: Comprehensive crawl statistics including skip reasons

### 2. Summary File (`domain_YYYY-MM-DD_summary.json`)
Contains a condensed overview:
- Basic crawl information
- Top pages by word count
- Statistics overview including skip statistics

## Extracted Data Per Page

For each crawled page, the following data is extracted:

- **Basic Info**: URL, title, depth, parent URL, crawl timestamp
- **Meta Data**: All meta tags including description, keywords, Open Graph tags
- **Content Structure**: Headings (H1-H6) with hierarchy
- **Main Content**: Text content, paragraphs, lists
- **Media**: Images with src, alt, and title attributes
- **Links**: All internal and external links with context
- **Analytics**: Word count, content type classification

## File Structure

```
├── crawler.js              # Main entry point with unrestricted settings
├── src/
│   ├── WebCrawler.js       # Core crawler class with flexible restriction handling
│   └── utils/
│       ├── UrlUtils.js     # URL manipulation utilities
│       ├── DataExtractor.js # Content extraction logic
│       └── FileManager.js  # File operations
├── crawl-results/          # Output directory (created automatically)
└── README.md
```

## Example Output Structure

```json
{
  "crawlInfo": {
    "startUrl": "https://example.com",
    "domain": "example.com",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "totalPages": 25,
    "totalTime": 45000,
    "failedRequests": 2,
    "skippedRequests": 8,
    "options": {
      "respectRobots": false,
      "skipUnauthorized": false,
      "ignoreRestrictions": true
    }
  },
  "pages": [
    {
      "url": "https://example.com",
      "title": "Homepage Title",
      "meta": {
        "description": "Page description...",
        "keywords": "keyword1, keyword2"
      },
      "headings": [
        {"level": 1, "text": "Main Heading"},
        {"level": 2, "text": "Subheading"}
      ],
      "content": {
        "text": "Full page text content...",
        "paragraphs": ["First paragraph...", "Second paragraph..."],
        "lists": [{"type": "ul", "items": ["Item 1", "Item 2"]}]
      },
      "images": [
        {"src": "https://example.com/image.jpg", "alt": "Image description"}
      ],
      "links": [
        {"url": "https://example.com/about", "text": "About Us", "isInternal": true}
      ],
      "depth": 0,
      "parent": null,
      "crawledAt": "2024-01-15T10:30:05.000Z",
      "wordCount": 450
    }
  ],
  "skippedUrls": [
    {
      "url": "https://example.com/admin",
      "reason": "Forbidden - Access denied",
      "statusCode": 403,
      "parent": "https://example.com"
    }
  ],
  "statistics": {
    "totalLinks": 120,
    "uniqueDomains": 8,
    "averageLinksPerPage": 4.8,
    "contentTypes": {
      "page": 15,
      "article": 8,
      "listing": 2
    },
    "skipReasons": {
      "Forbidden - Access denied": 5,
      "robots.txt blocked": 2,
      "Too many requests - Rate limited": 1
    }
  }
}
```

## Features in Detail

- **Smart Link Discovery**: Automatically finds and follows internal links
- **Content Classification**: Identifies different types of pages (articles, listings, etc.)
- **Flexible Error Handling**: Configurable handling of network errors, timeouts, and parsing issues
- **Multiple Crawling Modes**: From completely unrestricted to fully respectful crawling
- **Memory Efficient**: Processes pages one at a time to minimize memory usage
- **Configurable Delays**: Built-in delays and optional robots.txt compliance
- **Progress Feedback**: Real-time console updates showing crawl progress and skip reasons
- **No Dependencies on External Files**: Can crawl without requiring robots.txt or any other files

## Limitations

- Only crawls HTML pages (skips PDFs, images, etc.)
- Focuses on internal links within the same domain
- JavaScript-rendered content may not be captured (uses static HTML parsing)
- Large sites may take considerable time to crawl completely
- In unrestricted mode, may encounter rate limiting from target servers

## Best Practices

### For Unrestricted Crawling:
- Use appropriate delays to avoid overwhelming servers
- Monitor for rate limiting responses
- Be prepared for larger datasets and longer crawl times

### For Respectful Crawling:
- Enable robots.txt compliance for public websites
- Use reasonable delays between requests
- Skip unauthorized content to avoid legal issues

### For Performance:
- Adjust maxPages and maxDepth based on your needs
- Use longer delays for slower or rate-limited sites
- Monitor memory usage for very large crawls

## Contributing

Feel free to submit issues, fork the repository, and create pull requests for any improvements.