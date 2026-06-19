import express from 'express';
import path from 'path';
import fs from 'fs';
import nodemailer from 'nodemailer';
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

// Setup email transporter dynamically using env variables
const getTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });
};

const sendFeedbackEmail = async (rating: number, feedback: string, userEmail?: string, name?: string) => {
  const transporter = getTransporter();
  const dateStr = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }) + ' (Eastern Time/Server)';
  
  const mailOptions = {
    from: process.env.SMTP_USER || 'no-reply@toolmitra.com',
    to: 'ksurajyadav93@gmail.com',
    subject: `🌟 [ToolMitra] New ${rating}-Star Rating & Feedback Received!`,
    text: `Hello Sunil Kumar,\n\nYou have received a new user experience feedback on ToolMitra!\n\nSatisfaction Rating: ${rating}/5 Stars\nSender Name: ${name || 'Anonymous'}\nUser Email: ${userEmail || 'Not Provided'}\nSubmitted On: ${dateStr}\n\nFeedback Comment:\n"${feedback}"\n\nThanks,\nToolMitra Automations`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #f8fafc; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
        <div style="background: linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%); padding: 20px; border-radius: 12px; text-align: center; color: white;">
          <h2 style="margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">🌟 New ToolMitra Feedback Received!</h2>
          <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 14px;">Real-time experience submission from user</p>
        </div>
        <div style="padding: 25px 15px; color: #1e293b;">
          <p style="font-size: 16px; margin-top: 0;">Hello <strong>Sunil Kumar</strong>,</p>
          <p style="font-size: 14px; line-height: 1.6; color: #475569;">A user has just rated their experience on your website, <strong>ToolMitra</strong>. Here are the details of their submission:</p>
          
          <div style="background-color: #ffffff; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; margin: 24px 0;">
            <table border="0" cellpadding="0" cellspacing="0" style="width: 100%; font-size: 14px; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; color: #64748b; width: 140px;"><strong>Rating Received:</strong></td>
                <td style="padding: 6px 0; font-size: 16px; color: #eab308; font-weight: bold;">
                  ${'★'.repeat(rating)}${'☆'.repeat(5 - rating)} <span style="color: #334155; font-size: 14px; font-weight: normal; margin-left: 5px;">(${rating}/5)</span>
                </td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;"><strong>Sender Name:</strong></td>
                <td style="padding: 6px 0; color: #1e293b; font-weight: 500;">${name || '<em style="color: #94a3b8;">Anonymous Guest</em>'}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;"><strong>Sender Email:</strong></td>
                <td style="padding: 6px 0;">${userEmail ? `<a href="mailto:${userEmail}" style="color: #4f46e5; text-decoration: underline; font-weight: 500;">${userEmail}</a>` : '<em style="color: #94a3b8;">Not Provided</em>'}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;"><strong>Submitted On:</strong></td>
                <td style="padding: 6px 0; color: #475569;">${dateStr}</td>
              </tr>
            </table>
          </div>

          <div style="background-color: #f1f5f9; padding: 20px; border-radius: 12px; border-left: 4px solid #4f46e5; margin: 24px 0;">
            <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: bold; text-transform: uppercase; color: #4f46e5; letter-spacing: 0.5px;">User Comment / Suggestion:</p>
            <p style="margin: 0; font-size: 14px; line-height: 1.6; font-style: italic; color: #334155;">"${feedback || 'No comments left.'}"</p>
          </div>
        </div>
        <div style="border-top: 1px solid #e2e8f0; padding-top: 18px; text-align: center; color: #94a3b8; font-size: 12px;">
          <p>This notification is processed and dispatched by your Express Node.js application.</p>
          <p style="margin: 4px 0 0 0;">&copy; ${new Date().getFullYear()} ToolMitra. All rights reserved.</p>
        </div>
      </div>
    `
  };

  if (!transporter) {
    console.warn('⚠️ SMTP Server details are not present in .env file. Logged feedback internally without sending email:');
    console.log(`[Logged Feedback] ${name || 'Anonymous'} (${userEmail || 'No Email'}) rated ${rating}/5. Description: "${feedback}"`);
    return false;
  }

  try {
    await transporter.sendMail(mailOptions);
    console.log('✅ SMTP Email notification triggered successfully to ksurajyadav93@gmail.com');
    return true;
  } catch (err) {
    console.error('❌ Nodemailer failed to send feedback email:', err);
    return false;
  }
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON parser with a high limit (15MB) for base64 encoded photo uploads
  app.use(express.json({ limit: '15mb' }));

  // GET endpoints for community feedbacks
  app.get('/api/feedbacks', (req, res) => {
    try {
      const filePath = path.join(process.cwd(), 'feedbacks.json');
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const list = JSON.parse(fileContent);
        return res.json(list);
      }
      return res.json([]);
    } catch (err: any) {
      console.error('Error fetching feedbacks list:', err);
      return res.status(500).json({ error: 'FETCH_ERROR', message: err.message });
    }
  });

  // POST endpoint to accept a rating / review
  app.post('/api/feedback', async (req, res) => {
    try {
      const { rating, feedback, email, name } = req.body;
      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'RATING_INVALID', message: 'Rating is required and must stand between 1 and 5.' });
      }

      const filePath = path.join(process.cwd(), 'feedbacks.json');
      let feedbacksList: any[] = [];

      if (fs.existsSync(filePath)) {
        try {
          const fileContent = fs.readFileSync(filePath, 'utf8');
          feedbacksList = JSON.parse(fileContent);
        } catch (ex) {
          console.error('Failed to parse existing feedbacks file. Formatting as empty array.');
        }
      }

      // Extract a name if user email is present but name is empty
      let resolvedName = name ? name.trim() : '';
      if (!resolvedName) {
        if (email && email.includes('@')) {
          const parts = email.split('@')[0];
          resolvedName = parts.charAt(0).toUpperCase() + parts.slice(1);
        } else {
          resolvedName = 'Verified User';
        }
      }

      const newFeedback = {
        id: 'user-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        name: resolvedName,
        rating: Number(rating),
        feedback: feedback ? feedback.trim() : '',
        email: email ? email.trim() : '',
        date: new Date().toISOString()
      };

      feedbacksList.unshift(newFeedback);

      // Save to feedback store file
      fs.writeFileSync(filePath, JSON.stringify(feedbacksList, null, 2), 'utf8');

      // Send the email to creator
      const emailOutcome = await sendFeedbackEmail(newFeedback.rating, newFeedback.feedback, newFeedback.email, newFeedback.name);

      return res.json({
        success: true,
        message: 'Feedback submitted and saved successfully.',
        emailSent: emailOutcome,
        feedback: newFeedback
      });

    } catch (err: any) {
      console.error('Error submitting feedback response:', err);
      return res.status(500).json({
        error: 'SUBMIT_ERROR',
        message: err.message || 'An unexpected error occurred while writing feedback.'
      });
    }
  });

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
