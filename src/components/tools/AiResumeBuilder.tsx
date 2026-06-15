import React, { useState } from 'react';
import LucideIcon from '../LucideIcon';

type TemplateType = 'ats-professional' | 'modern-indigo' | 'fresher-clean' | 'developer';

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
  const [template, setTemplate] = useState<TemplateType>('ats-professional');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 7000);
  };

  // Form states
  const [personal, setPersonal] = useState({
    name: 'Suraj Kumar Yadav',
    title: 'Full Stack Software Engineer',
    email: 'suraj@example.com',
    phone: '+91 98765 43210',
    location: 'Delhi, India',
    linkedin: 'linkedin.com/in/surajkumar',
    portfolio: 'https://surajkyadav01.github.io/Suraj-Tech-Hub/',
  });

  const [objective, setObjective] = useState(
    'Highly focused Full Stack Software Engineer eager to leverage extensive experience in React, Nodejs, and scalable cloud architectures to build robust digital solutions, accelerate product delivery timelines, and optimize core frontend performance.'
  );

  const [education, setEducation] = useState<EduEntry[]>([
    { degree: 'Bachelor of Technology in Computer Science', school: 'Delhi Technical University', year: '2023', gpa: '8.8 CGPA' }
  ]);

  const [skills, setSkills] = useState({
    technical: 'JavaScript, TypeScript, React.js, Node.js, Express, PostgreSQL, Tailwind CSS, Docker, REST APIs, Git',
    soft: 'Problem Solving, Team Collaboration, Agile Methodologies, Technical Writing'
  });

  const [experience, setExperience] = useState<ExpEntry[]>([
    {
      role: 'Associate Software Developer',
      company: 'TechSol Solutions Pvt. Ltd.',
      duration: 'June 2023 - Present',
      details: 'Built and styled reusable React components and dashboard interfaces using Tailwind CSS. Collaborated with core backend engineering groups to integrate REST API structures and optimized database transaction queries.'
    }
  ]);

  const [projects, setProjects] = useState<ProjEntry[]>([
    {
      title: 'E-Commerce Analytics Platform',
      tech: 'React, Node.js, PostgreSQL, Recharts',
      details: 'Designed interactive product charts and reports using Recharts. Implemented secure client cookie sessions and accelerated dashboard render speeds by 40% using lazy-loading.'
    }
  ]);

  const [certs, setCerts] = useState<CertEntry[]>([
    { name: 'AWS Certified Cloud Practitioner', issuer: 'Amazon Web Services', year: '2024' }
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
  const handleDelEdu = (idx: number) => setEducation(education.filter((_, i) => i !== idx));

  const handleAddExp = () => setExperience([...experience, { role: '', company: '', duration: '', details: '' }]);
  const handleDelExp = (idx: number) => setExperience(experience.filter((_, i) => i !== idx));

  const handleAddProj = () => setProjects([...projects, { title: '', tech: '', details: '' }]);
  const handleDelProj = (idx: number) => setProjects(projects.filter((_, i) => i !== idx));

  const handleAddCert = () => setCerts([...certs, { name: '', issuer: '', year: '' }]);
  const handleDelCert = (idx: number) => setCerts(certs.filter((_, i) => i !== idx));

  // High quality vector HTML Print compilation
  const triggerPrintPdf = () => {
    const resumeFrame = document.createElement('iframe');
    resumeFrame.style.display = 'none';
    document.body.appendChild(resumeFrame);

    const frameDoc = resumeFrame.contentDocument || resumeFrame.contentWindow?.document;
    if (!frameDoc) return;

    // Define visual templates styling maps
    let templateCss = '';
    if (template === 'ats-professional') {
      templateCss = `
        body { font-family: 'Georgia', serif; padding: 0.5in; color: #111; line-height: 1.4; font-size: 10pt; }
        h1 { font-size: 20pt; text-align: center; margin: 0 0 4pt 0; text-transform: uppercase; font-weight: normal; letter-spacing: 1px; }
        .subtitle { text-align: center; font-style: italic; color: #555; margin-bottom: 12pt; border-bottom: 1px solid #111; padding-bottom: 6pt; }
        .section-title { font-size: 11pt; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #000; margin: 14pt 0 6pt 0; padding-bottom: 1px; letter-spacing: 0.5px; }
        .item { margin-bottom: 10pt; }
        .item-header { display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 1pt; }
        .item-sub { display: flex; justify-content: space-between; font-style: italic; color: #444; margin-bottom: 2pt; }
        ul { margin: 2pt 0 0 14pt; padding: 0; }
        li { margin-bottom: 2pt; }
      `;
    } else if (template === 'modern-indigo') {
      templateCss = `
        body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 0.5in; color: #334155; line-height: 1.45; font-size: 9.5pt; }
        h1 { font-size: 22pt; color: #4f46e5; margin: 0 0 2pt 0; font-weight: 800; tracking: -0.5px; }
        .title-desc { font-size: 11pt; color: #64748b; font-weight: 600; margin-bottom: 8pt; }
        .contact-bar { display: flex; flex-wrap: wrap; gap: 8pt; font-size: 8.5pt; color: #64748b; margin-bottom: 16pt; border-bottom: 2px solid #e2e8f0; padding-bottom: 10pt; }
        .section-title { font-size: 12pt; font-weight: 700; color: #4f46e5; margin: 16pt 0 8pt 0; text-transform: uppercase; letter-spacing: 1px; }
        .item { margin-bottom: 8pt; }
        .item-header { display: flex; justify-content: space-between; font-weight: 700; color: #1e293b; }
        .item-sub { display: flex; justify-content: space-between; color: #64748b; font-size: 9pt; margin-bottom: 2pt; }
      `;
    } else if (template === 'fresher-clean') {
      templateCss = `
        body { font-family: 'Calibri', sans-serif; padding: 0.5in; color: #2d3748; line-height: 1.4; font-size: 10pt; }
        h1 { font-size: 24pt; color: #2b6cb0; margin: 0 0 4pt 0; text-align: left; font-weight: bold; }
        .contact-bar { font-size: 9pt; color: #718096; margin-bottom: 14pt; border-bottom: 1px dashed #cbd5e0; padding-bottom: 6pt; }
        .section-title { font-size: 12pt; font-weight: bold; color: #2b6cb0; margin: 16pt 0 6pt 0; border-left: 4px solid #2b6cb0; padding-left: 6px; }
        .item { margin-bottom: 8pt; }
        .item-header { display: flex; justify-content: space-between; font-weight: bold; }
        .item-sub { display: flex; justify-content: space-between; color: #4a5568; margin-bottom: 2pt; }
      `;
    } else {
      // Developer Two-column Layout code representation
      templateCss = `
        body { font-family: 'Consolas', monospace; padding: 0.4in; color: #011627; line-height: 1.4; font-size: 9pt; }
        .header { border-bottom: 3px double #011527; padding-bottom: 10pt; margin-bottom: 14pt; }
        h1 { font-size: 20pt; margin: 0; color: #011627; }
        .contact-bar { font-size: 8.5pt; color: #475569; margin-top: 4pt; }
        .layout-grid { display: grid; grid-template-columns: 3fr 1fr; gap: 16pt; }
        .section-title { font-size: 10.5pt; font-weight: bold; text-transform: uppercase; border-bottom: 1px dashed #011627; margin: 14pt 0 6pt 0; padding-bottom: 2px; }
        .side-section-title { font-size: 9.5pt; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #111; margin-bottom: 6pt; margin-top: 10pt; }
        .item { margin-bottom: 8pt; }
        .item-header { font-weight: bold; display: flex; justify-content: space-between; }
        .badge { display: inline-block; background-color: #f1f5f9; border: 1px solid #cbd5e1; padding: 1px 4px; font-size: 8pt; margin: 1px; }
      `;
    }

    // Build the structural HTML for printing document layouts
    let bodyContent = '';
    if (template !== 'developer') {
      bodyContent = `
        <h1>${personal.name}</h1>
        <div class="subtitle">${personal.title}</div>
        <div class="contact-bar">
          <span>${personal.email}</span> | <span>${personal.phone}</span> | <span>${personal.location}</span>
          ${personal.linkedin ? ` | <span>${personal.linkedin}</span>` : ''}
          ${personal.portfolio ? ` | <span>${personal.portfolio}</span>` : ''}
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
            ${personal.linkedin ? `<span>LinkedIn: ${personal.linkedin}</span>` : ''}
            ${personal.portfolio ? ` | <span>Web: ${personal.portfolio}</span>` : ''}
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
              ${skills.technical.split(',').map(s => `<span class="badge">${s.trim()}</span>`).join('')}
            </div>
            <div style="margin-bottom:8pt;">
              <strong>Soft:</strong><br/>
              ${skills.soft.split(',').map(s => `<span class="badge">${s.trim()}</span>`).join('')}
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

  const downloadHtmlResume = () => {
    let templateCss = '';
    if (template === 'ats-professional') {
      templateCss = `
        body { font-family: 'Georgia', serif; padding: 0.5in; color: #111; line-height: 1.4; font-size: 10pt; }
        h1 { font-size: 20pt; text-align: center; margin: 0 0 4pt 0; text-transform: uppercase; font-weight: normal; letter-spacing: 1px; }
        .subtitle { text-align: center; font-style: italic; color: #555; margin-bottom: 12pt; border-bottom: 1px solid #111; padding-bottom: 6pt; }
        .section-title { font-size: 11pt; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #000; margin: 14pt 0 6pt 0; padding-bottom: 1px; letter-spacing: 0.5px; }
        .item { margin-bottom: 10pt; }
        .item-header { display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 1pt; }
        .item-sub { display: flex; justify-content: space-between; font-style: italic; color: #444; margin-bottom: 2pt; }
        ul { margin: 2pt 0 0 14pt; padding: 0; }
        li { margin-bottom: 2pt; }
      `;
    } else if (template === 'modern-indigo') {
      templateCss = `
        body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 0.5in; color: #334155; line-height: 1.45; font-size: 9.5pt; }
        h1 { font-size: 22pt; color: #4f46e5; margin: 0 0 2pt 0; font-weight: 800; tracking: -0.5px; }
        .title-desc { font-size: 11pt; color: #64748b; font-weight: 600; margin-bottom: 8pt; }
        .contact-bar { display: flex; flex-wrap: wrap; gap: 8pt; font-size: 8.5pt; color: #64748b; margin-bottom: 16pt; border-bottom: 2px solid #e2e8f0; padding-bottom: 10pt; }
        .section-title { font-size: 12pt; font-weight: 700; color: #4f46e5; margin: 16pt 0 8pt 0; text-transform: uppercase; letter-spacing: 1px; }
        .item { margin-bottom: 8pt; }
        .item-header { display: flex; justify-content: space-between; font-weight: 700; color: #1e293b; }
        .item-sub { display: flex; justify-content: space-between; color: #64748b; font-size: 9pt; margin-bottom: 2pt; }
      `;
    } else if (template === 'fresher-clean') {
      templateCss = `
        body { font-family: 'Calibri', sans-serif; padding: 0.5in; color: #2d3748; line-height: 1.4; font-size: 10pt; }
        h1 { font-size: 24pt; color: #2b6cb0; margin: 0 0 4pt 0; text-align: left; font-weight: bold; }
        .contact-bar { font-size: 9pt; color: #718096; margin-bottom: 14pt; border-bottom: 1px dashed #cbd5e0; padding-bottom: 6pt; }
        .section-title { font-size: 12pt; font-weight: bold; color: #2b6cb0; margin: 16pt 0 6pt 0; border-left: 4px solid #2b6cb0; padding-left: 6px; }
        .item { margin-bottom: 8pt; }
        .item-header { display: flex; justify-content: space-between; font-weight: bold; }
        .item-sub { display: flex; justify-content: space-between; color: #4a5568; margin-bottom: 2pt; }
      `;
    } else {
      templateCss = `
        body { font-family: 'Consolas', monospace; padding: 0.4in; color: #011627; line-height: 1.4; font-size: 9pt; }
        .header { border-bottom: 3px double #011527; padding-bottom: 10pt; margin-bottom: 14pt; }
        h1 { font-size: 20pt; margin: 0; color: #011627; }
        .contact-bar { font-size: 8.5pt; color: #475569; margin-top: 4pt; }
        .layout-grid { display: grid; grid-template-columns: 3fr 1fr; gap: 16pt; }
        .section-title { font-size: 10.5pt; font-weight: bold; text-transform: uppercase; border-bottom: 1px dashed #011627; margin: 14pt 0 6pt 0; padding-bottom: 2px; }
        .side-section-title { font-size: 9.5pt; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #111; margin-bottom: 6pt; margin-top: 10pt; }
        .item { margin-bottom: 8pt; }
        .item-header { font-weight: bold; display: flex; justify-content: space-between; }
        .badge { display: inline-block; background-color: #f1f5f9; border: 1px solid #cbd5e1; padding: 1px 4px; font-size: 8pt; margin: 1px; }
      `;
    }

    let bodyContent = '';
    if (template !== 'developer') {
      bodyContent = `
        <h1>${personal.name}</h1>
        <div class="subtitle">${personal.title}</div>
        <div class="contact-bar">
          <span>${personal.email}</span> | <span>${personal.phone}</span> | <span>${personal.location}</span>
          ${personal.linkedin ? ` | <span>${personal.linkedin}</span>` : ''}
          ${personal.portfolio ? ` | <span>${personal.portfolio}</span>` : ''}
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
      bodyContent = `
        <div class="header">
          <h1>${personal.name}</h1>
          <div style="font-weight:bold; color:#011627;">${personal.title}</div>
          <div class="contact-bar">
            <span>Email: ${personal.email}</span> | <span>Cell: ${personal.phone}</span> | <span>Loc: ${personal.location}</span><br/>
            ${personal.linkedin ? `<span>LinkedIn: ${personal.linkedin}</span>` : ''}
            ${personal.portfolio ? ` | <span>Web: ${personal.portfolio}</span>` : ''}
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
              ${skills.technical.split(',').map(s => `<span class="badge">${s.trim()}</span>`).join('')}
            </div>
            <div style="margin-bottom:8pt;">
              <strong>Soft:</strong><br/>
              ${skills.soft.split(',').map(s => `<span class="badge">${s.trim()}</span>`).join('')}
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

    const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${personal.name || 'Resume'}_CV_ToolMitra</title>
  <style>
    /* Reset and default margins for printing */
    @page { size: letter; margin: 0; }
    html, body { margin: 0; padding: 0; background: #fff; }
    ${templateCss}
    /* Simple extra print layout alignment defaults */
    body { padding: 0.5in !important; background-color: #ffffff !important; color: #000000 !important; }
    
    @media print {
      body { padding: 0.5in !important; }
      .no-print-guide { display: none !important; }
    }
  </style>
</head>
<body>
  ${bodyContent}
  
  <div class="no-print-guide" style="max-width: 600px; margin: 40px auto 0 auto; padding: 20px; background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
    <p style="font-size: 14px; font-weight: bold; color: #1e293b; margin: 0 0 8px 0;">ToolMitra PDF Compiler Assistant</p>
    <p style="font-size: 12px; color: #64748b; margin: 0 0 16px 0; line-height: 1.5;">
      Your document was compiled successfully into pristine vector layout. Click the button below to open your operating system's native Print dialog, then select <strong>"Save as PDF"</strong>.
    </p>
    <button onclick="window.print()" style="padding: 10px 20px; background-color: #4f46e5; color: white; border: none; border-radius: 8px; font-weight: bold; font-size: 12px; cursor: pointer; transition: all 0.2s;">
      🖨️ Open Print &amp; Save PDF
    </button>
  </div>
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${(personal.name || 'My').replace(/\s+/g, '_')}_Resume_ATS.html`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification("Beautiful standalone HTML resume generated and downloaded in 1-click!", "success");
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
                    : 'border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-55 dark:hover:bg-slate-800/40 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {s.id}. {s.name}
              </button>
            ))}
          </div>
        </div>

        {/* Step panels inputs */}
        <div className="p-5 border border-slate-150 dark:border-slate-805 bg-slate-50/40 dark:bg-slate-900/10 rounded-2xl min-h-[340px] flex flex-col justify-between">
          
          <div className="space-y-4">
            {step === 1 && (
              <div className="space-y-4 animate-fadeIn">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Personal Identity Details</h4>
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
                    <label className="text-xs font-semibold text-slate-705">LinkedIn Profile Link</label>
                    <input
                      type="text"
                      value={personal.linkedin}
                      onChange={(e) => setPersonal({ ...personal, linkedin: e.target.value })}
                      className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl outline-none"
                      placeholder="linkedin.com/in/..."
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-705">Portfolio/Website Link</label>
                    <input
                      type="text"
                      value={personal.portfolio}
                      onChange={(e) => setPersonal({ ...personal, portfolio: e.target.value })}
                      className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl outline-none"
                      placeholder="https://..."
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
                    className="py-1.5 px-3 bg-indigo-605 dark:bg-cyan-500 hover:bg-indigo-700 dark:hover:bg-cyan-600 text-white dark:text-slate-950 text-[10px] font-bold rounded-lg flex items-center gap-1 cursor-pointer shadow-sm uppercase tracking-wider transition-all duration-200"
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
                    className="py-1.5 px-3 bg-indigo-605 dark:bg-cyan-500 hover:bg-indigo-700 dark:hover:bg-cyan-600 text-white dark:text-slate-950 text-[10px] font-bold rounded-lg flex items-center gap-1 cursor-pointer shadow-sm uppercase tracking-wider transition-all duration-200"
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
                    className="py-1.5 px-3 bg-indigo-605 dark:bg-cyan-500 hover:bg-indigo-700 dark:hover:bg-cyan-600 text-white dark:text-slate-950 text-[10px] font-bold rounded-lg flex items-center gap-1 cursor-pointer shadow-sm uppercase tracking-wider transition-all duration-200"
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
                    className="py-1.5 px-3 bg-indigo-605 dark:bg-cyan-500 hover:bg-indigo-700 dark:hover:bg-cyan-600 text-white dark:text-slate-950 text-[10px] font-bold rounded-lg flex items-center gap-1 cursor-pointer shadow-sm uppercase tracking-wider transition-all duration-200"
                  >
                    <LucideIcon name="Plus" size={12} />
                    <span>Add Item</span>
                  </button>
                </div>

                {certs.map((c, index) => (
                  <div key={index} className="p-3 border border-slate-105 bg-white rounded-xl grid grid-cols-3 gap-2 relative group animate-fadeIn">
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
              className="py-1.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-550 flex items-center gap-1 cursor-pointer disabled:opacity-40"
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
                  onClick={downloadHtmlResume}
                  className="py-1.5 px-4 bg-indigo-605 hover:bg-indigo-700 dark:bg-cyan-500 dark:hover:bg-cyan-600 text-white dark:text-slate-950 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                  title="Download offline-print-ready HTML which prints vector PDF"
                >
                  <LucideIcon name="Download" size={13} />
                  <span>Download HTML / PDF</span>
                </button>
                <button
                  type="button"
                  onClick={triggerPrintPdf}
                  className="py-1.5 px-3 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-705 dark:text-slate-300 text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer transition-all"
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
            onClick={downloadHtmlResume}
            className="w-full py-3 bg-indigo-605 hover:bg-indigo-700 text-white dark:bg-cyan-500 dark:hover:bg-cyan-600 font-bold text-xs uppercase tracking-widest dark:text-slate-950 rounded-xl shadow-lg transition-transform hover:scale-102 flex items-center justify-center gap-2 cursor-pointer"
          >
            <LucideIcon name="Download" size={14} />
            <span>Download ATS Resume (Recommended)</span>
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
                    className="flex-1 py-2.5 bg-indigo-605 text-white font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer"
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
                    className="flex-1 py-2.5 bg-indigo-605 text-white font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer"
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
        <p className="text-xs text-slate-600 dark:text-slate-350 leading-relaxed max-w-4xl mb-6">
          The ToolMitra AI ATS Resume Builder compiles professional resumes engineered for automatic scanner software (ATS). Our system lets you build multiple sections, apply high-density custom templates, and generate customized high-impact career objective highlights entirely client-side safe.
        </p>

        <h3 className="font-bold text-sm text-slate-800 dark:text-slate-205 mb-4">Frequently Asked Questions (FAQ)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-slate-150/80 dark:border-slate-805 bg-white/50 dark:bg-slate-900/10">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-1.5">What is an ATS-friendly resume?</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              These are documents featuring legible standard layout divisions without tables, graphics or charts that would confuse indexing robots. Clear fonts and metadata structure ensure your profile ranks high.
            </p>
          </div>
          <div className="p-4 rounded-xl border border-slate-150/80 dark:border-slate-805 bg-white/50 dark:bg-slate-900/10">
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
