const fs = require('fs').promises;
const path = require('path');

class FileManager {
  static async saveCrawlData(crawlData, domain) {
    // Create output directory if it doesn't exist
    const outputDir = path.join(process.cwd(), 'crawl-results');
    await this.ensureDirectory(outputDir);

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const safeString = domain.replace(/[^a-z0-9]/gi, '_');
    const fileName = `${safeString}_${timestamp}.json`;
    const filePath = path.join(outputDir, fileName);

    // Save data to file
    await fs.writeFile(filePath, JSON.stringify(crawlData, null, 2), 'utf8');

    // Also save a summary file
    await this.saveSummary(crawlData, outputDir, safeString, timestamp);

    return filePath;
  }

  static async saveSummary(crawlData, outputDir, safeString, timestamp) {
    const summary = {
      domain: crawlData.crawlInfo.domain,
      startUrl: crawlData.crawlInfo.startUrl,
      crawledAt: crawlData.crawlInfo.timestamp,
      totalPages: crawlData.crawlInfo.totalPages,
      totalTime: crawlData.crawlInfo.totalTime,
      statistics: crawlData.statistics,
      topPages: crawlData.pages
        .sort((a, b) => b.wordCount - a.wordCount)
        .slice(0, 10)
        .map(page => ({
          url: page.url,
          title: page.title,
          wordCount: page.wordCount,
          linksCount: page.links.length
        })),
      failedUrlsCount: crawlData.failedUrls.length
    };

    const summaryFileName = `${safeString}_${timestamp}_summary.json`;
    const summaryPath = path.join(outputDir, summaryFileName);
    
    await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2), 'utf8');
  }

  static async ensureDirectory(dirPath) {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  static async listCrawlResults() {
    const outputDir = path.join(process.cwd(), 'crawl-results');
    try {
      const files = await fs.readdir(outputDir);
      return files.filter(file => file.endsWith('.json') && !file.includes('_summary'));
    } catch {
      return [];
    }
  }
}

module.exports = FileManager;