const axios = require('axios');
const cheerio = require('cheerio');
const { URL } = require('url');
const fs = require('fs').promises;
const path = require('path');
const robotsParser = require('robots-parser');
const UrlUtils = require('./utils/UrlUtils');
const DataExtractor = require('./utils/DataExtractor');
const FileManager = require('./utils/FileManager');

class WebCrawler {
  constructor(options = {}) {
    this.options = {
      maxPages: options.maxPages || 50,
      delay: options.delay || 1000,
      maxDepth: options.maxDepth || 3,
      respectRobots: options.respectRobots !== undefined ? options.respectRobots : false, // Default to false
      timeout: options.timeout || 30000,
      retries: options.retries || 3,
      userAgent: options.userAgent || 'WebCrawler/1.0 (+https://github.com/webcrawler)',
      skipUnauthorized: options.skipUnauthorized !== undefined ? options.skipUnauthorized : false, // Default to false
      ignoreRestrictions: options.ignoreRestrictions || false, // New option to ignore all restrictions
      ...options
    };

    this.visited = new Set();
    this.queue = [];
    this.results = [];
    this.failedUrls = [];
    this.skippedUrls = [];
    this.robots = null;
    this.baseUrl = null;
    this.baseDomain = null;
    this.startTime = null;
  }

  async crawl(startUrl) {
    this.startTime = Date.now();
    this.baseUrl = startUrl;
    this.baseDomain = UrlUtils.getDomain(startUrl);

    console.log(`🎯 Target domain: ${this.baseDomain}`);
    
    if (this.options.ignoreRestrictions) {
      console.log('🚫 Restriction mode: DISABLED - Crawling without limitations');
    } else if (!this.options.respectRobots) {
      console.log('🤖 Robots.txt: DISABLED - Ignoring robots.txt restrictions');
    }

    // Initialize robots.txt only if respect is enabled and restrictions are not ignored
    if (this.options.respectRobots && !this.options.ignoreRestrictions) {
      await this.loadRobotsTxt();
    }

    // Add initial URL to queue
    this.queue.push({ url: startUrl, depth: 0, parent: null });

    // Process queue
    await this.processQueue();

    // Save results
    const fileName = await this.saveResults();

    return {
      pages: this.results,
      fileName,
      totalTime: Date.now() - this.startTime,
      totalLinks: this.results.reduce((sum, page) => sum + page.links.length, 0),
      failedRequests: this.failedUrls.length,
      skippedRequests: this.skippedUrls.length,
      domain: this.baseDomain
    };
  }

  async loadRobotsTxt() {
    try {
      const robotsUrl = `${this.baseUrl}/robots.txt`;
      const response = await axios.get(robotsUrl, {
        timeout: this.options.timeout,
        headers: { 'User-Agent': this.options.userAgent }
      });
      this.robots = robotsParser(robotsUrl, response.data);
      console.log('🤖 Loaded robots.txt');
    } catch (error) {
      console.log('⚠️  No robots.txt found, proceeding without restrictions');
    }
  }

  async processQueue() {
    while (this.queue.length > 0 && this.results.length < this.options.maxPages) {
      const { url, depth, parent } = this.queue.shift();

      // Skip if already visited
      if (this.visited.has(url)) continue;

      // Skip if max depth reached
      if (depth > this.options.maxDepth) continue;

      // Check robots.txt only if restrictions are not ignored
      if (!this.options.ignoreRestrictions && this.robots && !this.robots.isAllowed(url, this.options.userAgent)) {
        console.log(`🚫 Blocked by robots.txt: ${url}`);
        this.skippedUrls.push({ 
          url, 
          reason: 'robots.txt blocked', 
          parent,
          statusCode: null 
        });
        continue;
      }

      console.log(`📄 Crawling (${this.results.length + 1}/${this.options.maxPages}): ${url}`);

      try {
        const pageData = await this.crawlPage(url, depth, parent);
        if (pageData) {
          this.results.push(pageData);
          this.addLinksToQueue(pageData.links, depth + 1, url);
        }
      } catch (error) {
        // Handle errors based on restriction settings
        const shouldSkip = !this.options.ignoreRestrictions && this.handleCrawlError(error, url, parent);
        if (!shouldSkip) {
          if (this.options.ignoreRestrictions) {
            console.log(`⚠️  Error crawling ${url} (continuing anyway): ${error.message}`);
          } else {
            console.log(`❌ Failed to crawl ${url}: ${error.message}`);
          }
          this.failedUrls.push({ url, error: error.message, parent });
        }
      }

      // Add delay between requests
      if (this.options.delay > 0) {
        await this.sleep(this.options.delay);
      }
    }
  }

  handleCrawlError(error, url, parent) {
    // If ignoring restrictions, don't skip any URLs
    if (this.options.ignoreRestrictions) {
      return false;
    }

    // If not skipping unauthorized, don't skip auth-related errors
    if (!this.options.skipUnauthorized) {
      return false;
    }

    const statusCode = error.response?.status;
    const authRelatedCodes = [401, 403, 407, 429, 451];
    const skipCodes = [404, 410, 500, 502, 503, 504];

    if (statusCode && authRelatedCodes.includes(statusCode)) {
      const reasons = {
        401: 'Unauthorized - Authentication required',
        403: 'Forbidden - Access denied',
        407: 'Proxy authentication required',
        429: 'Too many requests - Rate limited',
        451: 'Unavailable for legal reasons'
      };

      console.log(`🔒 Skipping ${url}: ${reasons[statusCode]} (${statusCode})`);
      this.skippedUrls.push({ 
        url, 
        reason: reasons[statusCode], 
        parent,
        statusCode 
      });
      return true; // Skip this URL
    }

    if (statusCode && skipCodes.includes(statusCode)) {
      const reasons = {
        404: 'Not found',
        410: 'Gone',
        500: 'Internal server error',
        502: 'Bad gateway',
        503: 'Service unavailable',
        504: 'Gateway timeout'
      };

      console.log(`⚠️  Skipping ${url}: ${reasons[statusCode]} (${statusCode})`);
      this.skippedUrls.push({ 
        url, 
        reason: reasons[statusCode], 
        parent,
        statusCode 
      });
      return true; // Skip this URL
    }

    // Check for specific error messages that indicate authorization issues
    const errorMessage = error.message.toLowerCase();
    const authKeywords = ['unauthorized', 'forbidden', 'access denied', 'authentication', 'permission'];
    
    if (authKeywords.some(keyword => errorMessage.includes(keyword))) {
      console.log(`🔒 Skipping ${url}: Authorization issue - ${error.message}`);
      this.skippedUrls.push({ 
        url, 
        reason: `Authorization issue: ${error.message}`, 
        parent,
        statusCode: statusCode || null 
      });
      return true; // Skip this URL
    }

    return false; // Don't skip, treat as regular error
  }

  async crawlPage(url, depth, parent) {
    this.visited.add(url);

    const response = await this.makeRequest(url);
    if (!response) return null;

    const $ = cheerio.load(response.data);
    
    // Extract page data
    const pageData = DataExtractor.extractPageData($, url, depth, parent);
    
    // Extract links
    pageData.links = DataExtractor.extractLinks($, url, this.baseDomain);
    
    return pageData;
  }

  async makeRequest(url, retryCount = 0) {
    try {
      const response = await axios.get(url, {
        timeout: this.options.timeout,
        headers: {
          'User-Agent': this.options.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        maxRedirects: 5,
        validateStatus: (status) => {
          // If ignoring restrictions, accept all status codes
          if (this.options.ignoreRestrictions) {
            return status >= 200 && status < 600; // Accept almost all responses
          }

          // Accept successful responses
          if (status >= 200 && status < 300) return true;
          
          // If not skipping unauthorized, allow auth errors to be handled
          if (!this.options.skipUnauthorized) {
            return status < 500; // Allow client errors to be handled
          }
          
          // Reject authorization-related errors immediately (don't retry)
          if ([401, 403, 407, 429, 451].includes(status)) return false;
          
          // Reject other client/server errors immediately (don't retry)
          if ([404, 410, 500, 502, 503, 504].includes(status)) return false;
          
          // Allow other status codes to be handled by axios
          return status < 400;
        }
      });

      return response;
    } catch (error) {
      // If ignoring restrictions, be more aggressive with retries
      if (this.options.ignoreRestrictions) {
        if (retryCount < this.options.retries) {
          console.log(`🔄 Retrying ${url} (${retryCount + 1}/${this.options.retries}) - Ignoring restrictions`);
          await this.sleep(1000 * (retryCount + 1)); // Exponential backoff
          return this.makeRequest(url, retryCount + 1);
        }
        throw error;
      }

      // Don't retry authorization-related errors if we're skipping them
      const statusCode = error.response?.status;
      const noRetryStatuses = this.options.skipUnauthorized ? 
        [401, 403, 404, 407, 410, 429, 451, 500, 502, 503, 504] : 
        [404, 410]; // Only skip permanent failures if not ignoring auth
      
      if (statusCode && noRetryStatuses.includes(statusCode)) {
        throw error; // Don't retry, let handleCrawlError decide what to do
      }

      // Retry for network errors and other temporary issues
      if (retryCount < this.options.retries) {
        console.log(`🔄 Retrying ${url} (${retryCount + 1}/${this.options.retries})`);
        await this.sleep(1000 * (retryCount + 1)); // Exponential backoff
        return this.makeRequest(url, retryCount + 1);
      }
      
      throw error;
    }
  }

  addLinksToQueue(links, depth, parent) {
    for (const link of links) {
      if (!this.visited.has(link.url) && !this.isInQueue(link.url) && !this.isSkipped(link.url)) {
        this.queue.push({ url: link.url, depth, parent });
      }
    }
  }

  isInQueue(url) {
    return this.queue.some(item => item.url === url);
  }

  isSkipped(url) {
    return this.skippedUrls.some(item => item.url === url);
  }

  async saveResults() {
    const crawlData = {
      crawlInfo: {
        startUrl: this.baseUrl,
        domain: this.baseDomain,
        timestamp: new Date().toISOString(),
        totalPages: this.results.length,
        totalTime: Date.now() - this.startTime,
        failedRequests: this.failedUrls.length,
        skippedRequests: this.skippedUrls.length,
        options: this.options
      },
      pages: this.results,
      failedUrls: this.failedUrls,
      skippedUrls: this.skippedUrls,
      statistics: {
        totalLinks: this.results.reduce((sum, page) => sum + page.links.length, 0),
        uniqueDomains: [...new Set(this.results.flatMap(page => 
          page.links.map(link => UrlUtils.getDomain(link.url))
        ))].length,
        averageLinksPerPage: Math.round(
          this.results.reduce((sum, page) => sum + page.links.length, 0) / this.results.length
        ),
        contentTypes: this.getContentTypeStats(),
        skipReasons: this.getSkipReasonStats()
      }
    };

    return await FileManager.saveCrawlData(crawlData, this.baseDomain);
  }

  getContentTypeStats() {
    const stats = {};
    this.results.forEach(page => {
      const type = page.contentType || 'unknown';
      stats[type] = (stats[type] || 0) + 1;
    });
    return stats;
  }

  getSkipReasonStats() {
    const stats = {};
    this.skippedUrls.forEach(item => {
      const reason = item.reason || 'unknown';
      stats[reason] = (stats[reason] || 0) + 1;
    });
    return stats;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = WebCrawler;