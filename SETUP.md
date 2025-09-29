# Setup Instructions for Investment Report Generator

## Prerequisites
- Node.js (version 18 or higher)
- Access to PostgreSQL database (provided in instructions)
- Google Gemini API key (free tier available)

## Installation Steps

### 1. Clone the Repository
```bash
git clone https://github.com/Gavrielsh/consulting-report-project.git
cd consulting-report-project
```

### 2. Install Dependencies
```bash
# Install root dependencies
npm install

# Install server dependencies
cd server
npm install

# Install client dependencies (if needed)
cd ../client
npm install
```

### 3. Environment Setup

#### Database Connection
Create a `.env` file in the `/server` directory:

```env
# Database Configuration
DATABASE_URL=postgresql://workshop_readonly.qokkrimhprtufpqcpvmm:YOUR_DB_PASSWORD@aws-1-eu-central-1.pooler.supabase.com:6543/postgres

# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: Port configuration
PORT=3001
```

**Replace:**
- `YOUR_DB_PASSWORD` with the database password provided by instructor
- `your_gemini_api_key_here` with your Google Gemini API key

#### Getting Google Gemini API Key (Free)
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click **"Create API Key"** (top right)
3. Copy the generated key to your `.env` file
4. The free tier includes generous limits for development

### 4. Run the Application

#### Development Mode (Recommended)
```bash
# From the root directory
npm run dev
```

This will start both frontend and backend with hot reload.

#### Alternative: Run Separately
```bash
# Terminal 1: Start backend
cd server
npm run dev

# Terminal 2: Start frontend
cd client
npm run dev
```

### 5. Access the Application
- Frontend: [http://localhost:5173](http://localhost:5173)
- Backend API: [http://localhost:3001](http://localhost:3001)

## Testing the Implementation

### 1. Test Database Connection
The app should load and show available companies in the dropdown.

### 2. Test Report Generation
1. Select a company from the dropdown
2. Choose report type (High-level or Detailed)
3. Click "Generate Report"
4. Wait for the AI-generated report to appear

### 3. Verify Features
- **Database Integration**: Company financial data should load
- **News API**: Recent news should be incorporated
- **LLM Integration**: Reports should be well-formatted markdown
- **Caching**: Identical requests should return faster (cached)
- **Error Handling**: Invalid companies should show appropriate errors

## Troubleshooting

### Common Issues

**"No companies found"**
- Check database connection in `.env`
- Verify DATABASE_URL is correct
- Ensure database password is accurate

**"LLM Error"**
- Verify GEMINI_API_KEY in `.env`
- Check API key is valid and active
- Ensure you haven't exceeded rate limits

**"Module not found errors"**
- Run `npm install` in both `/server` and `/client` directories
- Check that `@google/generative-ai` is installed

**"Port already in use"**
- Change PORT in `.env` file
- Or kill existing processes on ports 3001/5173

### Debug Mode
For detailed logging, add to your `.env`:
```env
NODE_ENV=development
DEBUG=true
```

## API Endpoints

### News API
- **URL**: `https://news-api.jona-581.workers.dev/?id=COMPANY_ID`
- **Method**: GET
- **Response**: JSON with news articles and potential financial data

### Internal API
- **Generate Report**: `POST /api/generate-report`
- **Get Companies**: `GET /api/companies` (if implemented)

## Project Structure
```
consulting-report-project/
├── server/
│   ├── config/database.ts      # Database configuration
│   ├── models/SalesforceData.ts # Database model
│   ├── services/reportService.ts # Main report generation logic
│   ├── controllers/            # Request handlers
│   ├── routes/                # API routes
│   └── server.ts              # Express server setup
├── client/                    # Frontend React application
└── package.json              # Root dependencies
```

## Features Implemented

✅ **Database Integration**
- Fetches company financial data from PostgreSQL
- Uses Sequelize ORM for type-safe database operations

✅ **News API Integration**
- Retrieves recent news articles for companies
- Extracts financial data from news when available
- Prefers newer API data over database data

✅ **LLM Integration (Google Gemini)**
- Generates both high-level and detailed reports
- Creates properly formatted Markdown output
- Includes investment recommendations

✅ **Smart Caching**
- Caches identical requests to save API tokens
- Uses article titles as cache keys
- Reduces costs and improves performance

✅ **Error Handling**
- Graceful handling of database errors
- API timeout and network error management
- User-friendly error messages

✅ **TypeScript Support**
- Full type safety throughout the application
- Interfaces for all data structures
- Enhanced developer experience

## Next Steps

1. **Run the application** using the instructions above
2. **Test with different companies** to see varying reports
3. **Try both report types** (high-level vs detailed)
4. **Monitor the console** for debugging information
5. **Check caching** by generating the same report twice

The implementation is ready to use and should work seamlessly with the provided frontend interface!