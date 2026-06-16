import React, { useState } from 'react';
import LucideIcon from '../LucideIcon';
// @ts-ignore
import html2pdf from 'html2pdf.js';

type TemplateType = 'traditional-format' | 'ats-professional' | 'modern-indigo' | 'fresher-clean' | 'developer';

interface EduEntry {
  degree: string;
  school: string;
  year: string;
  gpa: string;
}

interface ExpEntry {
  role: string;
  company: string;
  duration: string;
  details: string;
}

interface ProjEntry {
  title: string;
  tech: string;
  details: string;
}

interface CertEntry {
  name: string;
  issuer: string;
  year: string;
}

export default function AiResumeBuilder() {
  const [step, setStep] = useState<number>(1);
  const [template, setTemplate] = useState<TemplateType>('traditional-format');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const showNotification = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 7000);
  };

  // Form states empty so users can fill their own details easily and avoid confusion
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [personal, setPersonal] = useState({
    name: '',
    title: '',
    email: '',
    phone: '',
    location: '',
    linkedin: '',
    portfolio: '',
    github: '',
    twitter: '',
    fatherName: '',
    dob: '',
    languages: '',
    gender: '',
    nationality: '',
    maritalStatus: '',
    declaration: 'I hereby declare that the above information given by me is true to best of my Knowledge.',
  });

  const [objective, setObjective] = useState('');

  const [education, setEducation] = useState<EduEntry[]>([
    { degree: '', school: '', year: '', gpa: '' }
  ]);

  const [skills, setSkills] = useState({
    technical: '',
    soft: ''
  });

  const [experience, setExperience] = useState<ExpEntry[]>([
    { role: '', company: '', duration: '', details: '' }
  ]);

  const [projects, setProjects] = useState<ProjEntry[]>([
    { title: '', tech: '', details: '' }
  ]);

  const [certs, setCerts] = useState<CertEntry[]>([
    { name: '', issuer: '', year: '' }
  ]);

  // AI Prompt Co-pilot helpers
  const [aiActiveTab, setAiActiveTab] = useState<'obj' | 'project' | 'skills' | null>(null);
  const [aiRole, setAiRole] = useState<string>('Full Stack Software Engineer');
  const [aiExp, setAiExp] = useState<string>('Mid Level');
  const [aiSelectedProjIdx, setAiSelectedProjIdx] = useState<number>(0);

  // Suggested Objectives Library
  const aiObjectives: Record<string, Record<string, string[]>> = {
    'Full Stack Software Engineer': {
      'Fresher': [
        'Detail-oriented Computer Science graduate with hands-on project experience in MERN stack. Eager to bring clean coding principles, database management skills, and high-energy responsiveness to active engineering teams.',
        'Enthusiastic React developer seeking to apply frontend algorithms, analytical problem-solving skills, and UI standard guidelines to build high-performance user journeys.'
      ],
      'Mid Level': [
        'Dedicated Developer with 3+ years of experience optimizing full-stack ecosystems. Proven track record of improving dashboard loading speeds, designing RESTful APIs, and implementing clean state management architectures.',
        'Performance-driven Frontend Engineer focusing on React and responsive pixel-perfection. Adept at migrating legacy systems, writing test suites, and scaling user retention metrics.'
      ]
    },
    'Data Analyst': {
      'Fresher': [
        'Analytical thinker proficient in Python, SQL, and Excel data modeling. Passionate about parsing metrics patterns, compiling dashboard reporting channels, and helping business strategies grow.',
        'Meticulous analyst fluent in visualization suites. Eager to leverage quantitative insights and high-quality structured query skills to support core product pipelines.'
      ],
      'Mid Level': [
        'Inquisitive Data Analyst with 4 years of business intelligence experience. Expert in designing ETL streams, formulating predictive metrics, and boosting pipeline conversion rates by 15%.',
        'Insight-driven analyst with expertise in cloud warehouses and Tableau dashboards. Passionate about translating complex datasets into clear, actionable executive summaries.'
      ]
    }
  };

  // Skill suggester
  const suggestSkills = () => {
    let tech = 'JavaScript, TypeScript, React, Tailwind, Git';
    if (aiRole.toLowerCase().includes('engineer') || aiRole.toLowerCase().includes('developer')) {
      tech = 'JavaScript, TypeScript, React.js, Node.js, Express, PostgreSQL, MongoDB, Docker, RESTful APIs, Git, CI/CD, AWS';
    } else if (aiRole.toLowerCase().includes('analyst')) {
      tech = 'SQL, Python, Excel Models, PowerBI, Tableau, Pandas, NumPy, Statistics, Data Warehousing';
    } else if (aiRole.toLowerCase().includes('product') || aiRole.toLowerCase().includes('marketing')) {
      tech = 'Product Strategy, SEO Analytics, Google Analytics, Market Analysis, Wireframing, Agile / Scrum, SQL Basic';
    }
    setSkills({
      ...skills,
      technical: tech
    });
    setAiActiveTab(null);
  };

  // Project description improver (STAR method)
  const improveProject = () => {
    const proj = projects[aiSelectedProjIdx];
    if (!proj) return;

    let improved = '';
    if (proj.title.toLowerCase().includes('commerce') || proj.title.toLowerCase().includes('shop')) {
      improved = 'Integrated secure payment gateways and styled custom billing receipts. Automated email delivery status notifications and optimized API query performance, reducing network latency by 35% using client-side pre-fetching strategies.';
    } else {
      improved = `Rebuilt the main user workflow using ${proj.tech || 'modern libraries'} on a localized grid. Formulated secure responsive hooks that boosted active engagement rates by 22% and eliminated redundant layout renders.`;
    }

    const updated = [...projects];
    updated[aiSelectedProjIdx] = {
      ...proj,
      details: improved
    };
    setProjects(updated);
    setAiActiveTab(null);
  };

  const handleApplyObjective = (text: string) => {
    setObjective(text);
    setAiActiveTab(null);
  };

  // Add & delete list entries
  const handleAddEdu = () => setEducation([...education, { degree: '', school: '', year: '', gpa: '' }]);
  const handleDelEdu = (idx: number) => {
    const next = education.filter((_, i) => i !== idx);
    setEducation(next.length > 0 ? next : [{ degree: '', school: '', year: '', gpa: '' }]);
  };

  const handleAddExp = () => setExperience([...experience, { role: '', company: '', duration: '', details: '' }]);
  const handleDelExp = (idx: number) => {
    const next = experience.filter((_, i) => i !== idx);
    setExperience(next.length > 0 ? next : [{ role: '', company: '', duration: '', details: '' }]);
  };

  const handleAddProj = () => setProjects([...projects, { title: '', tech: '', details: '' }]);
  const handleDelProj = (idx: number) => {
    const next = projects.filter((_, i) => i !== idx);
    setProjects(next.length > 0 ? next : [{ title: '', tech: '', details: '' }]);
  };

  const handleAddCert = () => setCerts([...certs, { name: '', issuer: '', year: '' }]);
  const handleDelCert = (idx: number) => {
    const next = certs.filter((_, i) => i !== idx);
    setCerts(next.length > 0 ? next : [{ name: '', issuer: '', year: '' }]);
  };

  // High quality vector HTML Print compilation
  const triggerPrintPdf = () => {
    const resumeFrame = document.createElement('iframe');
    resumeFrame.style.position = 'fixed';
    resumeFrame.style.left = '-9999px';
    resumeFrame.style.top = '0';
    resumeFrame.style.width = '1024px';
    resumeFrame.style.height = '768px';
    resumeFrame.style.border = 'none';
    resumeFrame.style.pointerEvents = 'none';
    document.body.appendChild(resumeFrame);

    const frameDoc = resumeFrame.contentDocument || resumeFrame.contentWindow?.document;
    if (!frameDoc) return;

    // Define visual templates styling maps
    let templateCss = '';
    if (template === 'traditional-format') {
      templateCss = `
        body { font-family: 'Segoe UI', 'Arial', sans-serif; padding: 0.4in 0.5in; color: #111111; line-height: 1.45; font-size: 10pt; background: #fff; }
        .resume-header-title { text-align: center; font-size: 18pt; font-weight: bold; color: #000; text-transform: uppercase; margin: 0 0 15px 0; letter-spacing: 2px; }
        .personal-name { font-size: 20pt; font-weight: bold; color: #000; margin-bottom: 2px; }
        .personal-title { font-size: 11pt; font-style: normal; color: #1e3a8a; margin-bottom: 8px; font-weight: bold; }
        .contact-split { display: flex; justify-content: space-between; font-size: 10pt; margin-top: 5px; line-height: 1.4; color: #111; }
        .contact-left { width: 55%; }
        .contact-right { width: 45%; text-align: right; }
        .primary-hr { border: none; border-top: 1.5px solid #000; margin: 8px 0 15px 0; }
        .section-banner { background-color: #e0f2fe; color: #1e3a8a; padding: 5px 10px; font-size: 11pt; font-weight: bold; text-transform: uppercase; margin-top: 18px; margin-bottom: 10px; border-radius: 2px; letter-spacing: 0.5px; border: 1px solid #bae6fd; font-family: 'Segoe UI', sans-serif; }
        .section-text { font-size: 10pt; color: #111; margin-bottom: 12px; text-align: justify; line-height: 1.5; }
        .academic-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; border: 1.5px solid #000; }
        .academic-table th { background-color: #f1f5f9; color: #0f172a; font-weight: bold; font-size: 9.5pt; border: 1px solid #000; padding: 6px; text-align: left; }
        .academic-table td { font-size: 9.5pt; border: 1px solid #000; padding: 6px; color: #111; }
        .bullet-list { margin: 5px 0 12px 20px; padding: 0; list-style-type: disc; }
        .bullet-list li { font-size: 10pt; color: #111; margin-bottom: 5px; line-height: 1.4; }
        .info-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
        .info-table td { font-size: 10pt; padding: 3px 0; vertical-align: top; color: #111; }
        .info-label { width: 25%; font-weight: bold; }
        .info-colon { width: 5%; text-align: center; }
        .info-val { width: 70%; }
        .footer-signature { display: flex; justify-content: space-between; margin-top: 35px; font-size: 10pt; font-weight: bold; color: #111; }
      `;
    } else if (template === 'ats-professional') {
      templateCss = `
        body { font-family: 'Georgia', serif; padding: 0.45in; color: #1e293b; line-height: 1.4; font-size: 9.5pt; background: #fff; }
        h1 { font-size: 20pt; text-align: center; margin: 0 0 3pt 0; text-transform: uppercase; font-weight: bold; color: #1e3a8a; letter-spacing: 0.5px; }
        .subtitle { text-align: center; font-style: italic; color: #2563eb; font-size: 10.5pt; font-weight: 500; margin-bottom: 3pt; }
        .contact-bar { display: flex; justify-content: center; flex-wrap: wrap; gap: 8px; font-size: 8.5pt; color: #475569; margin-bottom: 10pt; border-bottom: 2px solid #2563eb; padding-bottom: 6px; }
        .section-title { font-size: 10.5pt; font-weight: bold; text-transform: uppercase; color: #1e3a8a; border-bottom: 1.5px solid #3b82f6; margin: 12pt 0 5pt 0; padding-bottom: 2px; letter-spacing: 0.8px; }
        .item { margin-bottom: 8pt; }
        .item-header { display: flex; justify-content: space-between; font-weight: bold; color: #0f172a; margin-bottom: 0.5pt; }
        .item-sub { display: flex; justify-content: space-between; font-style: italic; color: #2563eb; margin-bottom: 2pt; font-size: 9pt; }
        ul { margin: 2pt 0 0 14pt; padding: 0; }
        li { margin-bottom: 2pt; }
        p { margin: 3pt 0 0 0; text-align: justify; color: #334155; }
      `;
    } else if (template === 'modern-indigo') {
      templateCss = `
        body { font-family: 'Segoe UI', 'Inter', sans-serif; padding: 0.45in; color: #334155; line-height: 1.45; font-size: 9.5pt; background: #fff; }
        h1 { font-size: 22pt; color: #1e3a8a; margin: 0 0 2pt 0; font-weight: bold; letter-spacing: -0.5px; }
        .title-desc { font-size: 11pt; color: #2563eb; font-weight: 600; margin-bottom: 6pt; }
        .contact-bar { display: flex; flex-wrap: wrap; gap: 8pt; font-size: 8.5pt; color: #475569; margin-bottom: 12pt; border-bottom: 2px solid #93c5fd; padding-bottom: 8px; }
        .section-title { font-size: 11.5pt; font-weight: bold; color: #1e3a8a; margin: 14pt 0 6pt 0; text-transform: uppercase; letter-spacing: 1px; border-left: 3.5px solid #2563eb; padding-left: 8px; }
        .item { margin-bottom: 8pt; }
        .item-header { display: flex; justify-content: space-between; font-weight: bold; color: #0f172a; }
        .item-sub { display: flex; justify-content: space-between; color: #2563eb; font-size: 9pt; margin-bottom: 2pt; font-weight: 500; }
        p { margin: 3pt 0 0 0; text-align: justify; color: #475569; }
      `;
    } else if (template === 'fresher-clean') {
      templateCss = `
        body { font-family: 'Segoe UI', 'Calibri', sans-serif; padding: 0.45in; color: #1e293b; line-height: 1.4; font-size: 9.5pt; background: #fff; }
        h1 { font-size: 22pt; color: #1e3a8a; margin: 0 0 2pt 0; text-align: left; font-weight: bold; }
        .subtitle { text-align: left; color: #2563eb; font-size: 11pt; font-weight: 500; margin-bottom: 4pt; }
        .contact-bar { font-size: 8.5pt; color: #475569; margin-bottom: 12pt; border-bottom: 1.5px dashed #93c5fd; padding-bottom: 6px; }
        .section-title { font-size: 11pt; font-weight: bold; color: #1e3a8a; margin: 12pt 0 5pt 0; border-left: 4px solid #2563eb; padding-left: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
        .item { margin-bottom: 6pt; }
        .item-header { display: flex; justify-content: space-between; font-weight: bold; color: #011627; }
        .item-sub { display: flex; justify-content: space-between; color: #2563eb; margin-bottom: 2pt; font-weight: 500; }
        p { margin: 2pt 0 0 0; text-align: justify; color: #334155; }
      `;
    } else {
      // Developer Two-column Layout code representation
      templateCss = `
        body { font-family: 'Consolas', 'Fira Code', monospace; padding: 0.4in; color: #0f172a; line-height: 1.35; font-size: 9pt; background: #fff; }
        .header { border-bottom: 3px double #2563eb; padding-bottom: 8pt; margin-bottom: 12pt; }
        h1 { font-size: 18pt; margin: 0; color: #1e3a8a; font-weight: bold; }
        .contact-bar { font-size: 8.5pt; color: #475569; margin-top: 4pt; }
        .layout-grid { display: grid; grid-template-columns: 2.8fr 1.2fr; gap: 14pt; }
        .section-title { font-size: 10pt; font-weight: bold; text-transform: uppercase; border-bottom: 1px dashed #2563eb; margin: 12pt 0 5pt 0; padding-bottom: 1px; color: #1e3a8a; }
        .side-section-title { font-size: 9.5pt; font-weight: bold; text-transform: uppercase; border-bottom: 1.5px solid #2563eb; margin-bottom: 5pt; margin-top: 10pt; color: #1e3a8a; }
        .item { margin-bottom: 6pt; }
        .item-header { font-weight: bold; display: flex; justify-content: space-between; color: #0f172a; }
        .badge { display: inline-block; background-color: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; padding: 1px 5px; font-size: 8pt; margin: 1px; border-radius: 4px; }
        p { margin: 2pt 0 0 0; color: #334155; }
      `;
    }

    // Build the structural HTML for printing document layouts
    let bodyContent = '';
    if (template === 'traditional-format') {
      bodyContent = `
        <div class="resume-header-title">RESUME</div>
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
          <div style="flex: 1; min-width: 0; padding-right: 15px;">
            <div class="personal-name">${personal.name || 'Your Name'}</div>
            <div class="personal-title">${personal.title || 'Target Role'}</div>
            
            <div class="contact-split">
              <div class="contact-left">
                ${personal.location ? `<strong>Address:</strong><br/>${personal.location.replace(/\n/g, '<br/>')}` : ''}
              </div>
              <div class="contact-right">
                ${personal.phone ? `<strong>Mob No.:</strong> ${personal.phone}<br/>` : ''}
                ${personal.email ? `<strong>Email Id:</strong> ${personal.email}` : ''}
              </div>
            </div>
          </div>
          ${profileImage ? `
            <div style="width: 1.05in; height: 1.3in; border: 1.5px solid #000; padding: 1.5px; text-align: center; background-color: #fff; flex-shrink: 0; margin-left: 15px; margin-top: 5px;">
              <img src="${profileImage}" style="width: 100%; height: 100%; object-fit: cover;" />
            </div>
          ` : ''}
        </div>
        <hr class="primary-hr" />

        ${objective ? `
          <div class="section-banner">Career Objective</div>
          <div class="section-text">${objective}</div>
        ` : ''}

        <div class="section-banner">Academic Qualification</div>
        <table class="academic-table">
          <thead>
            <tr>
              <th style="text-align: center; width: 8%;">S.No.</th>
              <th style="width: 32%;">Qualification</th>
              <th style="width: 35%;">University / Board</th>
              <th style="text-align: center; width: 12%;">Year</th>
              <th style="text-align: center; width: 13%;">Per %</th>
            </tr>
          </thead>
          <tbody>
            ${education.map((edu, idx) => `
              <tr>
                <td style="text-align: center;">${idx + 1}</td>
                <td>${edu.degree}</td>
                <td>${edu.school}</td>
                <td style="text-align: center;">${edu.year}</td>
                <td style="text-align: center;">${edu.gpa}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        ${skills.technical || skills.soft ? `
          <div class="section-banner">Other Qualification</div>
          <ul class="bullet-list">
            ${skills.technical ? `<li>${skills.technical}</li>` : ''}
            ${skills.soft ? `<li><strong>Core Skills:</strong> ${skills.soft}</li>` : ''}
          </ul>
        ` : ''}

        ${experience && experience.length > 0 && experience.some(exp => exp.role.trim() || exp.company.trim()) ? `
          <div class="section-banner">Work Experience</div>
          <ul class="bullet-list">
            ${experience.filter(exp => exp.role.trim() || exp.company.trim()).map(exp => `
              <li><strong>${exp.role}</strong> at <strong>${exp.company}</strong> (${exp.duration})${exp.details ? `<br/><em>${exp.details}</em>` : ''}</li>
            `).join('')}
          </ul>
        ` : ''}

        ${projects && projects.length > 0 && projects.some(proj => proj.title.trim()) ? `
          <div class="section-banner">Key Projects &amp; Products</div>
          <ul class="bullet-list">
            ${projects.filter(proj => proj.title.trim()).map(proj => `
              <li><strong>${proj.title}</strong> ${proj.tech ? `[${proj.tech}]` : ''} ${proj.details ? `<br/><em>${proj.details}</em>` : ''}</li>
            `).join('')}
          </ul>
        ` : ''}

        ${certs && certs.length > 0 && certs.some(c => c.name.trim()) ? `
          <div class="section-banner">Certifications &amp; Achievements</div>
          <ul class="bullet-list">
            ${certs.filter(c => c.name.trim()).map(c => `
              <li><strong>${c.name}</strong>${c.issuer ? ` - Issued by <em>${c.issuer}</em>` : ''}${c.year ? ` (${c.year})` : ''}</li>
            `).join('')}
          </ul>
        ` : ''}

        <div class="section-banner">Personal Information</div>
        <table class="info-table">
          <tbody>
            <tr>
              <td class="info-label">Father's Name</td>
              <td class="info-colon">:</td>
              <td class="info-val">${personal.fatherName || 'Not Specified'}</td>
            </tr>
            <tr>
              <td class="info-label">Date of Birth</td>
              <td class="info-colon">:</td>
              <td class="info-val">${personal.dob || 'Not Specified'}</td>
            </tr>
            <tr>
              <td class="info-label">Language Known</td>
              <td class="info-colon">:</td>
              <td class="info-val">${personal.languages || 'Not Specified'}</td>
            </tr>
            <tr>
              <td class="info-label">Gender</td>
              <td class="info-colon">:</td>
              <td class="info-val">${personal.gender || 'Not Specified'}</td>
            </tr>
            <tr>
              <td class="info-label">Nationality</td>
              <td class="info-colon">:</td>
              <td class="info-val">${personal.nationality || 'Not Specified'}</td>
            </tr>
            <tr>
              <td class="info-label">Marital Status</td>
              <td class="info-colon">:</td>
              <td class="info-val">${personal.maritalStatus || 'Not Specified'}</td>
            </tr>
          </tbody>
        </table>

        ${personal.declaration ? `
          <div class="section-banner">Declaration</div>
          <div class="section-text">${personal.declaration}</div>
        ` : ''}

        <div class="footer-signature">
          <div>Date :</div>
          <div style="margin-right: 30px;">(${personal.name})</div>
        </div>
      `;
    } else if (template !== 'developer') {
      bodyContent = `
        <h1>${personal.name}</h1>
        <div class="subtitle">${personal.title}</div>
        <div class="contact-bar">
          <span>${personal.email}</span> | <span>${personal.phone}</span> | <span>${personal.location}</span>
          ${personal.linkedin ? ` | <span>LinkedIn: ${personal.linkedin}</span>` : ''}
          ${personal.github ? ` | <span>GitHub: ${personal.github}</span>` : ''}
          ${personal.twitter ? ` | <span>X: ${personal.twitter}</span>` : ''}
          ${personal.portfolio ? ` | <span>Web: ${personal.portfolio}</span>` : ''}
        </div>

        ${objective ? `
          <div class="section-title">Career Objective</div>
          <p>${objective}</p>
        ` : ''}

        <div class="section-title">Core Professional Skills</div>
        <div class="item">
          <strong>Technical Skills:</strong> ${skills.technical}<br/>
          <strong>Professional Competencies:</strong> ${skills.soft}
        </div>

        <div class="section-title">Work Experience</div>
        ${experience.map(exp => `
          <div class="item">
            <div class="item-header">
              <span>${exp.role}</span>
              <span>${exp.duration}</span>
            </div>
            <div class="item-sub">
              <span>${exp.company}</span>
            </div>
            <p style="margin:4pt 0 0 0; text-align:justify;">${exp.details}</p>
          </div>
        `).join('')}

        <div class="section-title">Academic History</div>
        ${education.map(edu => `
          <div class="item">
            <div class="item-header">
              <span>${edu.degree}</span>
              <span>${edu.year}</span>
            </div>
            <div class="item-sub">
              <span>${edu.school}</span>
              <span>${edu.gpa}</span>
            </div>
          </div>
        `).join('')}

        <div class="section-title">Key Projects &amp; Products</div>
        ${projects.map(proj => `
          <div class="item">
            <div class="item-header">
              <span>${proj.title}</span>
              <span style="font-size:8.5pt; font-weight:normal; color:#555;">[${proj.tech}]</span>
            </div>
            <p style="margin:4pt 0 0 0; text-align:justify;">${proj.details}</p>
          </div>
        `).join('')}

        ${certs.length > 0 ? `
          <div class="section-title">Certifications &amp; Achievements</div>
          ${certs.map(c => `
            <div style="margin-bottom:4pt;">
              <strong>${c.name}</strong> - Issued by <em>${c.issuer}</em> (${c.year})
            </div>
          `).join('')}
        ` : ''}
      `;
    } else {
      // Developer custom split structure
      bodyContent = `
        <div class="header">
          <h1>${personal.name}</h1>
          <div style="font-weight:bold; color:#011627;">${personal.title}</div>
          <div class="contact-bar">
            <span>Email: ${personal.email}</span> | <span>Cell: ${personal.phone}</span> | <span>Loc: ${personal.location}</span><br/>
            ${[
              personal.linkedin ? `<span>LinkedIn: ${personal.linkedin}</span>` : '',
              personal.github ? `<span>GitHub: ${personal.github}</span>` : '',
              personal.twitter ? `<span>X: ${personal.twitter}</span>` : '',
              personal.portfolio ? `<span>Web: ${personal.portfolio}</span>` : ''
            ].filter(Boolean).join(' | ')}
          </div>
        </div>

        <div class="layout-grid">
          <div>
            ${objective ? `
              <div class="section-title">> Objective</div>
              <p>${objective}</p>
            ` : ''}

            <div class="section-title">> Experience Timeline</div>
            ${experience.map(exp => `
              <div class="item">
                <div class="item-header">
                  <span>${exp.role}</span>
                  <span style="font-weight:normal;">${exp.duration}</span>
                </div>
                <div style="font-style:italic; margin-bottom:2pt;">${exp.company}</div>
                <p style="margin:2pt 0 0 0;">${exp.details}</p>
              </div>
            `).join('')}

            <div class="section-title">> Featured Work</div>
            ${projects.map(proj => `
              <div class="item">
                <div class="item-header">
                  <span>${proj.title}</span>
                  <span style="font-weight:normal; font-size:8pt;">[${proj.tech}]</span>
                </div>
                <p style="margin:2pt 0 0 0;">${proj.details}</p>
              </div>
            `).join('')}
          </div>

          <div>
            <div class="side-section-title">CORE SKILLS</div>
            <div style="margin-bottom:8pt;">
              <strong>Stack:</strong><br/>
              ${skills.technical.trim() ? skills.technical.split(',').filter(s => s.trim()).map(s => `<span class="badge">${s.trim()}</span>`).join('') : ''}
            </div>
            <div style="margin-bottom:8pt;">
              <strong>Soft:</strong><br/>
              ${skills.soft.trim() ? skills.soft.split(',').filter(s => s.trim()).map(s => `<span class="badge">${s.trim()}</span>`).join('') : ''}
            </div>

            <div class="side-section-title">EDUCATION</div>
            ${education.map(edu => `
              <div style="margin-bottom:6pt; font-size:8pt;">
                <strong>${edu.degree}</strong><br/>
                ${edu.school}<br/>
                Class of ${edu.year} (${edu.gpa})
              </div>
            `).join('')}

            <div class="side-section-title">CERTIFICATES</div>
            ${certs.map(c => `
              <div style="margin-bottom:4pt; font-size:8pt;">
                <strong>${c.name}</strong><br/>
                ${c.issuer} (${c.year})
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    frameDoc.open();
    frameDoc.write(`
      <html>
        <head>
          <style>${templateCss}</style>
        </head>
        <body>
          ${bodyContent}
        </body>
      </html>
    `);
    frameDoc.close();

    // Trigger printing
    setTimeout(() => {
      try {
        resumeFrame.contentWindow?.focus();
        resumeFrame.contentWindow?.print();
        showNotification("PDF print dialog triggered successfully! If the native dialog did not open, please click 'Download Portable HTML' below.", "success");
      } catch (err) {
        console.error("Direct print failure inside sandbox iframe:", err);
        showNotification("Direct browser print blocked by iframe sandbox! Please use the 'Download Portable HTML' option to print successfully.", "error");
      }
      
      // Remove temporary frame
      setTimeout(() => {
        try {
          if (resumeFrame && resumeFrame.parentNode) {
            document.body.removeChild(resumeFrame);
          }
        } catch (e) {}
      }, 1000);
    }, 500);
  };

  const downloadPdfResume = () => {
    setIsGenerating(true);

    let templateCss = '';
    if (template === 'traditional-format') {
      templateCss = `
        .pdf-resume { font-family: 'Segoe UI', 'Arial', sans-serif; padding: 0.4in 0.5in; color: #111111; line-height: 1.45; font-size: 10pt; background: #fff; }
        .pdf-resume .resume-header-title { text-align: center; font-size: 18pt; font-weight: bold; color: #000; text-transform: uppercase; margin: 0 0 15px 0; letter-spacing: 2px; }
        .pdf-resume .personal-name { font-size: 20pt; font-weight: bold; color: #000; margin-bottom: 2px; }
        .pdf-resume .personal-title { font-size: 11pt; font-style: normal; color: #1e3a8a; margin-bottom: 8px; font-weight: bold; }
        .pdf-resume .contact-split { display: flex; justify-content: space-between; font-size: 10pt; margin-top: 5px; line-height: 1.4; color: #111; }
        .pdf-resume .contact-left { width: 55%; }
        .pdf-resume .contact-right { width: 45%; text-align: right; }
        .pdf-resume .primary-hr { border: none; border-top: 1.5px solid #000; margin: 8px 0 15px 0; }
        .pdf-resume .section-banner { background-color: #e0f2fe; color: #1e3a8a; padding: 5px 10px; font-size: 11pt; font-weight: bold; text-transform: uppercase; margin-top: 18px; margin-bottom: 10px; border-radius: 2px; letter-spacing: 0.5px; border: 1px solid #bae6fd; font-family: 'Segoe UI', sans-serif; }
        .pdf-resume .section-text { font-size: 10pt; color: #111; margin-bottom: 12px; text-align: justify; line-height: 1.5; }
        .pdf-resume .academic-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; border: 1.5px solid #000; }
        .pdf-resume .academic-table th { background-color: #f1f5f9; color: #0f172a; font-weight: bold; font-size: 9.5pt; border: 1px solid #000; padding: 6px; text-align: left; }
        .pdf-resume .academic-table td { font-size: 9.5pt; border: 1px solid #000; padding: 6px; color: #111; }
        .pdf-resume .bullet-list { margin: 5px 0 12px 20px; padding: 0; list-style-type: disc; }
        .pdf-resume .bullet-list li { font-size: 10pt; color: #111; margin-bottom: 5px; line-height: 1.4; }
        .pdf-resume .info-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
        .pdf-resume .info-table td { font-size: 10pt; padding: 3px 0; vertical-align: top; color: #111; }
        .pdf-resume .info-label { width: 25%; font-weight: bold; }
        .pdf-resume .info-colon { width: 5%; text-align: center; }
        .pdf-resume .info-val { width: 70%; }
        .pdf-resume .footer-signature { display: flex; justify-content: space-between; margin-top: 35px; font-size: 10pt; font-weight: bold; color: #111; }
      `;
    } else if (template === 'ats-professional') {
      templateCss = `
        .pdf-resume { font-family: 'Georgia', serif; padding: 0.45in; color: #1e293b; line-height: 1.4; font-size: 9.5pt; background: #fff; }
        .pdf-resume h1 { font-size: 20pt; text-align: center; margin: 0 0 3pt 0; text-transform: uppercase; font-weight: bold; color: #1e3a8a; letter-spacing: 0.5px; }
        .pdf-resume .subtitle { text-align: center; font-style: italic; color: #2563eb; font-size: 10.5pt; font-weight: 500; margin-bottom: 3pt; }
        .pdf-resume .contact-bar { display: flex; justify-content: center; flex-wrap: wrap; gap: 8px; font-size: 8.5pt; color: #475569; margin-bottom: 10pt; border-bottom: 2px solid #2563eb; padding-bottom: 6px; }
        .pdf-resume .section-title { font-size: 10.5pt; font-weight: bold; text-transform: uppercase; color: #1e3a8a; border-bottom: 1.5px solid #3b82f6; margin: 12pt 0 5pt 0; padding-bottom: 2px; letter-spacing: 0.8px; }
        .pdf-resume .item { margin-bottom: 8pt; }
        .pdf-resume .item-header { display: flex; justify-content: space-between; font-weight: bold; color: #0f172a; margin-bottom: 0.5pt; }
        .pdf-resume .item-sub { display: flex; justify-content: space-between; font-style: italic; color: #2563eb; margin-bottom: 2pt; font-size: 9pt; }
        .pdf-resume ul { margin: 2pt 0 0 14pt; padding: 0; }
        .pdf-resume li { margin-bottom: 2pt; }
        .pdf-resume p { margin: 3pt 0 0 0; text-align: justify; color: #334155; }
      `;
    } else if (template === 'modern-indigo') {
      templateCss = `
        .pdf-resume { font-family: 'Segoe UI', 'Inter', sans-serif; padding: 0.45in; color: #334155; line-height: 1.45; font-size: 9.5pt; background: #fff; }
        .pdf-resume h1 { font-size: 22pt; color: #1e3a8a; margin: 0 0 2pt 0; font-weight: bold; letter-spacing: -0.5px; }
        .pdf-resume .title-desc { font-size: 11pt; color: #2563eb; font-weight: 600; margin-bottom: 6pt; }
        .pdf-resume .contact-bar { display: flex; flex-wrap: wrap; gap: 8pt; font-size: 8.5pt; color: #475569; margin-bottom: 12pt; border-bottom: 2px solid #93c5fd; padding-bottom: 8px; }
        .pdf-resume .section-title { font-size: 11.5pt; font-weight: bold; color: #1e3a8a; margin: 14pt 0 6pt 0; text-transform: uppercase; letter-spacing: 1px; border-left: 3.5px solid #2563eb; padding-left: 8px; }
        .pdf-resume .item { margin-bottom: 8pt; }
        .pdf-resume .item-header { display: flex; justify-content: space-between; font-weight: bold; color: #0f172a; }
        .pdf-resume .item-sub { display: flex; justify-content: space-between; color: #2563eb; font-size: 9pt; margin-bottom: 2pt; font-weight: 500; }
        .pdf-resume p { margin: 3pt 0 0 0; text-align: justify; color: #475569; }
      `;
    } else if (template === 'fresher-clean') {
      templateCss = `
        .pdf-resume { font-family: 'Segoe UI', 'Calibri', sans-serif; padding: 0.45in; color: #1e293b; line-height: 1.4; font-size: 9.5pt; background: #fff; }
        .pdf-resume h1 { font-size: 22pt; color: #1e3a8a; margin: 0 0 2pt 0; text-align: left; font-weight: bold; }
        .pdf-resume .subtitle { text-align: left; color: #2563eb; font-size: 11pt; font-weight: 500; margin-bottom: 4pt; }
        .pdf-resume .contact-bar { font-size: 8.5pt; color: #475569; margin-bottom: 12pt; border-bottom: 1.5px dashed #93c5fd; padding-bottom: 6px; }
        .pdf-resume .section-title { font-size: 11pt; font-weight: bold; color: #1e3a8a; margin: 12pt 0 5pt 0; border-left: 4px solid #2563eb; padding-left: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
        .pdf-resume .item { margin-bottom: 6pt; }
        .pdf-resume .item-header { display: flex; justify-content: space-between; font-weight: bold; color: #011627; }
        .pdf-resume .item-sub { display: flex; justify-content: space-between; color: #2563eb; margin-bottom: 2pt; font-weight: 500; }
        .pdf-resume p { margin: 2pt 0 0 0; text-align: justify; color: #334155; }
      `;
    } else {
      templateCss = `
        .pdf-resume { font-family: 'Consolas', 'Fira Code', monospace; padding: 0.4in; color: #0f172a; line-height: 1.35; font-size: 9pt; background: #fff; }
        .pdf-resume .header { border-bottom: 3px double #2563eb; padding-bottom: 8pt; margin-bottom: 12pt; }
        .pdf-resume h1 { font-size: 18pt; margin: 0; color: #1e3a8a; font-weight: bold; }
        .pdf-resume .contact-bar { font-size: 8.5pt; color: #475569; margin-top: 4pt; }
        .pdf-resume .layout-grid { display: grid; grid-template-columns: 2.8fr 1.2fr; gap: 14pt; }
        .pdf-resume .section-title { font-size: 10pt; font-weight: bold; text-transform: uppercase; border-bottom: 1px dashed #2563eb; margin: 12pt 0 5pt 0; padding-bottom: 1px; color: #1e3a8a; }
        .pdf-resume .side-section-title { font-size: 9.5pt; font-weight: bold; text-transform: uppercase; border-bottom: 1.5px solid #2563eb; margin-bottom: 5pt; margin-top: 10pt; color: #1e3a8a; }
        .pdf-resume .item { margin-bottom: 6pt; }
        .pdf-resume .item-header { font-weight: bold; display: flex; justify-content: space-between; color: #0f172a; }
        .pdf-resume .badge { display: inline-block; background-color: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; padding: 1px 5px; font-size: 8pt; margin: 1px; border-radius: 4px; }
        .pdf-resume p { margin: 2pt 0 0 0; color: #334155; }
      `;
    }

    let bodyContent = '';
    if (template === 'traditional-format') {
      bodyContent = `
        <div class="pdf-resume animate-fadeIn">
          <div class="resume-header-title">RESUME</div>
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
            <div style="flex: 1; min-width: 0; padding-right: 15px;">
              <div class="personal-name">${personal.name || 'Your Name'}</div>
              <div class="personal-title">${personal.title || 'Target Role'}</div>
              
              <div class="contact-split">
                <div class="contact-left">
                  ${personal.location ? `<strong>Address:</strong><br/>${personal.location.replace(/\n/g, '<br/>')}` : ''}
                </div>
                <div class="contact-right">
                  ${personal.phone ? `<strong>Mob No.:</strong> ${personal.phone}<br/>` : ''}
                  ${personal.email ? `<strong>Email Id:</strong> ${personal.email}` : ''}
                </div>
              </div>
            </div>
            ${profileImage ? `
              <div style="width: 1.05in; height: 1.3in; border: 1.5px solid #000; padding: 1.5px; text-align: center; background-color: #fff; flex-shrink: 0; margin-left: 15px; margin-top: 5px;">
                <img src="${profileImage}" style="width: 100%; height: 100%; object-fit: cover;" />
              </div>
            ` : ''}
          </div>
          <hr class="primary-hr" />

          ${objective ? `
            <div class="section-banner">Career Objective</div>
            <div class="section-text" style="white-space: pre-wrap;">${objective}</div>
          ` : ''}

          <div class="section-banner">Academic Qualification</div>
          <table class="academic-table">
            <thead>
              <tr>
                <th style="text-align: center; width: 8%;">S.No.</th>
                <th style="width: 32%;">Qualification</th>
                <th style="width: 35%;">University / Board</th>
                <th style="text-align: center; width: 12%;">Year</th>
                <th style="text-align: center; width: 13%;">Per %</th>
              </tr>
            </thead>
            <tbody>
              ${education.map((edu, idx) => `
                <tr>
                  <td style="text-align: center;">${idx + 1}</td>
                  <td>${edu.degree}</td>
                  <td>${edu.school}</td>
                  <td style="text-align: center;">${edu.year}</td>
                  <td style="text-align: center;">${edu.gpa}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          ${skills.technical || skills.soft ? `
            <div class="section-banner">Other Qualification</div>
            <ul class="bullet-list">
              ${skills.technical ? `<li>${skills.technical}</li>` : ''}
              ${skills.soft ? `<li><strong>Core Skills:</strong> ${skills.soft}</li>` : ''}
            </ul>
          ` : ''}

          ${experience && experience.length > 0 && experience.some(exp => exp.role.trim() || exp.company.trim()) ? `
            <div class="section-banner">Work Experience</div>
            <ul class="bullet-list">
              ${experience.filter(exp => exp.role.trim() || exp.company.trim()).map(exp => `
                <li><strong>${exp.role}</strong> at <strong>${exp.company}</strong> (${exp.duration})${exp.details ? `<br/><em>${exp.details}</em>` : ''}</li>
              `).join('')}
            </ul>
          ` : ''}

          ${projects && projects.length > 0 && projects.some(proj => proj.title.trim()) ? `
            <div class="section-banner">Key Projects &amp; Products</div>
            <ul class="bullet-list">
              ${projects.filter(proj => proj.title.trim()).map(proj => `
                <li><strong>${proj.title}</strong> ${proj.tech ? `[${proj.tech}]` : ''} ${proj.details ? `<br/><em>${proj.details}</em>` : ''}</li>
              `).join('')}
            </ul>
          ` : ''}

          ${certs && certs.length > 0 && certs.some(c => c.name.trim()) ? `
            <div class="section-banner">Certifications &amp; Achievements</div>
            <ul class="bullet-list">
              ${certs.filter(c => c.name.trim()).map(c => `
                <li><strong>${c.name}</strong>${c.issuer ? ` - Issued by <em>${c.issuer}</em>` : ''}${c.year ? ` (${c.year})` : ''}</li>
              `).join('')}
            </ul>
          ` : ''}

          <div class="section-banner">Personal Information</div>
          <table class="info-table">
            <tbody>
              <tr>
                <td class="info-label">Father's Name</td>
                <td class="info-colon">:</td>
                <td class="info-val">${personal.fatherName || 'Not Specified'}</td>
              </tr>
              <tr>
                <td class="info-label">Date of Birth</td>
                <td class="info-colon">:</td>
                <td class="info-val">${personal.dob || 'Not Specified'}</td>
              </tr>
              <tr>
                <td class="info-label">Language Known</td>
                <td class="info-colon">:</td>
                <td class="info-val">${personal.languages || 'Not Specified'}</td>
              </tr>
              <tr>
                <td class="info-label">Gender</td>
                <td class="info-colon">:</td>
                <td class="info-val">${personal.gender || 'Not Specified'}</td>
              </tr>
              <tr>
                <td class="info-label">Nationality</td>
                <td class="info-colon">:</td>
                <td class="info-val">${personal.nationality || 'Not Specified'}</td>
              </tr>
              <tr>
                <td class="info-label">Marital Status</td>
                <td class="info-colon">:</td>
                <td class="info-val">${personal.maritalStatus || 'Not Specified'}</td>
              </tr>
            </tbody>
          </table>

          ${personal.declaration ? `
            <div class="section-banner">Declaration</div>
            <div class="section-text" style="white-space: pre-wrap;">${personal.declaration}</div>
          ` : ''}

          <div class="footer-signature">
            <div>Date :</div>
            <div style="margin-right: 30px;">(${personal.name})</div>
          </div>
        </div>
      `;
    } else if (template !== 'developer') {
      bodyContent = `
        <div class="pdf-resume">
          <h1>${personal.name}</h1>
          <div class="subtitle">${personal.title}</div>
          <div class="contact-bar">
            <span>${personal.email}</span> &nbsp;|&nbsp; <span>${personal.phone}</span> &nbsp;|&nbsp; <span>${personal.location}</span>
            ${personal.linkedin ? ` &nbsp;|&nbsp; <span>LinkedIn: ${personal.linkedin}</span>` : ''}
            ${personal.github ? ` &nbsp;|&nbsp; <span>GitHub: ${personal.github}</span>` : ''}
            ${personal.twitter ? ` &nbsp;|&nbsp; <span>X: ${personal.twitter}</span>` : ''}
            ${personal.portfolio ? ` &nbsp;|&nbsp; <span>Web: ${personal.portfolio}</span>` : ''}
          </div>

          ${objective ? `
            <div class="section-title">Career Objective</div>
            <p style="white-space: pre-wrap;">${objective}</p>
          ` : ''}

          <div class="section-title">Core Professional Skills</div>
          <div class="item">
            <p><strong>Technical Skills:</strong> ${skills.technical}</p>
            <p><strong>Professional Competencies:</strong> ${skills.soft}</p>
          </div>

          <div class="section-title">Work Experience</div>
          ${experience.map(exp => `
            <div class="item">
              <div class="item-header">
                <span>${exp.role}</span>
                <span>${exp.duration}</span>
              </div>
              <div class="item-sub">
                <span>${exp.company}</span>
              </div>
              <p style="white-space: pre-wrap;">${exp.details}</p>
            </div>
          `).join('')}

          <div class="section-title">Academic History</div>
          ${education.map(edu => `
            <div class="item">
              <div class="item-header">
                <span>${edu.degree}</span>
                <span>${edu.year}</span>
              </div>
              <div class="item-sub">
                <span>${edu.school}</span>
                ${edu.gpa ? `<span>GPA: ${edu.gpa}</span>` : ''}
              </div>
            </div>
          `).join('')}

          <div class="section-title">Key Projects &amp; Products</div>
          ${projects.map(proj => `
            <div class="item">
              <div class="item-header">
                <span>${proj.title}</span>
                ${proj.tech ? `<span style="font-weight:normal; font-size:8.5pt;">(${proj.tech})</span>` : ''}
              </div>
              <p style="white-space: pre-wrap;">${proj.details}</p>
            </div>
          `).join('')}

          ${certs.length > 0 ? `
            <div class="section-title">Certifications &amp; Achievements</div>
            <div>
              ${certs.map(c => `
                <div style="margin-bottom:4pt; font-size:9.5pt;">
                  <strong>${c.name}</strong>${c.issuer ? ` - Issued by <em>${c.issuer}</em>` : ''}${c.year ? ` (${c.year})` : ''}
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      `;
    } else {
      bodyContent = `
        <div class="pdf-resume">
          <div class="header">
            <h1>${personal.name}</h1>
            <div style="font-weight:bold; color:#011627;">${personal.title}</div>
            <div class="contact-bar">
              <span>Email: ${personal.email}</span> | <span>Cell: ${personal.phone}</span> | <span>Loc: ${personal.location}</span><br/>
              ${[
                personal.linkedin ? `<span>LinkedIn: ${personal.linkedin}</span>` : '',
                personal.github ? `<span>GitHub: ${personal.github}</span>` : '',
                personal.twitter ? `<span>X: ${personal.twitter}</span>` : '',
                personal.portfolio ? `<span>Web: ${personal.portfolio}</span>` : ''
              ].filter(Boolean).join(' | ')}
            </div>
          </div>

          <div class="layout-grid">
            <div>
              ${objective ? `
                <div class="section-title">> Objective</div>
                <p style="white-space: pre-wrap;">${objective}</p>
              ` : ''}

              <div class="section-title">> Experience Timeline</div>
              ${experience.map(exp => `
                <div class="item">
                  <div class="item-header">
                    <span>${exp.role}</span>
                    <span style="font-weight:normal;">${exp.duration}</span>
                  </div>
                  <div style="font-style:italic; margin-bottom:2pt;">${exp.company}</div>
                  <p style="margin:2pt 0 0 0; white-space: pre-wrap;">${exp.details}</p>
                </div>
              `).join('')}

              <div class="section-title">> Featured Work</div>
              ${projects.map(proj => `
                <div class="item">
                  <div class="item-header">
                    <span>${proj.title}</span>
                    <span style="font-weight:normal; font-size:8pt;">[${proj.tech}]</span>
                  </div>
                  <p style="margin:2pt 0 0 0; white-space: pre-wrap;">${proj.details}</p>
                </div>
              `).join('')}
            </div>

            <div>
              <div class="side-section-title">CORE SKILLS</div>
              <div style="margin-bottom:8pt;">
                <strong>Stack:</strong><br/>
                ${skills.technical.trim() ? skills.technical.split(',').filter(s => s.trim()).map(s => `<span class="badge">${s.trim()}</span>`).join('') : ''}
              </div>
              <div style="margin-bottom:8pt;">
                <strong>Soft:</strong><br/>
                ${skills.soft.trim() ? skills.soft.split(',').filter(s => s.trim()).map(s => `<span class="badge">${s.trim()}</span>`).join('') : ''}
              </div>

              <div class="side-section-title">EDUCATION</div>
              ${education.map(edu => `
                <div style="margin-bottom:6pt; font-size:8pt;">
                  <strong>${edu.degree}</strong><br/>
                  ${edu.school}<br/>
                  Class of ${edu.year} (${edu.gpa})
                </div>
              `).join('')}

              <div class="side-section-title">CERTIFICATES</div>
              ${certs.map(c => `
                <div style="margin-bottom:4pt; font-size:8pt;">
                  <strong>${c.name}</strong><br/>
                  ${c.issuer} (${c.year})
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `;
    }

    // Create an offscreen wrapper to hide the element from viewer without shifting layout or causing scroll conflicts in sandboxed iframe runtime
    const wrapper = document.createElement('div');
    wrapper.id = 'pdf-render-wrapper';
    wrapper.style.position = 'absolute';
    wrapper.style.left = '-9999px';
    wrapper.style.top = `${window.scrollY}px`;
    wrapper.style.width = '816px';
    wrapper.style.height = 'auto';
    wrapper.style.overflow = 'hidden';
    wrapper.style.zIndex = '999999';

    // Create the clean content container at its standard layout coordinates within the wrapper
    const container = document.createElement('div');
    container.id = 'pdf-render-container';
    container.style.position = 'relative';
    container.style.width = '816px';
    container.style.background = '#ffffff';
    container.style.color = '#000000';
    container.style.margin = '0';
    container.style.padding = '0';

    const contentDiv = document.createElement('div');
    contentDiv.innerHTML = `
      <style>
        ${templateCss}
      </style>
      ${bodyContent}
    `;
    container.appendChild(contentDiv);
    wrapper.appendChild(container);
    document.body.appendChild(wrapper);

    const opt = {
      margin:       0,
      filename:     `${(personal.name || 'My').replace(/\s+/g, '_')}_Resume_ATS.pdf`,
      image:        { type: 'jpeg' as const, quality: 0.98 },
      html2canvas:  { 
        scale: 2.0, 
        useCORS: true, 
        logging: false, 
        letterRendering: true,
        scrollX: 0,
        scrollY: 0,
        windowWidth: 816,
        windowHeight: 1056
      },
      jsPDF:        { unit: 'in' as const, format: 'letter' as const, orientation: 'portrait' as const }
    };

    showNotification("Compiling secure PDF layout... please wait.", "info");

    const images = container.getElementsByTagName('img');
    const loadPromises = Array.from(images).map((img) => {
      return new Promise<void>((resolve) => {
        if (img.complete) {
          if (typeof img.decode === 'function') {
            img.decode().then(() => resolve()).catch(() => resolve());
          } else {
            resolve();
          }
        } else {
          img.onload = () => {
            if (typeof img.decode === 'function') {
              img.decode().then(() => resolve()).catch(() => resolve());
            } else {
              resolve();
            }
          };
          img.onerror = () => resolve();
        }
      });
    });

    Promise.all(loadPromises).then(() => {
      setTimeout(() => {
        html2pdf().from(container).set(opt).save().then(() => {
          try {
            document.body.removeChild(wrapper);
          } catch (e) {}
          setIsGenerating(false);
          showNotification("ATS Resume PDF downloaded successfully!", "success");
        }).catch((err: any) => {
          console.error("PDF generation error: ", err);
          try {
            document.body.removeChild(wrapper);
          } catch (e) {}
          setIsGenerating(false);
          showNotification("Failed to generate PDF automatically. Triggering print backup instead.", "error");
          triggerPrintPdf();
        });
      }, 800);
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative">
      {/* Floating Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 p-4 rounded-2xl shadow-xl flex items-center gap-3 border transition-all duration-300 ${
          toast.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-950/90 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
            : toast.type === 'error'
              ? 'bg-rose-50 dark:bg-rose-950/90 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
              : 'bg-indigo-50 dark:bg-slate-800/95 border-indigo-100 dark:border-slate-750 text-indigo-900 dark:text-slate-100'
        }`}>
          <div className="shrink-0">
            <LucideIcon 
              name={toast.type === 'success' ? 'CheckCircle2' : toast.type === 'error' ? 'AlertOctagon' : 'Info'} 
              size={18} 
            />
          </div>
          <p className="text-[11px] font-bold leading-relaxed max-w-sm">{toast.message}</p>
          <button 
            type="button" 
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ml-2 cursor-pointer"
          >
            <LucideIcon name="X" size={14} />
          </button>
        </div>
      )}

      {/* High-fidelity PDF Compilation Overlay */}
      {isGenerating && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-center z-[1000000] animate-fadeIn">
          <div className="p-8 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col items-center gap-4 text-center max-w-sm shadow-2xl">
            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent dark:border-cyan-400 dark:border-t-transparent rounded-full animate-spin"></div>
            <div>
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-widest font-mono">Compiling Quality PDF</h4>
              <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                Applying high-resolution vector styles and calibrating margins for automatic resume software. Please wait, your file will download automatically...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Configuration Column Form */}
      <div className="lg:col-span-7 space-y-6">
        
        {/* Step indicators */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex gap-2 overflow-x-auto py-1 pb-2 w-full">
            {[
              { id: 1, name: 'Personal' },
              { id: 2, name: 'Objective' },
              { id: 3, name: 'Education' },
              { id: 4, name: 'Skills' },
              { id: 5, name: 'Experience' },
              { id: 6, name: 'Projects' },
              { id: 7, name: 'Achievements' },
            ].map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStep(s.id)}
                className={`text-[11px] font-semibold py-1.5 px-3.5 rounded-full border transition-all cursor-pointer shrink-0 ${
                  step === s.id
                    ? 'border-indigo-600 bg-indigo-50/10 text-indigo-600 dark:border-cyan-500 dark:bg-cyan-950/40 dark:text-cyan-400 font-bold'
                    : 'border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800/40 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {s.id}. {s.name}
              </button>
            ))}
          </div>
        </div>

        {/* Step panels inputs */}
        <div className="p-5 border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/10 rounded-2xl min-h-[340px] flex flex-col justify-between">
          
          <div className="space-y-4">
            {step === 1 && (
              <div className="space-y-4 animate-fadeIn">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Personal Identity Details</h4>
                
                {/* Profile Photo Upload Section */}
                <div className="flex flex-col sm:flex-row items-center gap-4 bg-white/60 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800 p-4 rounded-2xl mb-2">
                  <div className="relative w-16 h-20 rounded-xl border-2 border-dashed border-indigo-300 dark:border-slate-700 bg-indigo-50/10 dark:bg-slate-950 overflow-hidden flex flex-col items-center justify-center shrink-0 shadow-inner group">
                    {profileImage ? (
                      <img src={profileImage} alt="Profile" className="w-full h-full object-cover animate-fadeIn" />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-indigo-500/80 dark:text-slate-500 p-1">
                        <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                          <circle cx="12" cy="11" r="4" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15a7 7 0 00-6.9 5.3A1.1 1.1 0 006.1 22h11.8a1.1 1.1 0 001-1.7A7 7 0 0012 15z" />
                        </svg>
                        <span className="text-[7.5px] font-bold mt-1 tracking-wider uppercase">Photo</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 w-full text-center sm:text-left space-y-1">
                    <span className="block text-xs font-semibold text-slate-700 dark:text-slate-200">Profile Photo / Passport Photo</span>
                    <span className="block text-[10px] text-slate-400 dark:text-slate-500 leading-normal">
                      Upload a headshot image (JPG/PNG). This photo will render neatly on your Traditional Format resume.
                    </span>
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 pt-1">
                      <label className="py-1 px-3 bg-indigo-50 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-slate-700 text-indigo-700 dark:text-indigo-400 text-[10px] font-bold rounded-lg cursor-pointer transition-all duration-150 shadow-sm border border-indigo-100/30">
                        <span>Choose Photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setProfileImage(reader.result as string);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                      {profileImage && (
                        <button
                          type="button"
                          onClick={() => setProfileImage(null)}
                          className="py-1 px-3 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 text-[10px] font-bold rounded-lg transition-all duration-150 cursor-pointer"
                        >
                          Remove Photo
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Full Name</label>
                    <input
                      type="text"
                      value={personal.name}
                      onChange={(e) => setPersonal({ ...personal, name: e.target.value })}
                      className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Target Role Title</label>
                    <input
                      type="text"
                      value={personal.title}
                      onChange={(e) => setPersonal({ ...personal, title: e.target.value })}
                      className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Email Address</label>
                    <input
                      type="email"
                      value={personal.email}
                      onChange={(e) => setPersonal({ ...personal, email: e.target.value })}
                      className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Contact Number</label>
                    <input
                      type="tel"
                      value={personal.phone}
                      onChange={(e) => setPersonal({ ...personal, phone: e.target.value })}
                      className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Location City</label>
                    <input
                      type="text"
                      value={personal.location}
                      onChange={(e) => setPersonal({ ...personal, location: e.target.value })}
                      className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">LinkedIn Profile Link</label>
                    <input
                      type="text"
                      value={personal.linkedin}
                      onChange={(e) => setPersonal({ ...personal, linkedin: e.target.value })}
                      className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl outline-none"
                      placeholder="linkedin.com/in/..."
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Portfolio/Website Link</label>
                    <input
                      type="text"
                      value={personal.portfolio}
                      onChange={(e) => setPersonal({ ...personal, portfolio: e.target.value })}
                      className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl outline-none"
                      placeholder="https://..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">GitHub Profile Link</label>
                    <input
                      type="text"
                      value={personal.github}
                      onChange={(e) => setPersonal({ ...personal, github: e.target.value })}
                      className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl outline-none"
                      placeholder="github.com/..."
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Twitter/X Profile Link</label>
                    <input
                      type="text"
                      value={personal.twitter}
                      onChange={(e) => setPersonal({ ...personal, twitter: e.target.value })}
                      className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl outline-none"
                      placeholder="x.com/..."
                    />
                  </div>
                </div>

                <div className="border-t border-slate-200/60 pt-4 mt-4 space-y-3">
                  <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Traditional Biodata &amp; Personal Info</h5>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">Father's Name</label>
                      <input
                        type="text"
                        value={personal.fatherName || ''}
                        onChange={(e) => setPersonal({ ...personal, fatherName: e.target.value })}
                        placeholder="e.g. Shri Lalchand Kumar"
                        className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">Date of Birth</label>
                      <input
                        type="text"
                        value={personal.dob || ''}
                        onChange={(e) => setPersonal({ ...personal, dob: e.target.value })}
                        placeholder="e.g. 15th August 1998"
                        className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">Languages Known</label>
                      <input
                        type="text"
                        value={personal.languages || ''}
                        onChange={(e) => setPersonal({ ...personal, languages: e.target.value })}
                        placeholder="e.g. Hindi, English"
                        className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">Gender</label>
                      <input
                        type="text"
                        value={personal.gender || ''}
                        onChange={(e) => setPersonal({ ...personal, gender: e.target.value })}
                        placeholder="e.g. Male / Female"
                        className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">Nationality</label>
                      <input
                        type="text"
                        value={personal.nationality || ''}
                        onChange={(e) => setPersonal({ ...personal, nationality: e.target.value })}
                        placeholder="e.g. Indian"
                        className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">Marital Status</label>
                      <input
                        type="text"
                        value={personal.maritalStatus || ''}
                        onChange={(e) => setPersonal({ ...personal, maritalStatus: e.target.value })}
                        placeholder="e.g. Unmarried / Married"
                        className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Declaration Statement</label>
                    <textarea
                      value={personal.declaration || ''}
                      onChange={(e) => setPersonal({ ...personal, declaration: e.target.value })}
                      rows={2}
                      placeholder="Declaration of credibility..."
                      className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl outline-none resize-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex justify-between items-center mb-1">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Career Objective Statement</h4>
                  <button
                    type="button"
                    onClick={() => setAiActiveTab('obj')}
                    className="flex items-center gap-1.5 py-1 px-2.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-[10px] font-bold cursor-pointer"
                  >
                    <LucideIcon name="Sparkles" size={12} />
                    <span>AI Objective Generator</span>
                  </button>
                </div>
                <textarea
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  rows={6}
                  placeholder="Draft your professional summary details or use our intelligent co-pilot above..."
                  className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl outline-none resize-none"
                />
              </div>
            )}

            {step === 3 && (
              <div className="space-y-3 animate-fadeIn">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Academic Credentials</h4>
                  <button
                    type="button"
                    onClick={handleAddEdu}
                    className="py-1.5 px-3 bg-indigo-600 dark:bg-cyan-500 hover:bg-indigo-700 dark:hover:bg-cyan-600 text-white dark:text-slate-950 text-[10px] font-bold rounded-lg flex items-center gap-1 cursor-pointer shadow-sm uppercase tracking-wider transition-all duration-200"
                  >
                    <LucideIcon name="Plus" size={12} />
                    <span>Add School</span>
                  </button>
                </div>

                {education.map((edu, index) => (
                  <div key={index} className="p-3 border border-slate-100 bg-white rounded-xl space-y-3 relative group">
                    <button
                      type="button"
                      onClick={() => handleDelEdu(index)}
                      className="absolute top-2 right-2 text-red-550 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <LucideIcon name="Trash2" size={13} />
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={edu.degree}
                        placeholder="Degree/Certificate"
                        onChange={(e) => {
                          const updated = [...education];
                          updated[index].degree = e.target.value;
                          setEducation(updated);
                        }}
                        className="text-xs px-3 py-1.5 border border-slate-150 rounded-lg"
                      />
                      <input
                        type="text"
                        value={edu.school}
                        placeholder="School/University"
                        onChange={(e) => {
                          const updated = [...education];
                          updated[index].school = e.target.value;
                          setEducation(updated);
                        }}
                        className="text-xs px-3 py-1.5 border border-slate-150 rounded-lg"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={edu.year}
                        placeholder="Graduation Year"
                        onChange={(e) => {
                          const updated = [...education];
                          updated[index].year = e.target.value;
                          setEducation(updated);
                        }}
                        className="text-xs px-3 py-1.5 border border-slate-150 rounded-lg"
                      />
                      <input
                        type="text"
                        value={edu.gpa}
                        placeholder="Grade/GPA"
                        onChange={(e) => {
                          const updated = [...education];
                          updated[index].gpa = e.target.value;
                          setEducation(updated);
                        }}
                        className="text-xs px-3 py-1.5 border border-slate-150 rounded-lg"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex justify-between items-center mb-1">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Skill Competencies</h4>
                  <button
                    type="button"
                    onClick={() => setAiActiveTab('skills')}
                    className="flex items-center gap-1 py-1 px-2.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-[10px] font-bold cursor-pointer"
                  >
                    <LucideIcon name="Sparkles" size={12} />
                    <span>AI Smart Suggester</span>
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Technical Skills (comma separated)</label>
                    <textarea
                      value={skills.technical}
                      onChange={(e) => setSkills({ ...skills, technical: e.target.value })}
                      rows={3}
                      className="w-full text-xs px-3.5 py-2 bg-white border border-slate-200 rounded-xl outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Soft Skills &amp; Core Strengths</label>
                    <textarea
                      value={skills.soft}
                      onChange={(e) => setSkills({ ...skills, soft: e.target.value })}
                      rows={2}
                      className="w-full text-xs px-3.5 py-2 bg-white border border-slate-200 rounded-xl outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-3 animate-fadeIn">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Professional History</h4>
                  <button
                    type="button"
                    onClick={handleAddExp}
                    className="py-1.5 px-3 bg-indigo-600 dark:bg-cyan-500 hover:bg-indigo-700 dark:hover:bg-cyan-600 text-white dark:text-slate-950 text-[10px] font-bold rounded-lg flex items-center gap-1 cursor-pointer shadow-sm uppercase tracking-wider transition-all duration-200"
                  >
                    <LucideIcon name="Plus" size={12} />
                    <span>Add Role</span>
                  </button>
                </div>

                {experience.map((exp, index) => (
                  <div key={index} className="p-3 border border-slate-100 bg-white rounded-xl space-y-2 relative group">
                    <button
                      type="button"
                      onClick={() => handleDelExp(index)}
                      className="absolute top-2 right-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <LucideIcon name="Trash2" size={13} />
                    </button>
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={exp.role}
                        placeholder="Job Role / Title"
                        onChange={(e) => {
                          const updated = [...experience];
                          updated[index].role = e.target.value;
                          setExperience(updated);
                        }}
                        className="text-xs px-3 py-1.5 border border-slate-150 rounded-lg col-span-1"
                      />
                      <input
                        type="text"
                        value={exp.company}
                        placeholder="Company / Employer"
                        onChange={(e) => {
                          const updated = [...experience];
                          updated[index].company = e.target.value;
                          setExperience(updated);
                        }}
                        className="text-xs px-3 py-1.5 border border-slate-150 rounded-lg"
                      />
                      <input
                        type="text"
                        value={exp.duration}
                        placeholder="Duration (eg: 2023 - Present)"
                        onChange={(e) => {
                          const updated = [...experience];
                          updated[index].duration = e.target.value;
                          setExperience(updated);
                        }}
                        className="text-xs px-3 py-1.5 border border-slate-150 rounded-lg"
                      />
                    </div>
                    <textarea
                      value={exp.details}
                      rows={2}
                      placeholder="Describe core initiatives, technical models deployed or achievements."
                      onChange={(e) => {
                        const updated = [...experience];
                        updated[index].details = e.target.value;
                        setExperience(updated);
                      }}
                      className="w-full text-xs px-3 py-1.5 border border-slate-150 rounded-lg resize-none"
                    />
                  </div>
                ))}
              </div>
            )}

            {step === 6 && (
              <div className="space-y-3 animate-fadeIn">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Product Projects</h4>
                  <button
                    type="button"
                    onClick={handleAddProj}
                    className="py-1.5 px-3 bg-indigo-600 dark:bg-cyan-500 hover:bg-indigo-700 dark:hover:bg-cyan-600 text-white dark:text-slate-950 text-[10px] font-bold rounded-lg flex items-center gap-1 cursor-pointer shadow-sm uppercase tracking-wider transition-all duration-200"
                  >
                    <LucideIcon name="Plus" size={12} />
                    <span>Add Project</span>
                  </button>
                </div>

                {projects.map((proj, index) => (
                  <div key={index} className="p-3 border border-slate-100 bg-white rounded-xl space-y-2 relative group">
                    <button
                      type="button"
                      onClick={() => handleDelProj(index)}
                      className="absolute top-2 right-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <LucideIcon name="Trash2" size={13} />
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={proj.title}
                        placeholder="Project Name"
                        onChange={(e) => {
                          const updated = [...projects];
                          updated[index].title = e.target.value;
                          setProjects(updated);
                        }}
                        className="text-xs px-3 py-1.5 border border-slate-150 rounded-lg"
                      />
                      <div className="flex gap-1.5 items-center">
                        <input
                          type="text"
                          value={proj.tech}
                          placeholder="Technologies Used"
                          onChange={(e) => {
                            const updated = [...projects];
                            updated[index].tech = e.target.value;
                            setProjects(updated);
                          }}
                          className="flex-1 text-xs px-3 py-1.5 border border-slate-150 rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setAiSelectedProjIdx(index);
                            setAiActiveTab('project');
                          }}
                          className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg cursor-pointer"
                          title="AI Improve description bullet"
                        >
                          <LucideIcon name="Sparkles" size={12} />
                        </button>
                      </div>
                    </div>
                    <textarea
                      value={proj.details}
                      rows={2}
                      placeholder="Explain features and milestones (use AI button on the right to optimize)"
                      onChange={(e) => {
                        const updated = [...projects];
                        updated[index].details = e.target.value;
                        setProjects(updated);
                      }}
                      className="w-full text-xs px-3 py-1.5 border border-slate-150 rounded-lg resize-none"
                    />
                  </div>
                ))}
              </div>
            )}

            {step === 7 && (
              <div className="space-y-3 animate-fadeIn">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Achievements &amp; Certificates</h4>
                  <button
                    type="button"
                    onClick={handleAddCert}
                    className="py-1.5 px-3 bg-indigo-600 dark:bg-cyan-500 hover:bg-indigo-700 dark:hover:bg-cyan-600 text-white dark:text-slate-950 text-[10px] font-bold rounded-lg flex items-center gap-1 cursor-pointer shadow-sm uppercase tracking-wider transition-all duration-200"
                  >
                    <LucideIcon name="Plus" size={12} />
                    <span>Add Item</span>
                  </button>
                </div>

                {certs.map((c, index) => (
                  <div key={index} className="p-3 border border-slate-200 bg-white rounded-xl grid grid-cols-3 gap-2 relative group animate-fadeIn">
                    <button
                      type="button"
                      onClick={() => handleDelCert(index)}
                      className="absolute top-1.5 right-1 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <LucideIcon name="Trash2" size={12} />
                    </button>
                    <input
                      type="text"
                      value={c.name}
                      placeholder="Certificate / Title"
                      onChange={(e) => {
                        const updated = [...certs];
                        updated[index].name = e.target.value;
                        setCerts(updated);
                      }}
                      className="text-xs px-3 py-1.5 border border-slate-150 rounded-lg col-span-1"
                    />
                    <input
                      type="text"
                      value={c.issuer}
                      placeholder="Issuer Group"
                      onChange={(e) => {
                        const updated = [...certs];
                        updated[index].issuer = e.target.value;
                        setCerts(updated);
                      }}
                      className="text-xs px-3 py-1.5 border border-slate-150 rounded-lg"
                    />
                    <input
                      type="text"
                      value={c.year}
                      placeholder="Year"
                      onChange={(e) => {
                        const updated = [...certs];
                        updated[index].year = e.target.value;
                        setCerts(updated);
                      }}
                      className="text-xs px-3 py-1.5 border border-slate-150 rounded-lg"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form navigation buttons */}
          <div className="flex justify-between border-t border-slate-100 dark:border-slate-800 pt-4 mt-4">
            <button
              type="button"
              disabled={step === 1}
              onClick={() => setStep(step - 1)}
              className="py-1.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-500 flex items-center gap-1 cursor-pointer disabled:opacity-40"
            >
              <LucideIcon name="ArrowRight" size={13} className="rotate-180" />
              <span>Back Step</span>
            </button>

            {step < 7 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                className="py-1.5 px-5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer"
              >
                <span>Continue</span>
                <LucideIcon name="ArrowRight" size={13} />
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={downloadPdfResume}
                  className="py-1.5 px-4 bg-indigo-600 hover:bg-indigo-700 dark:bg-cyan-500 dark:hover:bg-cyan-600 text-white dark:text-slate-950 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                  title="Download offline-print-ready professional PDF"
                >
                  <LucideIcon name="Download" size={13} />
                  <span>Download PDF</span>
                </button>
                <button
                  type="button"
                  onClick={triggerPrintPdf}
                  className="py-1.5 px-3 border border-slate-300 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer transition-all"
                >
                  <LucideIcon name="Printer" size={13} />
                  <span>Print Resume</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Templates display right side */}
      <div className="lg:col-span-5 space-y-6">
        <h3 className="text-xs font-bold text-slate-450 dark:text-slate-500 uppercase tracking-widest text-center">
          Visual Layout Design
        </h3>

        {/* Template choices tabs */}
        <div className="grid grid-cols-2 gap-2 text-center text-xs">
          {[
            { id: 'traditional-format', label: 'Traditional Format', desc: 'Classic blue header & table' },
            { id: 'ats-professional', label: 'ATS Professional', desc: 'Serif clean grid matrix' },
            { id: 'modern-indigo', label: 'Modern Indigo', desc: 'Aesthetic left-aligned flow' },
            { id: 'fresher-clean', label: 'Fresher Clean', desc: 'Minimal focus alignment' },
            { id: 'developer', label: 'Developer Slate', desc: 'Compact dual columns list' },
          ].map((item) => {
            const isSelected = template === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTemplate(item.id as TemplateType)}
                className={`p-3 border rounded-xl text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/10 text-indigo-600 font-bold dark:border-cyan-500 dark:bg-cyan-950/30 dark:text-cyan-300'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-300'
                }`}
              >
                <span className={`block font-bold text-[11px] ${isSelected ? 'text-indigo-600 dark:text-cyan-400' : 'text-slate-800 dark:text-slate-200'}`}>
                  {item.label}
                </span>
                <span className="text-[9px] text-slate-400 dark:text-slate-500 block mt-0.5">{item.desc}</span>
              </button>
            );
          })}
        </div>

        {/* PDF compilation Trigger options */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={downloadPdfResume}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-cyan-500 dark:hover:bg-cyan-600 font-bold text-xs uppercase tracking-widest dark:text-slate-950 rounded-xl shadow-lg transition-transform hover:scale-102 flex items-center justify-center gap-2 cursor-pointer"
          >
            <LucideIcon name="Download" size={14} />
            <span>Download ATS Resume PDF</span>
          </button>
          
          <button
            type="button"
            onClick={triggerPrintPdf}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-200 font-bold text-[11px] uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <LucideIcon name="Printer" size={13} />
            <span>Direct Browser Print</span>
          </button>
        </div>

        <div className="p-4 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 border-dashed rounded-2xl text-center space-y-1.5 transition-colors">
          <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-cyan-400 font-mono block">Direct Sandbox Ready</span>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
            💡 <strong>Pro Tip:</strong> Direct browser printing can sometimes be restricted inside inline preview frames. Save your work seamlessly by clicking <strong>Download ATS Resume</strong>! Close print dialog to customize the resume template.
          </p>
        </div>
      </div>

      {/* AI Dialog Modal Overlay */}
      {aiActiveTab && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl w-full max-w-lg shadow-2xl relative">
            <button
              type="button"
              onClick={() => setAiActiveTab(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-650 cursor-pointer"
            >
              <LucideIcon name="X" size={16} />
            </button>

            {aiActiveTab === 'obj' && (
              <div className="space-y-4">
                <span className="text-[10px] uppercase tracking-widest font-bold text-indigo-600 flex items-center gap-1">
                  <LucideIcon name="Sparkles" size={10} />
                  <span>AI Career Objective Generator</span>
                </span>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Target Role</label>
                    <select
                      value={aiRole}
                      onChange={(e) => setAiRole(e.target.value)}
                      className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                    >
                      <option value="Full Stack Software Engineer">Full Stack Dev</option>
                      <option value="Data Analyst">Data Analyst</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Experience</label>
                    <select
                      value={aiExp}
                      onChange={(e) => setAiExp(e.target.value)}
                      className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                    >
                      <option value="Fresher">Entry Level / Fresher</option>
                      <option value="Mid Level">Mid / Senior Level</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <span className="text-[10px] uppercase font-bold text-slate-450 block">Select high-impact suggested objectives:</span>
                  <div className="space-y-2.5">
                    {(aiObjectives[aiRole]?.[aiExp] || []).map((text, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleApplyObjective(text)}
                        className="w-full text-left p-3 border border-slate-105 hover:border-indigo-400 hover:bg-slate-50/30 rounded-xl text-xs text-slate-700 leading-relaxed transition-all cursor-pointer block"
                      >
                        {text}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {aiActiveTab === 'skills' && (
              <div className="space-y-4">
                <span className="text-[10px] uppercase tracking-widest font-bold text-indigo-600 flex items-center gap-1">
                  <LucideIcon name="Sparkles" size={10} />
                  <span>AI professional Skills Suggester</span>
                </span>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Select Target Role Path</label>
                  <select
                    value={aiRole}
                    onChange={(e) => setAiRole(e.target.value)}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                  >
                    <option value="Full Stack Software Engineer">Frontend / Full-stack Developer</option>
                    <option value="Data Analyst">Database &amp; Data Analyst</option>
                  </select>
                </div>

                <p className="text-xs text-slate-550 leading-relaxed pt-2">
                  Applying this action will populate your profile skills matrix with modern, high-relevance professional keywords matching common automated parser queries.
                </p>

                <div className="flex gap-2.5 pt-3">
                  <button
                    type="button"
                    onClick={suggestSkills}
                    className="flex-1 py-2.5 bg-indigo-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer"
                  >
                    Suggest and Apply skills
                  </button>
                  <button
                    type="button"
                    onClick={() => setAiActiveTab(null)}
                    className="py-2.5 px-4 border text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {aiActiveTab === 'project' && (
              <div className="space-y-4">
                <span className="text-[10px] uppercase tracking-widest font-bold text-indigo-600 flex items-center gap-1">
                  <LucideIcon name="Sparkles" size={10} />
                  <span>AI project Description Improver (STAR model)</span>
                </span>

                <p className="text-xs text-slate-550 leading-relaxed">
                  We will optimize the description for project <span className="font-bold">"{projects[aiSelectedProjIdx]?.title || 'Selected item'}"</span>, converting phrases into strong metric-driven outcomes that standout in ATS processors.
                </p>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={improveProject}
                    className="flex-1 py-2.5 bg-indigo-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer"
                  >
                    Improve and Apply using STAR Model
                  </button>
                  <button
                    type="button"
                    onClick={() => setAiActiveTab(null)}
                    className="py-2.5 px-4 border text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* About SEO panels */}
      <div className="lg:col-span-12 border-t border-slate-100 dark:border-slate-800 pt-8 mt-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">About AI ATS Resume Builder</h2>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-4xl mb-6">
          The ToolMitra AI ATS Resume Builder compiles professional resumes engineered for automatic scanner software (ATS). Our system lets you build multiple sections, apply high-density custom templates, and generate customized high-impact career objective highlights entirely client-side safe.
        </p>

        <h3 className="font-bold text-sm text-slate-800 dark:text-slate-300 mb-4">Frequently Asked Questions (FAQ)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/50 dark:bg-slate-900/10">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-1.5">What is an ATS-friendly resume?</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              These are documents featuring legible standard layout divisions without tables, graphics or charts that would confuse indexing robots. Clear fonts and metadata structure ensure your profile ranks high.
            </p>
          </div>
          <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/50 dark:bg-slate-900/10">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-1.5">Is my personal record saved or accessed online?</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Never! Unlike platforms with massive databases, ToolMitra has no external cloud storage. Everything you type is stored locally and compiled dynamically in the browser sandbox.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
