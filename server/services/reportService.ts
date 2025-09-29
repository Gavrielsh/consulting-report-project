import { SalesforceData } from '../models/SalesforceData';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Interfaces for type safety
interface CompanyFinancials {
  sales: number;
  profit: number;
  year: number;
  source: 'db' | 'api';
  companyName: string;
}

interface NewsArticle {
  title: string;
  content?: string;
  summary?: string;
  date?: string;
  sales?: number;
  profit?: number;
}

interface NewsAPIResponse {
  articles: NewsArticle[];
  hasFinancialData?: boolean;
}

// Cache for storing previous reports to save tokens
const reportCache = new Map<string, string>();

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * Fetch company financial data from database
 */
const getCompanyDataFromDB = async (companyId: string): Promise<CompanyFinancials | null> => {
  try {
    const data = await SalesforceData.findOne({
      where: { companyId },
      order: [['year', 'DESC']] // Get most recent year
    });
    
    if (!data) {
      console.log(`No data found for company ID: ${companyId}`);
      return null;
    }
    
    return {
      sales: parseFloat(data.sales.toString()),
      profit: parseFloat(data.profit.toString()),
      year: data.year,
      source: 'db',
      companyName: data.companyName
    };
  } catch (error) {
    console.error('Error fetching company data from DB:', error);
    return null;
  }
};

/**
 * Fetch news data from external API
 */
const getNewsFromAPI = async (companyId: string): Promise<NewsAPIResponse> => {
  try {
    const response = await fetch(`https://news-api.jona-581.workers.dev/?id=${companyId}`);
    
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }
    
    const newsData = await response.json();
    
    // The API structure might vary, so we'll handle different possible formats
    if (Array.isArray(newsData)) {
      return { articles: newsData };
    } else if (newsData.articles) {
      return newsData;
    } else {
      // If it's a single article, wrap it in an array
      return { articles: [newsData] };
    }
  } catch (error) {
    console.error('Error fetching news from API:', error);
    return { articles: [] };
  }
};

/**
 * Extract financial data from news articles if available
 */
const extractFinancialsFromNews = (articles: NewsArticle[]): Partial<CompanyFinancials> | null => {
  for (const article of articles) {
    if (article.sales !== undefined || article.profit !== undefined) {
      return {
        sales: article.sales || 0,
        profit: article.profit || 0,
        year: new Date().getFullYear(), // Assume current year for news data
        source: 'api' as const
      };
    }
  }
  return null;
};

/**
 * Create cache key for report caching
 */
const createCacheKey = (companyId: string, reportType: string, articles: NewsArticle[]): string => {
  const articleTitles = articles.map(article => article.title).sort().join('|');
  return `${companyId}-${reportType}-${articleTitles}`;
};

/**
 * Generate LLM prompt based on data and report type
 */
const createLLMPrompt = (
  companyName: string,
  financials: CompanyFinancials,
  news: NewsArticle[],
  reportType: string
): string => {
  const newsSection = news.length > 0 
    ? news.map(article => `- **${article.title}**: ${article.content || article.summary || 'No additional details'}`).join('\n')
    : '- No recent news available';

  if (reportType === 'high-level') {
    // דוח קצר - בדיוק כמו בתמונה הראשונה
    return `You are an investment analyst. Generate a brief investment report for ${companyName}.

Financial Data (${financials.source.toUpperCase()}):
- Sales: $${financials.sales.toLocaleString()}
- Profit: $${financials.profit.toLocaleString()}
- Year: ${financials.year}

Recent News:
${newsSection}

Provide a report in this EXACT format:

**News article title:** [Extract the main news title]

**Summary:** [2-3 sentences analyzing the financial data and news impact on the company's investment potential]

**Final Recommendation:** [Choose one: "Invest - Large Investment" / "Invest - Medium Investment" / "Invest - Small Investment" / "Don't Invest" / "Defer"]

Use plain text formatting, no additional headers or markdown styling.`;

  } else {
    // דוח מפורט - בדיוק כמו בתמונה השנייה
    return `You are an investment analyst. Generate a comprehensive investment report for ${companyName}.

Financial Data (${financials.source.toUpperCase()}):
- Sales: $${financials.sales.toLocaleString()}
- Profit: $${financials.profit.toLocaleString()}
- Year: ${financials.year}

Recent News:
${newsSection}

Create a detailed report with these EXACT sections:

## Executive Summary
[Brief overview of the company's current position and outlook - 2-3 sentences]

## Financial Analysis  
[Detailed analysis of the financial performance, profit margins, and financial health - include specific numbers and calculations]

## News Analysis
[Analysis of recent news and its potential impact on the company's future performance]

## Investment Recommendation
[Detailed reasoning for the recommendation including risks and opportunities]

**Final Recommendation:** [Choose one: "Invest - Large Investment" / "Invest - Medium Investment" / "Invest - Small Investment" / "Don't Invest" / "Defer"]

Use proper markdown headers (##) for sections and provide comprehensive analysis in each section.`;
  }
};



/**
 * Call Gemini LLM API
 */
const callLLM = async (prompt: string): Promise<string> => {
  try {
    // Use a current stable model - Gemini 2.5 Flash or 2.0 Flash
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash", // או "gemini-2.0-flash" 
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error calling LLM:', error);
    
    // More detailed error handling
    if (error instanceof Error) {
      if (error.message.includes('API_KEY')) {
        throw new Error('Invalid or missing Gemini API key. Please check your GEMINI_API_KEY in .env file');
      } else if (error.message.includes('quota') || error.message.includes('rate limit')) {
        throw new Error('Gemini API rate limit exceeded. Please try again later');
      } else if (error.message.includes('model')) {
        throw new Error('Gemini model error. The model may be temporarily unavailable');
      }
    }
    
    throw new Error('Failed to generate LLM response');
  }
};


/**
 * Main function to generate investment report
 */
export const generateReportMarkdown = async (
  companyName: string,
  companyId: string,
  reportType: string
): Promise<string> => {
  try {
    console.log(`Generating ${reportType} report for ${companyName} (ID: ${companyId})`);

    // Step 1: Fetch data from both sources
    const [dbData, newsResponse] = await Promise.all([
      getCompanyDataFromDB(companyId),
      getNewsFromAPI(companyId)
    ]);

    // Step 2: Validate we have financial data
    if (!dbData) {
      return `# ${companyName} — Investment Report

**Error**: No financial data found for company ID: ${companyId}

Please ensure the company exists in our database and try again.`;
    }

    // Step 3: Check for newer financial data in news
    const newsFinancials = extractFinancialsFromNews(newsResponse.articles);
    const financials = newsFinancials && newsFinancials.sales && newsFinancials.profit 
      ? { ...dbData, ...newsFinancials } 
      : dbData;

    console.log(`Using ${financials.source} data:`, {
      sales: financials.sales,
      profit: financials.profit,
      year: financials.year
    });

    // Step 4: Check cache to save tokens
    const cacheKey = createCacheKey(companyId, reportType, newsResponse.articles);
    if (reportCache.has(cacheKey)) {
      console.log('Returning cached report');
      return reportCache.get(cacheKey)!;
    }

    // Step 5: Generate LLM prompt
    const prompt = createLLMPrompt(companyName, financials, newsResponse.articles, reportType);
    
    // Step 6: Call LLM
    console.log('Calling LLM for report generation...');
    const llmResponse = await callLLM(prompt);

    // Step 7: Format the final report
    let finalReport: string;
    
    if (reportType === 'high-level') {
      finalReport = `# ${companyName} — Investment Report

${llmResponse}

---
*Report generated on ${new Date().toLocaleDateString()} using ${financials.source.toUpperCase()} financial data from ${financials.year}*`;
    } else {
      finalReport = `# ${companyName} — Investment Report

${llmResponse}

---
*Report generated on ${new Date().toLocaleDateString()} using ${financials.source.toUpperCase()} financial data from ${financials.year}*`;
    }

    // Step 8: Cache the report
    reportCache.set(cacheKey, finalReport);

    console.log(`Successfully generated ${reportType} report for ${companyName}`);
    return finalReport;

  } catch (error) {
    console.error('Error generating report:', error);
    return `# ${companyName} — Investment Report

**Error**: Failed to generate report due to: ${error instanceof Error ? error.message : 'Unknown error'}

Please try again later or contact support if the issue persists.`;
  }
};
