const WebCrawler = require('./src/WebCrawler');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function main() {
  console.log('🕸️  Web Crawler - Crawl entire websites and save to JSON\n');
  
  rl.question('Enter the website URL to crawl: ', async (url) => {
    if (!url) {
      console.log('❌ Please provide a valid URL');
      rl.close();
      return;
    }

    // Add protocol if missing
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    console.log(`\n🚀 Starting crawl of: ${url}\n`);

    const crawler = new WebCrawler({
      maxPages: 100,        // Maximum pages to crawl
      delay: 1000,          // Delay between requests (ms)
      maxDepth: 5,          // Maximum crawl depth
      respectRobots: false, // Don't respect robots.txt - crawl freely
      timeout: 30000,       // Request timeout (ms)
      retries: 3,           // Number of retries for failed requests
      skipUnauthorized: false, // Don't skip unauthorized URLs - try to crawl everything
      ignoreRestrictions: true // Ignore all crawling restrictions
    });

    try {
      const results = await crawler.crawl(url);
      console.log(`\n✅ Crawling completed! Found ${results.pages.length} pages`);
      console.log(`📁 Data saved to: ${results.fileName}`);
      console.log(`⏱️  Total time: ${results.totalTime}ms`);
      console.log(`🔗 Unique links found: ${results.totalLinks}`);
      console.log(`❌ Failed requests: ${results.failedRequests}`);
      console.log(`🔒 Skipped requests: ${results.skippedRequests}`);
    } catch (error) {
      console.error('❌ Crawling failed:', error.message);
    }

    rl.close();
  });
}

main().catch(console.error);