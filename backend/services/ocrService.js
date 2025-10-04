const axios = require('axios');
const FormData = require('form-data');

class OCRService {
  constructor() {
    this.googleVisionApiKey = process.env.GOOGLE_VISION_API_KEY;
    this.googleVisionUrl = 'https://vision.googleapis.com/v1/images:annotate';
  }

  async extractTextFromImage(imageBuffer, mimeType = 'image/jpeg') {
    try {
      if (!this.googleVisionApiKey) {
        console.log('Google Vision API key not configured, using mock OCR');
        return this.getMockOCRData();
      }

      const requestBody = {
        requests: [{
          image: {
            content: imageBuffer.toString('base64')
          },
          features: [{
            type: 'TEXT_DETECTION',
            maxResults: 1
          }],
          imageContext: {
            languageHints: ['en']
          }
        }]
      };

      const response = await axios.post(
        `${this.googleVisionUrl}?key=${this.googleVisionApiKey}`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      const annotations = response.data.responses[0]?.textAnnotations;
      if (!annotations || annotations.length === 0) {
        return {
          extractedText: '',
          confidence: 0,
          extractedAmount: null,
          extractedDate: null,
          extractedMerchant: null
        };
      }

      const fullText = annotations[0].description;
      const confidence = annotations[0].score || 0.8;

      // Extract structured data
      const extractedData = this.parseReceiptText(fullText);

      return {
        extractedText: fullText,
        confidence,
        ...extractedData
      };
    } catch (error) {
      console.error('OCR extraction error:', error);
      return this.getMockOCRData();
    }
  }

  parseReceiptText(text) {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    let extractedAmount = null;
    let extractedDate = null;
    let extractedMerchant = null;

    // Extract amount (look for currency patterns)
    const amountPatterns = [
      /\$(\d+\.?\d*)/g,
      /(\d+\.?\d*)\s*USD/g,
      /Total[:\s]*\$?(\d+\.?\d*)/gi,
      /Amount[:\s]*\$?(\d+\.?\d*)/gi
    ];

    for (const pattern of amountPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        const amounts = matches.map(match => {
          const num = match.replace(/[^\d.]/g, '');
          return parseFloat(num);
        }).filter(num => !isNaN(num) && num > 0);
        
        if (amounts.length > 0) {
          extractedAmount = Math.max(...amounts);
          break;
        }
      }
    }

    // Extract date (look for date patterns)
    const datePatterns = [
      /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/g,
      /\b(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})\b/g,
      /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}\b/gi
    ];

    for (const pattern of datePatterns) {
      const matches = text.match(pattern);
      if (matches) {
        const dateStr = matches[0];
        const parsedDate = new Date(dateStr);
        if (!isNaN(parsedDate.getTime())) {
          extractedDate = parsedDate;
          break;
        }
      }
    }

    // Extract merchant (usually first line or contains common business words)
    const businessKeywords = ['restaurant', 'store', 'shop', 'cafe', 'hotel', 'gas', 'station', 'market', 'pharmacy', 'clinic', 'office'];
    const merchantLines = lines.filter(line => 
      businessKeywords.some(keyword => line.toLowerCase().includes(keyword)) ||
      line.length > 5 && line.length < 50 && !line.match(/\d+\.\d+/) && !line.match(/\d{2}\/\d{2}\/\d{4}/)
    );

    if (merchantLines.length > 0) {
      extractedMerchant = merchantLines[0];
    } else if (lines.length > 0) {
      extractedMerchant = lines[0];
    }

    return {
      extractedAmount,
      extractedDate,
      extractedMerchant
    };
  }

  getMockOCRData() {
    return {
      extractedText: 'Sample receipt text extracted from image',
      confidence: 0.85,
      extractedAmount: 45.50,
      extractedDate: new Date(),
      extractedMerchant: 'Sample Merchant'
    };
  }

  async validateReceiptImage(imageBuffer, mimeType) {
    // Basic validation
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (imageBuffer.length > maxSize) {
      throw new Error('Image too large. Maximum size is 10MB.');
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(mimeType)) {
      throw new Error('Invalid image type. Allowed types: JPEG, PNG, GIF, WebP');
    }

    return true;
  }

  async processReceipt(imageBuffer, mimeType = 'image/jpeg') {
    try {
      // Validate image
      await this.validateReceiptImage(imageBuffer, mimeType);

      // Extract text using OCR
      const ocrData = await this.extractTextFromImage(imageBuffer, mimeType);

      return {
        success: true,
        data: ocrData
      };
    } catch (error) {
      console.error('Receipt processing error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new OCRService();
