import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import LucideIcon from '../LucideIcon';

type QRType = 'url' | 'text' | 'email' | 'phone' | 'whatsapp' | 'upi';

const COLOR_PRESETS = [
  { name: 'Slate Gray', dark: '#0f172a', light: '#ffffff' },
  { name: 'Indigo Cream', dark: '#4f46e5', light: '#f5f3ff' },
  { name: 'Forest Mint', dark: '#064e3b', light: '#f0fdf4' },
  { name: 'Royal Plum', dark: '#581c87', light: '#faf5ff' },
  { name: 'Ocean Air', dark: '#0369a1', light: '#ecfeff' },
  { name: 'Crimson Sun', dark: '#be185d', light: '#fff5f5' }
];

export default function QRCodeGenerator() {
  const [qrType, setQrType] = useState<QRType>('url');
  
  const getAestheticLabel = (): string => {
    if (qrType === 'url') {
      try {
        const cleanUrl = url.startsWith('http') ? url : `https://${url}`;
        const urlObj = new URL(cleanUrl);
        return urlObj.hostname || 'Website Link';
      } catch (e) {
        return 'Website Link';
      }
    }
    if (qrType === 'upi') return payeeName || 'UPI VPA Payment';
    if (qrType === 'whatsapp') return 'WhatsApp Connect';
    if (qrType === 'phone') return phoneNumber || 'Call Contact';
    if (qrType === 'email') return emailAddress || 'Send Email';
    return 'Text Record';
  };
  
  // Specific inputs
  const [url, setUrl] = useState('https://surajkyadav01.github.io/Suraj-Tech-Hub/');
  const [text, setText] = useState('Welcome to ToolMitra Digital Companion!');
  const [emailAddress, setEmailAddress] = useState('contact@example.com');
  const [emailSubject, setEmailSubject] = useState('Business Inquiry');
  const [emailBody, setEmailBody] = useState('Hello, I would like to get in touch regarding...');
  const [phoneNumber, setPhoneNumber] = useState('+919876543210');
  const [waNumber, setWaNumber] = useState('919876543210');
  const [waMessage, setWaMessage] = useState('Hello! I visited your website and would like to chat.');
  
  // UPI payment fields
  const [upiId, setUpiId] = useState('surajyadav@upi');
  const [payeeName, setPayeeName] = useState('Suraj Kumar Yadav');
  const [upiAmount, setUpiAmount] = useState('100');
  const [upiNote, setUpiNote] = useState('Payment for Dev Services');

  // Colors & styles
  const [darkColor, setDarkColor] = useState('#0f172a'); // default slate-900 / black
  const [lightColor, setLightColor] = useState('#ffffff'); // default white
  const [marginSize, setMarginSize] = useState(4); // default margins
  const [qrScale, setQrScale] = useState(10); // high resolution

  const [qrBlobUrl, setQrBlobUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Auto-generate QR code when any input changes
  useEffect(() => {
    generateQR();
  }, [
    qrType, url, text, emailAddress, emailSubject, emailBody,
    phoneNumber, waNumber, waMessage, upiId, payeeName, upiAmount, upiNote,
    darkColor, lightColor, marginSize, qrScale
  ]);

  const getQRContent = (): string => {
    switch (qrType) {
      case 'url':
        return url.trim();
      case 'text':
        return text;
      case 'email':
        return `mailto:${emailAddress}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
      case 'phone':
        return `tel:${phoneNumber.trim()}`;
      case 'whatsapp':
        return `https://wa.me/${waNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(waMessage)}`;
      case 'upi':
        const amountParam = upiAmount ? `&am=${encodeURIComponent(upiAmount)}` : '';
        const noteParam = upiNote ? `&tn=${encodeURIComponent(upiNote)}` : '';
        return `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}${amountParam}${noteParam}&cu=INR`;
      default:
        return '';
    }
  };

  const generateQR = async () => {
    try {
      const qrText = getQRContent();
      if (!qrText) return;

      const opts: QRCode.QRCodeRenderersOptions = {
        errorCorrectionLevel: 'H',
        margin: marginSize,
        scale: qrScale,
        color: {
          dark: darkColor,
          light: lightColor,
        },
      };

      // Generate Data URL
      const dataUrl = await QRCode.toDataURL(qrText, opts);
      setQrBlobUrl(dataUrl);
    } catch (err) {
      console.error('Error generating QR code', err);
    }
  };

  const downloadQR = () => {
    if (!qrBlobUrl) return;

    // Create a high-resolution canvas layout (800x1000 px)
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 1000;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background color helper (renders hex to rgba for clean transparency/shading support)
    const getRgba = (hex: string, alpha: number) => {
      const clean = hex.replace('#', '');
      const r = parseInt(clean.substring(0, 2), 16) || 0;
      const g = parseInt(clean.substring(2, 4), 16) || 0;
      const b = parseInt(clean.substring(4, 6), 16) || 0;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    // Rounded rectangle helper
    const drawRoundRect = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
      c.beginPath();
      c.moveTo(x + r, y);
      c.arcTo(x + w, y, x + w, y + h, r);
      c.arcTo(x + w, y + h, x, y + h, r);
      c.arcTo(x, y + h, x, y, r);
      c.arcTo(x, y, x + w, y, r);
      c.closePath();
    };

    // 1. Draw solid canvas background matching lightColor
    ctx.fillStyle = lightColor;
    ctx.fillRect(0, 0, 800, 1000);

    // 2. Load QR base64 image
    const img = new Image();
    img.src = qrBlobUrl;
    img.onload = () => {
      // 3. Draw TOP PILL ("SCAN & CONNECT")
      const pillW = 280;
      const pillH = 50;
      const pillX = 400 - pillW / 2;
      const pillY = 100;
      
      // Draw background of pill with low opacity
      drawRoundRect(ctx, pillX, pillY, pillW, pillH, 25);
      ctx.fillStyle = getRgba(darkColor, 0.08); // 8% opacity of chosen foreground
      ctx.fill();
      
      // Draw border of pill
      ctx.strokeStyle = getRgba(darkColor, 0.2); // 20% opacity border
      ctx.lineWidth = 2;
      ctx.stroke();

      // Write pill text
      ctx.fillStyle = darkColor;
      ctx.font = 'bold 16px "Inter", system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      try {
        (ctx as any).letterSpacing = '2px'; // Nice modern tracking
      } catch (e) {
        // Fallback for environments where letterSpacing attribute is not supported
      }
      ctx.fillText('SCAN & CONNECT', 400, 100 + pillH / 2);
      try {
        (ctx as any).letterSpacing = '0px'; // Reset letter spacing
      } catch (e) {}

      // 4. Draw MIDDLE QR CONTAINER (White rounded card around the QR code)
      const cardSize = 520;
      const cardX = 400 - cardSize / 2;
      const cardY = 200;
      drawRoundRect(ctx, cardX, cardY, cardSize, cardSize, 32);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      
      // Subtle shadow/border for QR card
      ctx.strokeStyle = getRgba(darkColor, 0.06);
      ctx.lineWidth = 3;
      ctx.stroke();

      // Draw actually generated QR Image inside the White Card (making it crisp with some inner padding)
      const qrPadding = 35;
      const qrSize = cardSize - (qrPadding * 2);
      const qrX = cardX + qrPadding;
      const qrY = cardY + qrPadding;
      ctx.drawImage(img, qrX, qrY, qrSize, qrSize);

      // 5. Draw BOTTOM BRANDED TEXTS
      // Main Aesthetic Label (hostname/description)
      ctx.fillStyle = darkColor;
      ctx.font = 'bold 30px "Inter", system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      
      // Truncate text if it is too long for the canvas width (800px)
      const labelText = getAestheticLabel().toUpperCase();
      let printedLabelStr = labelText;
      const maxLabelTextWidth = 700;
      const textWidth = ctx.measureText(printedLabelStr).width;
      if (textWidth > maxLabelTextWidth) {
        // Truncate and add ellipsis
        let len = printedLabelStr.length;
        while (ctx.measureText(printedLabelStr + '...').width > maxLabelTextWidth && len > 0) {
          len--;
          printedLabelStr = printedLabelStr.substring(0, len);
        }
        printedLabelStr += '...';
      }
      ctx.fillText(printedLabelStr, 400, 810);

      // Sub text / Secured badge
      ctx.fillStyle = getRgba(darkColor, 0.6); // 60% opacity sub-branding
      ctx.font = '500 18px "Inter", system-ui, -apple-system, sans-serif';
      ctx.fillText('ToolMitra Secured', 400, 855);

      // 6. Execute trigger download
      try {
        const fullCardDataUrl = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.href = fullCardDataUrl;
        downloadLink.download = `toolmitra_qr_${qrType}_premium.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      } catch (err) {
        console.error('Error generating card download URL', err);
        // Fallback to raw QR code download if canvas security policies block base64 image formats
        const downloadLink = document.createElement('a');
        downloadLink.href = qrBlobUrl;
        downloadLink.download = `toolmitra_qr_${qrType}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      }
    };
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Configuration Column */}
      <div className="lg:col-span-7 space-y-6">
        <div>
          <h3 className="text-sm font-bold text-slate-450 dark:text-slate-500 uppercase tracking-widest mb-3">
            Select QR Content Source
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {[
              { type: 'url', label: 'Link', icon: 'Globe' },
              { type: 'text', label: 'Text', icon: 'FileText' },
              { type: 'email', label: 'Email', icon: 'MessageSquare' },
              { type: 'phone', label: 'Phone', icon: 'Phone' },
              { type: 'whatsapp', label: 'WhatsApp', icon: 'Globe' },
              { type: 'upi', label: 'UPI Pay', icon: 'CreditCard' },
            ].map((item) => (
              <button
                key={item.type}
                type="button"
                onClick={() => setQrType(item.type as QRType)}
                className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-xl border text-center transition-all cursor-pointer ${
                  qrType === item.type
                    ? 'border-indigo-600 bg-indigo-50/40 text-indigo-700 dark:border-cyan-550 dark:bg-cyan-500/10 dark:text-cyan-400'
                    : 'border-slate-200 dark:border-slate-800 bg-transparent text-slate-550 hover:bg-slate-50 dark:hover:bg-slate-805'
                }`}
              >
                <LucideIcon name={item.icon} size={16} className="mb-1" />
                <span className="text-[11px] font-semibold">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Input Forms */}
        <div className="p-5 border border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl space-y-4">
          {qrType === 'url' && (
            <div className="space-y-1.5 animate-fadeIn">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Website & Redirect URL</label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full text-xs px-3.5 py-2.5 bg-white dark:bg-slate-805 border border-slate-200 dark:border-slate-800 rounded-xl outline-none"
              />
              <p className="text-[10px] text-slate-400">Include http:// or https:// so scanner browsers load the webpage automatically.</p>
            </div>
          )}

          {qrType === 'text' && (
            <div className="space-y-1.5 animate-fadeIn">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Plain Text / Notes</label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={4}
                placeholder="Enter simple reference details or static notes to encode..."
                className="w-full text-xs px-3.5 py-2.5 bg-white dark:bg-slate-805 border border-slate-200 dark:border-slate-800 rounded-xl outline-none resize-none"
              />
            </div>
          )}

          {qrType === 'email' && (
            <div className="space-y-3.5 animate-fadeIn">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Target Email Address</label>
                <input
                  type="email"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  placeholder="contact@company.com"
                  className="w-full text-xs px-3.5 py-2.5 bg-white dark:bg-slate-805 border border-slate-200 dark:border-slate-800 rounded-xl outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-705 dark:text-slate-350">Default Subject (Optional)</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Inquiry"
                  className="w-full text-xs px-3.5 py-2.5 bg-white dark:bg-slate-805 border border-slate-200 dark:border-slate-800 rounded-xl outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-705 dark:text-slate-350">Pre-filled Body Text (Optional)</label>
                <textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  rows={2}
                  placeholder="Message content..."
                  className="w-full text-xs px-3.5 py-2.5 bg-white dark:bg-slate-805 border border-slate-200 dark:border-slate-800 rounded-xl outline-none resize-none"
                />
              </div>
            </div>
          )}

          {qrType === 'phone' && (
            <div className="space-y-1.5 animate-fadeIn">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Recipient Phone Number</label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+919876543210"
                className="w-full text-xs px-3.5 py-2.5 bg-white dark:bg-slate-805 border border-slate-200 dark:border-slate-800 rounded-xl outline-none"
              />
              <p className="text-[10px] text-slate-400">Scanners will prompt the user to automatically call this number upon scan trigger.</p>
            </div>
          )}

          {qrType === 'whatsapp' && (
            <div className="space-y-3.5 animate-fadeIn">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">WhatsApp Number (with country code, no space)</label>
                <input
                  type="text"
                  value={waNumber}
                  onChange={(e) => setWaNumber(e.target.value)}
                  placeholder="919876543210"
                  className="w-full text-xs px-3.5 py-2.5 bg-white dark:bg-slate-805 border border-slate-200 dark:border-slate-800 rounded-xl outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-705 dark:text-slate-350">Welcome Text Message</label>
                <textarea
                  value={waMessage}
                  onChange={(e) => setWaMessage(e.target.value)}
                  rows={2}
                  placeholder="Welcome message text..."
                  className="w-full text-xs px-3.5 py-2.5 bg-white dark:bg-slate-805 border border-slate-200 dark:border-slate-800 rounded-xl outline-none resize-none"
                />
              </div>
            </div>
          )}

          {qrType === 'upi' && (
            <div className="space-y-3.5 animate-fadeIn">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">UPI Address ID (VPA)</label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="name@upi"
                    className="w-full text-xs px-3.5 py-2.5 bg-white dark:bg-slate-805 border border-slate-200 dark:border-slate-800 rounded-xl outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Payee Name</label>
                  <input
                    type="text"
                    value={payeeName}
                    onChange={(e) => setPayeeName(e.target.value)}
                    placeholder="Suraj Kumar"
                    className="w-full text-xs px-3.5 py-2.5 bg-white dark:bg-slate-805 border border-slate-200 dark:border-slate-800 rounded-xl outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-705 dark:text-slate-350">Amount (INR)</label>
                  <input
                    type="number"
                    value={upiAmount}
                    onChange={(e) => setUpiAmount(e.target.value)}
                    placeholder="100"
                    className="w-full text-xs px-3.5 py-2.5 bg-white dark:bg-slate-805 border border-slate-200 dark:border-slate-800 rounded-xl outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-705 dark:text-slate-350">Payment Note / Remark</label>
                  <input
                    type="text"
                    value={upiNote}
                    onChange={(e) => setUpiNote(e.target.value)}
                    placeholder="Service Payment"
                    className="w-full text-xs px-3.5 py-2.5 bg-white dark:bg-slate-805 border border-slate-200 dark:border-slate-800 rounded-xl outline-none"
                  />
                </div>
              </div>
              <p className="text-[10px] text-slate-400">Scanners like BHIM, PhonePe, Paytm or Google Pay in India will decode this directly into payment screens.</p>
            </div>
          )}
        </div>

        {/* Configurations settings */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-5 space-y-4">
          <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            QR Color & Margin Styles
          </h3>

          {/* Aesthetic theme presets selection block */}
          <div className="space-y-1.5 pb-2">
            <span className="text-[10px] uppercase font-bold text-slate-450 dark:text-slate-500 block">Quick Aesthetic Presets</span>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map((preset) => {
                const isActive = darkColor.toLowerCase() === preset.dark.toLowerCase() && lightColor.toLowerCase() === preset.light.toLowerCase();
                return (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => {
                      setDarkColor(preset.dark);
                      setLightColor(preset.light);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-wider transition-all active:scale-95 cursor-pointer ${
                      isActive
                        ? 'border-indigo-500 dark:border-cyan-400 bg-indigo-50/40 dark:bg-cyan-500/10 font-bold text-indigo-700 dark:text-cyan-400'
                        : 'border-slate-205 dark:border-slate-800 bg-white dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-805/40 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full border border-slate-300 shrink-0" style={{ backgroundColor: preset.dark }} />
                    <span className="w-2.5 h-2.5 rounded-full border border-slate-300 -ml-1.5 shrink-0" style={{ backgroundColor: preset.light }} />
                    <span>{preset.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Foreground Color</span>
                <span className="font-mono text-[10px] text-slate-400">{darkColor}</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={darkColor}
                  onChange={(e) => setDarkColor(e.target.value)}
                  className="w-10 h-10 p-0 rounded-xl cursor-pointer border border-slate-200 dark:border-slate-800 bg-transparent outline-none"
                />
                <div className="flex-1 flex gap-1.5">
                  {['#0f172a', '#1e1b4b', '#0369a1', '#15803d', '#be185d'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setDarkColor(c)}
                      className="w-6 h-6 rounded-full border border-white dark:border-slate-900 transition-transform active:scale-95 cursor-pointer shadow-sm"
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Background Color</span>
                <span className="font-mono text-[10px] text-slate-400">{lightColor}</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={lightColor}
                  onChange={(e) => setLightColor(e.target.value)}
                  className="w-10 h-10 p-0 rounded-xl cursor-pointer border border-slate-200 dark:border-slate-800 bg-transparent outline-none"
                />
                <div className="flex-1 flex gap-1.5">
                  {['#ffffff', '#f8fafc', '#f1f5f9', '#ecfeff', '#fffbeb'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setLightColor(c)}
                      className="w-6 h-6 rounded-full border border-slate-200 dark:border-slate-800 transition-transform active:scale-95 cursor-pointer shadow-sm"
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-705 dark:text-slate-300">Quiet Zone (Margin)</label>
              <select
                value={marginSize}
                onChange={(e) => setMarginSize(Number(e.target.value))}
                className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-800 border border-slate-205 dark:border-slate-800 rounded-xl outline-none"
              >
                <option value={1}>1 (Compact)</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={4}>4 (Standard)</option>
                <option value={6}>6</option>
                <option value={8}>8 (Wide)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-750 dark:text-slate-300">Output Resolution</label>
              <select
                value={qrScale}
                onChange={(e) => setQrScale(Number(e.target.value))}
                className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-800 border border-slate-205 dark:border-slate-800 rounded-xl outline-none"
              >
                <option value={5}>300px (Draft)</option>
                <option value={10}>600px (Medium)</option>
                <option value={15}>1000px (High-Res)</option>
                <option value={20}>1500px (Ultra-HQ)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Column */}
      <div className="lg:col-span-5 flex flex-col items-center justify-center space-y-6">
        <h3 className="w-full text-center text-sm font-bold text-slate-450 dark:text-slate-500 uppercase tracking-widest">
          Dynamic Live Preview
        </h3>

        <div 
          className="border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 flex flex-col items-center justify-center w-full max-w-[280px]"
          style={{ backgroundColor: lightColor }}
        >
          {/* Header Tag styled to match chosen foreground */}
          <div className="text-center mb-4 select-none">
            <span 
              className="text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border transition-all duration-300"
              style={{ 
                color: darkColor, 
                borderColor: `${darkColor}33`, 
                backgroundColor: `${darkColor}12`
              }}
            >
              Scan &amp; Connect
            </span>
          </div>

          <div className="bg-white p-2.5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800/10 w-full h-auto flex items-center justify-center transition-all duration-300">
            {qrBlobUrl ? (
              <img
                src={qrBlobUrl}
                alt="QR Code Output"
                referrerPolicy="no-referrer"
                className="w-full h-auto object-contain select-none rounded-lg"
              />
            ) : (
              <div className="w-52 h-52 bg-slate-100 dark:bg-slate-850 animate-pulse rounded-xl flex items-center justify-center text-xs text-slate-400">
                Generating Code...
              </div>
            )}
          </div>

          {/* Branded Footer Tag styled to match client input */}
          <div className="text-center mt-4 w-full select-none">
            <p className="text-[11px] font-sans font-bold uppercase tracking-wider truncate mb-0.5" style={{ color: darkColor }}>
              {getAestheticLabel()}
            </p>
            <p className="text-[8px] font-medium" style={{ color: `${darkColor}a0` }}>
              ToolMitra Secured
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={!qrBlobUrl}
          onClick={downloadQR}
          className="w-full max-w-xs py-3.5 px-6 bg-indigo-650 hover:bg-indigo-750 dark:bg-cyan-500 dark:hover:bg-cyan-600 font-bold text-xs uppercase tracking-widest text-white dark:text-slate-950 rounded-xl shadow-lg transition-all hover:scale-102 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <LucideIcon name="Download" size={14} />
          <span>Download QR Code Image</span>
        </button>

        <div className="text-center max-w-xs space-y-1.5 p-4 border border-slate-100 dark:border-slate-850 bg-slate-50/20 dark:bg-slate-850/10 rounded-2xl">
          <p className="text-[10px] text-slate-400 leading-relaxed font-mono">
            Encoded size: {getQRContent().length} characters <br />
            Correction level: High (L-3)
          </p>
          <p className="text-[9px] text-slate-350 leading-relaxed">
            Scan with any standard native iOS, Android Camera or QR reader apps. This operates 100% locally in your browser.
          </p>
        </div>
      </div>

      {/* Structured Content & Frequently Asked Questions */}
      <div className="lg:col-span-12 border-t border-slate-100 dark:border-slate-800 pt-8 mt-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">About QR Code Generator</h2>
        <p className="text-xs text-slate-600 dark:text-slate-350 leading-relaxed max-w-4xl mb-6">
          Our online QR Code Generator allows you to instantly generate customized, high-resolution QR codes right inside your browser window. Since all computations are calculated locally inside your browser tab using modern HTML5 canvas engines, nothing is shared or sent to external databases. This is perfect for storing payment links, Wi-Fi parameters, vCards, links, and text fully encrypted offline!
        </p>

        <h3 className="font-bold text-sm text-slate-800 dark:text-slate-205 mb-4">Frequently Asked Questions (FAQ)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-slate-150/80 dark:border-slate-805 bg-white/50 dark:bg-slate-900/10">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-1.5">How much data can a QR Code hold?</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              A standard QR code can store up to 3,000 characters of alphanumeric data. However, shorter strings create simpler patterns which are faster and easier to scan on budget legacy smartphone lenses.
            </p>
          </div>
          <div className="p-4 rounded-xl border border-slate-150/80 dark:border-slate-805 bg-white/50 dark:bg-slate-900/10">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-1.5">What is Error Correction Level?</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              We default to Level H (High), which allows the QR Code to remain completely scannable and functional even if up to 30% of its area is covered, dirty, or physically torn!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
