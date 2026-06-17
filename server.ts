import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
// @ts-ignore
import WordExtractor from 'word-extractor';

// Load environment variables from .env file
dotenv.config();

let aiInstance: GoogleGenAI | null = null;

function getGeminiClient() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY_MISSING');
    }
    aiInstance = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON parser with a high limit (15MB) for base64 encoded photo uploads
  app.use(express.json({ limit: '15mb' }));

  // Client-side can send the raw extracted PDF text list to have Gemini intelligently reconstruct the Word-compatible layout
  app.post('/api/pdf-to-word', async (req, res) => {
    try {
      const { rawText, rawPagesData, fileName } = req.body;
      if (!rawText || !rawText.trim()) {
        return res.status(400).json({ error: 'TEXT_MISSING', message: 'No text extracted from PDF.' });
      }

      let ai;
      try {
        ai = getGeminiClient();
      } catch (e: any) {
        return res.status(400).json({
          error: 'GEMINI_API_KEY_MISSING',
          message: 'Gemini API key is not configured. Falling back to client-side local conversion layout.'
        });
      }

      const systemInstruction = 
`You are an expert Document and Resume PDF-to-Word Conversion System.
Your job is to read sequentially parsed text segments and coordinates from a PDF and reconstruct them into an extremely elegant, standard, highly professional Microsoft Word (.docx) compatible HTML body.

Aesthetically match the original resume format cleanly by following these rules meticulously:

1. NO STYLES IN HEAD / MANDATORY INLINE STYLES:
   - CRITICAL COMPATIBILITY REQUIREMENT: Microsoft Word completely ignores <style> rules or CSS classes defined in the <head> of the document during file opening.
   - You MUST apply all layouts, margins, padding, font families, text sizes, alignments, and background-color styles INLINE via the 'style="..."' attribute on EVERY single visible element (<p>, <td>, <th>, <table>, <span>, <h1>, <hr>, etc.).
   - Standard primary font-family MUST be inline: "font-family: 'Calibri', 'Arial', sans-serif;" on every single paragraph and cell.
   - Default body text size MUST be inline: "font-size: 10.5pt; color: #000000; line-height: 1.25;" on every standard paragraph.
   - Bold styles MUST use: "font-weight: bold;".

2. HEADER & CONTACT INFORMATION (Left/Right horizontal alignment):
   - Notice the 'x' horizontal coordinates of the top resume elements.
   - 'RESUME' should be centered at the very top using high-contrast bold typography:
     <p align="center" style="font-family: 'Calibri', 'Arial', sans-serif; font-size: 20pt; font-weight: bold; color: #000000; margin: 0 0 10pt 0;">RESUME</p>
   - If there are items aligned side-by-side (such as Name & Title on the left, and Contact Info like Mobile, Email, and Address on the right):
     Do NOT list them sequentially as simple vertical blocks and do NOT squeeze them into narrow cells.
     Instead, use a border-free standard HTML <table> with two columns to keep left and right sections aligned beautifully:
     <table border="0" cellspacing="0" cellpadding="0" style="width: 100%; border-collapse: collapse; margin-top: 6pt; margin-bottom: 8pt; border: none;">
       <tr>
         <td style="width: 55%; vertical-align: top; padding: 0; border: none;">
           <p style="font-family: 'Calibri', 'Arial', sans-serif; font-size: 20pt; font-weight: bold; color: #111827; margin: 0 0 3pt 0;">KAJAL YADAV</p>
           <p style="font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; color: #374151; margin: 0 0 2pt 0;">Billing Executive</p>
         </td>
         <td style="width: 45%; vertical-align: top; padding: 0; border: none; text-align: right;">
           <p style="font-family: 'Calibri', 'Arial', sans-serif; font-size: 10pt; color: #000000; margin: 0 0 2pt 0; text-align: right;"><b>Mob No.:</b> 9794777033</p>
           <p style="font-family: 'Calibri', 'Arial', sans-serif; font-size: 10pt; color: #000000; margin: 0 0 2pt 0; text-align: right;"><b>Email Id:</b> ay6009985@gmail.com</p>
           <p style="font-family: 'Calibri', 'Arial', sans-serif; font-size: 10pt; color: #000000; margin: 0 0 2pt 0; text-align: right;"><b>Address:</b> Vill: Kapooripur, Suriyawan, Bhadohi UP - 221404</p>
         </td>
       </tr>
     </table>
   - Place a clean horizontal rule line under the header block:
     <hr style="border: none; border-top: 1px solid #000000; margin-top: 10pt; margin-bottom: 12pt;" />

3. SECTION HEADINGS (Banners):
   - For major section dividers like 'CAREER OBJECTIVE', 'ACADEMIC QUALIFICATION', 'OTHER QUALIFICATION', 'WORK EXPERIENCE', 'PERSONAL INFORMATION', 'DECLARATION', etc.:
     Create a clean, full-width solid light grey background band (no blue lines, no left vertical borders, just a flat solid background band spanning 100% of the content width) matching the original PDF resume style:
     <table border="0" cellspacing="0" cellpadding="0" style="width: 100%; border-collapse: collapse; margin-top: 14pt; margin-bottom: 8pt; background-color: #ededed;">
       <tr>
         <td style="background-color: #ededed; padding: 5pt 8pt; vertical-align: middle;">
           <p style="font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; font-weight: bold; color: #000000; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">SECTION_TITLE</p>
         </td>
       </tr>
     </table>

4. ACADEMIC & QUALIFICATION TABLES:
   - Tabular segments containing columns like S.No., Qualification, Board/University, Year, Passing, Per %, etc., MUST be rendered as real, clean standard HTML tables with professional borders:
     <table border="1" cellpadding="6" cellspacing="0" style="width: 100%; border-collapse: collapse; border: 1px solid #cccccc; margin-top: 8pt; margin-bottom: 12pt;">
   - Inside header row cells (<th> or <td>):
     Apply styles: "background-color: #f3f4f6; padding: 6pt 8pt; font-family: 'Calibri', 'Arial', sans-serif; font-weight: bold; font-size: 10pt; color: #111827; border: 1px solid #cccccc; text-align: center; vertical-align: middle;"
   - Inside body row cells (<td>):
     Apply styles: "padding: 6pt 8pt; font-family: 'Calibri', 'Arial', sans-serif; font-size: 9.5pt; color: #374151; border: 1px solid #cccccc; text-align: left; vertical-align: middle;"
   - Verify column-item pairs correspond exactly to the coordinate grids. Never duplicate row texts or columns.

5. KEY-VALUE LISTS (Personal Parameter Profiles):
   - If the section has fields with clear key-value labels (e.g. 'Father's Name : Arun Yadav', 'Marital Status : Single', etc.):
     Rebuild them using an invisible borderless 2-column table with 30% left width and 70% right width to guarantee perfect alignments:
     <table border="0" cellspacing="0" cellpadding="0" style="width: 100%; border-collapse: collapse; margin-top: 6pt; margin-bottom: 6pt; border: none;">
       <tr>
         <td style="width: 30%; padding: 4pt 0; vertical-align: top; border: none;">
           <p style="font-family: 'Calibri', 'Arial', sans-serif; font-size: 10.5pt; font-weight: bold; color: #111827; margin: 0;">LABEL_TEXT</p>
         </td>
         <td style="width: 70%; padding: 4pt 0; vertical-align: top; border: none;">
           <p style="font-family: 'Calibri', 'Arial', sans-serif; font-size: 10.5pt; color: #374151; margin: 0;">VALUE_TEXT</p>
         </td>
       </tr>
     </table>

6. ZERO ADVERTISING, ZERO WATERMARKS:
   - Ensure absolutely no conversion copyright text, watermark notes, references to the converter engine, or advertiser headers/footers exist. Only provide the clean, pure resume contents.

7. COMPLETE CONTENT TRANSCRIPTION:
   - All text blocks, item lists, and details must be fully preserved. Do not summarize, truncate, or omit names, scores, schools, or dates.
   - Return ONLY the clean HTML inside a single \`\`\`html...\`\`\` block.`;

      let prompt = '';
      if (rawPagesData && Array.isArray(rawPagesData) && rawPagesData.length > 0) {
        prompt += `Below is the detailed, spatial coordinate-rich representation of the text blocks on each PDF page. Use these 'x' positions to determine alignments, columns, tables, and left/right layouts correctly:\n\n`;
        rawPagesData.forEach((page: any) => {
          prompt += `--- PAGE ${page.pageNum} ---\n`;
          page.rows.forEach((row: any) => {
            const itemsStr = row.items.map((it: any) => `[x=${Math.round(it.x)}, h=${Math.round(it.h)}]: "${it.str}"`).join(' | ');
            prompt += `${itemsStr}\n`;
          });
          prompt += `\n`;
        });
      } else {
        prompt += `Below is the sequentially extracted text from the PDF file:\n\n${rawText}\n`;
      }
      prompt += `\n\nReconstruct this PDF layout precisely into active, beautiful, perfectly styled Microsoft Word compatible HTML body elements using standard 'Calibri' or 'Arial' inline typography.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.1,
        },
      });

      const parsedText = response.text || "";
      const htmlBlockMatch = parsedText.match(/```html([\s\S]*?)```/) || parsedText.match(/```([\s\S]*?)```/);
      const htmlContent = htmlBlockMatch ? htmlBlockMatch[1].trim() : parsedText.trim();

      return res.json({
        success: true,
        html: htmlContent
      });

    } catch (err: any) {
      console.error('Server error converting PDF to Word:', err);
      return res.status(500).json({
        error: 'SERVER_ERROR',
        message: err.message || 'An unexpected server error occurred during conversion.'
      });
    }
  });

  // Convert legacy .doc binary files to gorgeous HTML using a local parser paired with Gemini!
  app.post('/api/doc-to-html', async (req, res) => {
    try {
      const { base64Data, fileName } = req.body;
      if (!base64Data) {
        return res.status(400).json({ error: 'DATA_MISSING', message: 'No file data received.' });
      }

      let ai;
      try {
        ai = getGeminiClient();
      } catch (e: any) {
        return res.status(400).json({
          error: 'GEMINI_API_KEY_MISSING',
          message: 'Gemini API key is not configured. Cannot process legacy .doc file.'
        });
      }

      // Convert Base64 data to Node buffer
      const buffer = Buffer.from(base64Data, 'base64');

      // Check if it is a text-based file (HTML format, RTF format, or plain text) rather than OLE binary doc
      const rawText = buffer.toString('utf8');
      const isHtmlOrText = rawText.trim().startsWith('<') || 
                           rawText.includes('<!DOCTYPE') ||
                           rawText.includes('<html>') ||
                           (!rawText.includes('\x00') && rawText.length > 10);

      // Extract text content from Word document
      let documentText = '';
      if (isHtmlOrText) {
        console.log('Document is raw HTML or text-based. Processing directly.');
        documentText = rawText.substring(0, 50000); // safety cap
      } else {
        try {
          // @ts-ignore
          const extractor = new WordExtractor();
          const extracted = await extractor.extract(buffer);
          documentText = extracted.getBody();
        } catch (extractorErr: any) {
          console.error('word-extractor failed, trying advanced text extraction:', extractorErr);
          // Safe match for readable alphanumeric characters, punctuation and basic text structure
          const matches = rawText.match(/[\x20-\x7E\s\r\n\t]{4,}/g);
          if (matches) {
            // Filter out long sequences of non-alphanumeric chars or mostly punctuation (common in binaries)
            documentText = matches
              .filter(line => !/^[^\w\s\d]{4,}$/.test(line.trim()))
              .join('\n')
              .substring(0, 50000); // safety cap
          } else {
            documentText = 'Unable to extract clean text from this binary format.';
          }
        }
      }

      const systemInstruction = 
`You are an expert Document and Resume Conversion System.
Your job is to read and parse the text extracted from a legacy Microsoft Word binary (.doc) file and convert it into a beautifully structured, highly professional, standard HTML body.

Guidelines:
1. Reconstruct all major elements: headers, contact bars, lists, tables, bold text, dates, and sections.
2. Structure headings clearly using <h1>, <h2>, and <h3>.
3. If there are tables (such as Academic History, Marks, or Experience), format them as real standard HTML <table> elements with simple borders.
4. Output cleanly and preserve 100% of the content. Do not summarize or omit anything.
5. Return ONLY the clean HTML inside a single \`\`\`html...\`\`\` code block.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          documentText,
          "Parse this extracted Word document text and convert it to a pristine HTML document structure."
        ],
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.1,
        },
      });

      const parsedText = response.text || "";
      const htmlBlockMatch = parsedText.match(/```html([\s\S]*?)```/) || parsedText.match(/```([\s\S]*?)```/);
      const htmlContent = htmlBlockMatch ? htmlBlockMatch[1].trim() : parsedText.trim();

      return res.json({
        success: true,
        html: htmlContent
      });

    } catch (err: any) {
      console.error('Server error converting .doc to HTML:', err);
      return res.status(500).json({
        error: 'SERVER_ERROR',
        message: err.message || 'An unexpected server error occurred during legacy document conversion.'
      });
    }
  });

  // Vite middleware for development or serving index.html in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Express server running on http://localhost:${PORT}`);
  });
}

startServer();
