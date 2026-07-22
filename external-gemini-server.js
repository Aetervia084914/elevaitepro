// Simple external Gemini API server to bypass quota limits
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const cors = require('cors');
const app = express();
const PORT = 8005;

// Middleware
app.use(cors());
app.use(express.json());

// Load API key from environment
const API_KEY = process.env.API_KEY || process.env.GOOGLE_AI_API_KEY;

if (!API_KEY) {
  console.error('❌ No API key found in environment variables');
  console.log('Please set API_KEY or GOOGLE_AI_API_KEY in your .env.local file');
  process.exit(1);
}

// Initialize Gemini
const ai = new GoogleGenerativeAI({ apiKey: API_KEY });
const model = ai.getGenerativeModel({ model: "gemini-1.5-pro" });

console.log('🚀 External Gemini API Server Starting...');
console.log(`📡 Server: http://localhost:${PORT}`);
console.log(`🔑 API Key: ${API_KEY ? '✅ Configured' : '❌ Missing'}`);

// Main API endpoint
app.post('/fastapigemini', async (req, res) => {
  try {
    const { contents, generationConfig } = req.body;
    
    console.log('📨 Received request:', {
      contentLength: contents?.[0]?.parts?.[0]?.text?.length || 0,
      hasConfig: !!generationConfig
    });

    const result = await model.generateContent({
      contents,
      generationConfig: {
        responseMimeType: "application/json",
        ...generationConfig
      }
    });

    const response = result.response;
    const responseText = response.text();
    
    console.log('✅ Gemini API Success - Response length:', responseText.length);
    
    // Send response back
    res.json({
      success: true,
      candidates: [{ content: responseText }],
      usage: {
        promptTokens: response.usageMetadata?.promptTokenCount || 0,
        completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: response.usageMetadata?.totalTokenCount || 0
      }
    });

  } catch (error) {
    console.error('❌ Gemini API Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.toString()
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🌐 External Gemini API Server is running on http://localhost:${PORT}`);
  console.log('📋 Usage:');
  console.log('   POST http://localhost:8005/fastapigemini');
  console.log('   GET  http://localhost:8005/health');
  console.log('');
  console.log('🔑 Make sure your .env.local has: API_KEY=your_gemini_api_key');
});
