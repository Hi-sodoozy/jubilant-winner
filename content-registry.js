/**
 * Content registry for the Edit website content portal.
 * Each public page that has editable copy is listed here with its content IDs and defaults.
 *
 * To add a new page:
 * 1. Add an entry to CONTENT_PAGES (id, label, file).
 * 2. Add a field array to CONTENT_FIELDS[pageId] with { id, label, type: 'text'|'html', default, rows? }.
 * 3. In the new page's HTML: add data-page-id="pageId" on <body>, data-content-id="pageId.fieldId" on each
 *    editable element, and data-content-type="html" on elements that allow HTML. Include apply-content.js before </body>.
 * The edit portal will then show the new page in the dropdown and allow editing.
 */
var CONTENT_PAGES = [
  { id: 'index', label: 'Homepage', file: 'index.html' },
  { id: 'about', label: 'About', file: 'about.html' },
  { id: 'services', label: 'Services', file: 'services.html' },
  { id: 'business-assessment', label: 'Business Assessment', file: 'business-assessment.html' },
  { id: 'referrals', label: 'Referrals', file: 'referrals.html' },
  { id: 'commercial-production', label: 'Commercial Production', file: 'commercial-production.html' },
  { id: 'website', label: 'Website', file: 'website.html' },
  { id: 'podcast', label: 'Podcast', file: 'podcast.html' },
  { id: 'socials', label: 'Socials', file: 'socials.html' },
  { id: 'phone-messaging', label: 'Phone Messaging', file: 'phone-messaging.html' },
  { id: 'blog', label: 'Blog', file: 'blog.html' }
];

var CONTENT_FIELDS = {
  index: [
    { id: 'hero-title-line1', label: 'Hero title line 1', type: 'text', default: 'Connect your business' },
    { id: 'hero-title-line2', label: 'Hero title line 2', type: 'text', default: 'with your customers' },
    { id: 'hero-panel-body', label: 'Hero panel (box on right)', type: 'text', default: "Iain is an extension of your team. He creates, produces and manages your media and communications while you stay focused on running your business.", rows: 4 },
    { id: 'two-col-right-content', label: 'About block – full content (HTML)', type: 'html', default: '<h2 class="section-two-col-right-title">Connect with customers: Done!</h2><p class="section-two-col-right-body">With Iain Duguid acting as an extension of your business to create, produce and deliver high-quality media and communications material, you can stay focused without another thing taking up space on your to-do list.</p><p class="section-two-col-right-body">Tap into Iain\'s skills to create:</p><ul class="ul-clean"><li>Radio and podcast commercials</li><li>Podcasts</li><li>Phone on‑hold messaging &amp; IVRs</li><li>Websites – including regular updates, blogs and SEO</li><li>Communications packages</li><li>And more!</li></ul>', rows: 12 },
    { id: 'section-help-title', label: 'How can Iain help? – heading', type: 'text', default: 'How can Iain help?' },
    { id: 'card-assessment-body', label: 'Business Assessment card body (HTML)', type: 'html', default: "<p>He'll look at what you're doing and provide suggestions in a statement of advice.</p><ul><li>Is everything aligned with your goal/customers?</li><li>Identify missed opportunities</li><li>Suggest improvements to what you're already doing</li></ul><p>Ready to improve? Iain will make it happen.</p>", rows: 6 },
    { id: 'card-getitdone-body', label: 'Get It Done card body (HTML)', type: 'html', default: "<p>Project‑to‑project or ongoing, Iain makes everything happen whilst aligning with your current business strategy.</p><ul><li>Create new assets</li><li>Update existing material</li><li>Coordinate with your team or operate independently</li></ul><p>Don't have time or resources? Iain does.</p>", rows: 6 },
    { id: 'card-bounce-body', label: 'Business Bounce card body (HTML)', type: 'html', default: "<p>A service that allows you to bounce an idea off Iain without committing to core services.</p><p>For example: &ldquo;I've been thinking about XYZ, should I?&rdquo; or &ldquo;A radio station has made this ad for me, is it any good?&rdquo;</p>", rows: 4 },
    { id: 'referral-text', label: 'Referral strip text', type: 'text', default: 'Unlock a referral rate when you recommend.' },
    { id: 'need-title', label: 'What do I need? – title', type: 'text', default: 'What Do I Need?' },
    { id: 'need-subtitle', label: 'What do I need? – subtitle', type: 'text', default: 'Every business is different, but every business can benefit from…' },
    { id: 'contact-title', label: 'Contact heading', type: 'text', default: 'Contact' },
    { id: 'footer-line1', label: 'Footer line 1', type: 'text', default: '© Iain Duguid. All rights reserved.' },
    { id: 'footer-line2', label: 'Footer line 2', type: 'text', default: 'Connecting businesses with their customers' }
  ],
  about: [
    { id: 'page-intro-title', label: 'Page title', type: 'text', default: 'About' },
    { id: 'page-intro-subtitle', label: 'Subtitle', type: 'text', default: 'Content & Communications' },
    { id: 'page-intro-body', label: 'Intro body (HTML)', type: 'html', default: '<p>Iain Duguid is based in Melbourne, Australia and offers media and communications services to businesses across Australia to better connect with their customers.</p><p>Think of Iain as a full-service creative agency for small and medium sized businesses &mdash; a guy you can reach out to for a website, podcast, radio commercial and so much more.</p><p>With close to 20 years in broadcast audio and media as a writer and producer, Iain brings experience across commercial production, content strategy and project management. He works as an extension of your team&mdash;in-house talent when you need it, and a network of skilled professionals when the project calls for it.</p>', rows: 8 }
  ],
  services: [
    { id: 'page-title', label: 'Page title', type: 'text', default: 'Services' },
    { id: 'page-subtitle', label: 'Subtitle', type: 'text', default: 'Ways Iain connects your business with your customers' },
    { id: 'services-intro-body', label: 'Intro paragraph (HTML)', type: 'html', default: '<p>Iain offers a wide range of services that allow businesses to better connect with their customers by tapping into his in-house talent. When he needs a hand, he calls on a network of highly skilled professionals.</p>', rows: 4 },
    { id: 'services-not-sure-text', label: '"Don\'t know what you need?" text', type: 'text', default: "Don't know what you need?" },
    { id: 'svc-commercial-title', label: 'Commercial Production – title', type: 'text', default: 'Commercial Production' },
    { id: 'svc-commercial-tagline', label: 'Commercial Production – tagline', type: 'text', default: 'High-Quality Broadcast Ads.' },
    { id: 'svc-commercial-subline', label: 'Commercial Production – subline', type: 'text', default: 'Write, Manage, Produce' },
    { id: 'svc-commercial-body', label: 'Commercial Production – body (HTML)', type: 'html', default: '<p>Iain has worked in the broadcast audio and media space for close to 20 years as a writer and producer. Need an ad made? Iain will manage the whole process to supply you a final audio file to supply radio stations.</p>', rows: 4 },
    { id: 'svc-website-title', label: 'Website – title', type: 'text', default: 'Website' },
    { id: 'svc-website-tagline', label: 'Website – tagline', type: 'text', default: 'A place to send customers' },
    { id: 'svc-website-subline', label: 'Website – subline', type: 'text', default: 'Design, maintain, update' },
    { id: 'svc-website-body', label: 'Website – body (HTML)', type: 'html', default: '<p>From website design to maintenance, Iain will help your business look right whilst providing your customers with what they need to choose you.</p><p>He can also keep event info up to date — think upcoming events and booking info.</p>', rows: 4 },
    { id: 'svc-socials-title', label: 'Socials – title', type: 'text', default: 'Socials' },
    { id: 'svc-socials-tagline', label: 'Socials – tagline', type: 'text', default: 'The voice of your brand' },
    { id: 'svc-socials-subline', label: 'Socials – subline', type: 'text', default: 'Start, maintain, post' },
    { id: 'svc-socials-body', label: 'Socials – body (HTML)', type: 'html', default: '<p>Don\'t ask Iain to make you go viral, but he can assist with running your social media channels on your behalf.</p>', rows: 3 },
    { id: 'svc-podcasts-title', label: 'Podcasts – title', type: 'text', default: 'Podcasts' },
    { id: 'svc-podcasts-tagline', label: 'Podcasts – tagline', type: 'text', default: 'Share your knowledge' },
    { id: 'svc-podcasts-subline', label: 'Podcasts – subline', type: 'text', default: 'Record, edit, produce' },
    { id: 'svc-podcasts-body', label: 'Podcasts – body (HTML)', type: 'html', default: '<p>Need someone to record, edit or produce (or project manage) your podcast? They\'re a great way to show customers and the world that you\'re an expert in your field.</p>', rows: 3 },
    { id: 'svc-industry-title', label: 'Industry Updates – title', type: 'text', default: 'Industry Updates' },
    { id: 'svc-industry-tagline', label: 'Industry Updates – tagline', type: 'text', default: 'Keep your branding consistent' },
    { id: 'svc-industry-subline', label: 'Industry Updates – subline', type: 'text', default: 'Keep your network updated' },
    { id: 'svc-industry-body', label: 'Industry Updates – body (HTML)', type: 'html', default: '<p>Every time you do something significant, Iain will update your network within the industry with additional and up-to-date communications collateral.</p>', rows: 3 },
    { id: 'svc-phone-title', label: 'Phone Messaging – title', type: 'text', default: 'Phone Messaging' },
    { id: 'svc-phone-tagline', label: 'Phone Messaging – tagline', type: 'text', default: 'Sound good over the phone' },
    { id: 'svc-phone-body', label: 'Phone Messaging – body (HTML)', type: 'html', default: '<p>Put your best foot forward when a customer calls your business. Iain produces on hold messages, plus all those other elements.</p>', rows: 3 },
    { id: 'svc-pm-title', label: 'Project Management – title', type: 'text', default: 'Project Management' },
    { id: 'svc-pm-tagline', label: 'Project Management – tagline', type: 'text', default: "He'll take it off your hands." },
    { id: 'svc-pm-subline', label: 'Project Management – subline', type: 'text', default: 'Content, Media, Comms' },
    { id: 'svc-pm-body', label: 'Project Management – body (HTML)', type: 'html', default: '<p>When you need something done, Iain will make it happen. Don\'t worry about how it\'ll get done — that\'s up to him to deliver you the final product.</p>', rows: 3 }
  ],
  'business-assessment': [
    { id: 'page-intro-title', label: 'Page title', type: 'text', default: 'Business Assessment' },
    { id: 'page-intro-subtitle', label: 'Subtitle', type: 'text', default: 'Improve how you connect with customers' },
    { id: 'page-intro-body', label: 'Intro body (HTML)', type: 'html', default: '<p>An Iain Duguid Business Assessment is a way to step back and take an objective look at how you connect with your customers.</p><p>He\'ll learn about your business, your strategy and target demographic to ensure all connection points are aligned.</p><p>Once assessed, you\'ll receive an Iain Duguid Statement of Advice containing details on what your business is doing well and what it\'s doing poorly. That\'s not all!</p><p>Your Statement of Advice contains suggested improvements, what to stop doing, and other elements that you might not have considered.</p><p>The best bit: He\'ll actually help you carry out any changes. Remember, he helps businesses connect with their customers.</p>', rows: 10 },
    { id: 'casa-title', label: 'CASA Flow – heading', type: 'text', default: 'The CASA Flow' },
    { id: 'casa-subtitle', label: 'CASA Flow – subtitle', type: 'text', default: "Here's what happens" },
    { id: 'casa-step1-title', label: 'Step 1 – title', type: 'text', default: 'Chat' },
    { id: 'casa-step1-body', label: 'Step 1 – body', type: 'text', default: "Iain will get to know your business, goals and ideal customers. If a good fit, he'll get started!", rows: 2 },
    { id: 'casa-step2-title', label: 'Step 2 – title', type: 'text', default: 'Assessment' },
    { id: 'casa-step2-body', label: 'Step 2 – body', type: 'text', default: 'Iain will spend time inspecting all customer touch points.', rows: 2 },
    { id: 'casa-step3-title', label: 'Step 3 – title', type: 'text', default: 'Statement of Advice' },
    { id: 'casa-step3-body', label: 'Step 3 – body', type: 'text', default: "Once all areas have been assessed, you'll receive a Statement of Advice containing all of his recommendations.", rows: 2 },
    { id: 'casa-step4-title', label: 'Step 4 – title', type: 'text', default: 'Action' },
    { id: 'casa-step4-body', label: 'Step 4 – body', type: 'text', default: "The ball's in your court. Iain can help you implement his advice, or do it yourself (or not)—there's no obligation.", rows: 2 },
    { id: 'benefits-heading', label: 'Benefits – heading', type: 'text', default: 'Benefits of a Business Assessment' },
    { id: 'benefit-reestablish-title', label: 'Benefit 1 – title', type: 'text', default: 'Re-establish' },
    { id: 'benefit-reestablish-body', label: 'Benefit 1 – body', type: 'text', default: 'A Business Assessment will encourage you to pause, re-establish your business strategy and then ensure that customer-facing assets are aligned with your current direction.', rows: 3 },
    { id: 'benefit-realign-title', label: 'Benefit 2 – title', type: 'text', default: 'Realign' },
    { id: 'benefit-realign-body', label: 'Benefit 2 – body', type: 'text', default: "Inconsistencies across assets are common when work has been completed by different businesses or staff members. It's a great opportunity to get everything back on track.", rows: 3 },
    { id: 'benefit-refresh-title', label: 'Benefit 3 – title', type: 'text', default: 'Refresh' },
    { id: 'benefit-refresh-body', label: 'Benefit 3 – body', type: 'text', default: "Maybe what you've got now is a little old, tired or in need of a general refresh. Iain can give you a hand to spruce up your media and communications.", rows: 3 }
  ],
  referrals: [
    { id: 'page-intro-title', label: 'Page title', type: 'text', default: 'Referrals' },
    { id: 'page-intro-body', label: 'Intro body (HTML)', type: 'html', default: '<p>You\'ll receive a referral rate for each business you recommend.</p><p>What that discount is and when it applies is yet to be determined, so let\'s chat and work something out.</p>', rows: 4 },
    { id: 'contact-title', label: 'Form heading', type: 'text', default: 'Been sent here?' }
  ],
  'commercial-production': [
    { id: 'page-title', label: 'Page title', type: 'text', default: 'Commercial Production' },
    { id: 'page-subtitle', label: 'Subtitle', type: 'text', default: 'High-Quality Broadcast Ads.' },
    { id: 'page-intro-body', label: 'Intro body (HTML)', type: 'html', default: '<p>Iain is an award-winning commercial writer who has worked in the broadcast audio and media space for close to 20 years as a writer and producer.</p><p>Need an ad made? Iain will manage the whole process to supply you a final audio file to supply radio stations.</p>', rows: 4 },
    { id: 'option-writing-title', label: 'Writing – title', type: 'text', default: 'Writing' },
    { id: 'option-writing-desc', label: 'Writing – description (HTML)', type: 'html', default: '<p>Iain Duguid has been writing radio and podcast commercials for close to 20 years and has made a name for himself as a trustworthy and effective writer in this space, having written commercials for Australia\'s biggest companies, including Jetstar, Ford Au, Myer, Beyond Blue, and various SMEs across Melbourne and regional Australia.</p><p>Simply tell Iain what you\'d like to advertise and he\'ll write a script for you.</p>', rows: 5 },
    { id: 'option-manage-title', label: 'Production Management – title', type: 'text', default: 'Production Management' },
    { id: 'option-manage-desc', label: 'Production Management – description (HTML)', type: 'html', default: '<p>You never have to make a decision on making an ad again. Simply mention your budget and it\'ll happen. Iain works closely with various voiceover artists and agencies, and audio producers to create commercials that you\'ll be proud to share.</p><p class="commercial-note"><em>Please note: It is unlikely that Iain will be able to produce commercials written by an in-house creative team from a legal point of view, as a radio station or agency will often retain IP of the commercial.</em></p>', rows: 5 },
    { id: 'option-production-title', label: 'Production – title', type: 'text', default: 'Production' },
    { id: 'option-production-desc', label: 'Production – description (HTML)', type: 'html', default: '<p>Iain has developed relationships with top-tier audio producers who will make your commercial.</p><p class="commercial-note"><em>Please note: It is unlikely that Iain will be able to produce commercials written by an in-house creative team from a legal point of view, as a radio station or agency will often retain IP of the commercial.</em></p>', rows: 4 },
    { id: 'cta-text', label: 'Bottom CTA text', type: 'text', default: 'Need an ad made? Get in touch.' }
  ],
  website: [
    { id: 'page-title', label: 'Page title', type: 'text', default: 'Website' },
    { id: 'page-subtitle', label: 'Subtitle', type: 'text', default: 'A place to send customers' },
    { id: 'page-intro-body', label: 'Intro body (HTML)', type: 'html', default: '<p>From design and content to ongoing maintenance, Iain helps your business look right and give customers what they need to choose you. Here\'s how he can help.</p>', rows: 3 },
    { id: 'option-design-title', label: 'Design – title', type: 'text', default: 'Design' },
    { id: 'option-design-desc', label: 'Design – description', type: 'text', default: 'He creates the look, structure and user experience of your site so it reflects your brand and makes it easy for visitors to find what they need. This includes layout, navigation, visual style and responsive behaviour across devices.', rows: 4 },
    { id: 'option-content-title', label: 'Content creation – title', type: 'text', default: 'Content creation' },
    { id: 'option-content-desc', label: 'Content creation – description', type: 'text', default: 'He writes and organises the words, images and other assets that go on your site. That might mean new copy for key pages, blog posts, FAQs, event listings or product descriptions — all tuned to your audience and goals.', rows: 4 },
    { id: 'option-maintenance-title', label: 'Maintenance – title', type: 'text', default: 'Maintenance' },
    { id: 'option-maintenance-desc', label: 'Maintenance – description', type: 'text', default: 'He keeps your site running smoothly and up to date. That includes technical updates, security and performance checks, plus content updates such as news, events, team changes or seasonal offers so your site stays current.', rows: 4 },
    { id: 'cta-text', label: 'Bottom CTA text', type: 'text', default: 'Ready to improve your website? Get in touch and we\'ll help you work out the next step.' }
  ],
  podcast: [
    { id: 'page-title', label: 'Page title', type: 'text', default: 'Podcast' },
    { id: 'page-subtitle', label: 'Subtitle', type: 'text', default: 'Be heard and sound great!' },
    { id: 'page-intro-body', label: 'Intro body (HTML)', type: 'html', default: "<p>In addition to producing and editing a number of podcast titles, Iain has previously worked as part of 9Podcasts division in a multi-disciplinary position which included podcast project management, and the development of podcasts and their assets &mdash; including commercial elements. He's a great person to have on your side.</p>", rows: 4 },
    { id: 'option-dev-title', label: 'Development and Management – title', type: 'text', default: 'Development and Management' },
    { id: 'option-dev-desc', label: 'Development and Management – description (HTML)', type: 'html', default: "<p>Whether you're starting a pod from scratch, or are looking to incorporate an extra set of hands, Iain will help you to feel out what a new podcast might look like, identify its commercial viability and advertising opportunities.</p><p>And if you're a host without the time to wrangle guests or are looking for assistance typical of a producer or project manager, Iain is able to step in wherever you need.</p>", rows: 5 },
    { id: 'option-editing-title', label: 'Editing – title', type: 'text', default: 'Editing' },
    { id: 'option-editing-desc', label: 'Editing – description (HTML)', type: 'html', default: '<p>Podcast editing comes in many forms. You might record a podcast and need it tidied up, or you\'d like to lean into a heavier edit. The skill with podcast editing is not hearing the edits.</p>', rows: 3 },
    { id: 'option-full-title', label: 'Full Service – title', type: 'text', default: 'Full Service' },
    { id: 'option-full-desc', label: 'Full Service – description (HTML)', type: 'html', default: "Iain will help in the pre-record stage, record your podcast, edit the content, and even upload the final edit. All you have to do is host! Already have someone doing a task? That's fine! As mentioned above, Iain can step in wherever you need.", rows: 4 },
    { id: 'option-equipment-title', label: 'Equipment Hire – title', type: 'text', default: 'Equipment Hire' },
    { id: 'option-equipment-desc', label: 'Equipment Hire – description (HTML)', type: 'html', default: '<p>You don\'t need to go out and buy new gear &mdash; especially if you\'re dabbling in the podcast space. Iain has recording equipment that he can bring to you (and operate).</p><p><strong>If you\'re wondering:</strong><br />Recording console: Rode Rodecaster<br />Mics: Shure SM7B</p>', rows: 5 },
    { id: 'cta-text', label: 'Bottom CTA text', type: 'text', default: 'Ready to get started with your podcast? Get in touch.' }
  ],
  socials: [
    { id: 'page-title', label: 'Page title', type: 'text', default: 'Socials' },
    { id: 'page-subtitle', label: 'Subtitle', type: 'text', default: 'Social media management' },
    { id: 'page-intro-body', label: 'Intro body (HTML)', type: 'html', default: "<p>Some of Iain's content has gone viral, but he'll never guarantee that your content will. Businesses should use social media as an extension of their brand, whilst leveraging each platform to develop credibility or a unique tone of voice.</p><p>Further, Iain's recommendation is that you should only be active on platforms that are right for your brand and communications strategy.</p>", rows: 4 },
    { id: 'option-setup-title', label: 'Set-up – title', type: 'text', default: 'Set-up' },
    { id: 'option-setup-desc', label: 'Set-up – description', type: 'text', default: 'You might opt to set up a social media account for your business yourself, but Iain can do it for you, whilst ensuring that the account uses all current assets used by your business.', rows: 3 },
    { id: 'option-post-title', label: 'Post – title', type: 'text', default: 'Post' },
    { id: 'option-post-desc', label: 'Post – description', type: 'text', default: "Send Iain your idea and he'll post on your behalf. At this stage he doesn't film content as a service, but if you're super-keen, he might be able to help you out.", rows: 3 },
    { id: 'option-maintenance-title', label: 'Maintenance – title', type: 'text', default: 'Maintenance' },
    { id: 'option-maintenance-desc', label: 'Maintenance – description', type: 'text', default: "Think of this as a full social media service where Iain will ensure that communications that you're releasing across other areas are also reflected in social media posts. Not everything needs to live on your socials. Iain will also ensure that all assets are aligned with current branding.", rows: 4 },
    { id: 'cta-text', label: 'Bottom CTA text', type: 'text', default: 'Need help with your socials? Get in touch.' }
  ],
  'phone-messaging': [
    { id: 'page-title', label: 'Page title', type: 'text', default: 'Phone Messaging' },
    { id: 'page-subtitle', label: 'Subtitle', type: 'text', default: 'Sound great over the phone' },
    { id: 'page-intro-body', label: 'Intro body (HTML)', type: 'html', default: '<p>Having written and produced effective phone on hold messaging for companies in this space, Iain can assist you with yours. He works alongside an on hold messaging provider, who can also recommend a service provider to set you up.</p>', rows: 3 },
    { id: 'option-writing-title', label: 'Writing – title', type: 'text', default: 'Writing' },
    { id: 'option-writing-desc', label: 'Writing – description', type: 'text', default: "When creating on hold messages (and other messages like IVRs and greetings) it's worth putting yourself in the caller's position. Tell them what they need to hear, when they need to hear it. What should you include? Leave this with Iain.", rows: 3 },
    { id: 'option-production-title', label: 'Production – title', type: 'text', default: 'Production' },
    { id: 'option-production-desc', label: 'Production – description', type: 'text', default: 'Iain works with a preferred on hold messaging provider, so if you need any phone audio made, chat with Iain about next steps.', rows: 2 },
    { id: 'cta-text', label: 'Bottom CTA text', type: 'text', default: 'Need phone messaging or on hold audio? Get in touch.' }
  ],
  blog: [
    { id: 'page-title', label: 'Page title', type: 'text', default: 'Blog' },
    { id: 'page-subtitle', label: 'Subtitle', type: 'text', default: 'Posts from Iain' }
  ]
};
