/**
 * Digital Dude Knowledge Base Chunks & Retrieval Engine
 * 
 * Strict Source of Truth for the Digital Dude RAG Chatbot.
 * All facts conform strictly to the confirmed business facts:
 * - Founded 2022, Chennai, Tamil Nadu, India
 * - Target clients: startups, SMEs, and growing businesses
 * - 22 Confirmed Services
 * - Pricing: No fixed pricing (scope-dependent)
 * - Working Hours: 9:30 AM to 5:30 PM (No 24/7)
 * - Explicit missing/unconfirmed information boundaries
 */


export const KNOWLEDGE_CHUNKS = [
  {
    id: 'chunk_business_profile',
    title: 'Business Overview, Location & Target Clients',
    category: 'profile',
    keywords: [
      'digital dude', 'who are you', 'about', 'company', 'location', 'where',
      'chennai', 'tamil nadu', 'india', 'founded', 'since', '2022', 'clients',
      'startups', 'sme', 'smes', 'small business', 'who do you work with'
    ],
    tamilKeywords: [
      'engirukeenga', 'oor', 'chennai la', 'yaru neenga', 'company pathi'
    ],
    content: `BUSINESS OVERVIEW & PROFILE:
- Business Name: Digital Dude
- Operating Since: 2022
- Location: Chennai, Tamil Nadu, India
- Head Office: No.90, Ramanujakoodam Street, Poonamallee, Chennai - 600056, Tamil Nadu, India.
- Target Clients: Startups, small and medium-sized businesses (SMEs), and growing businesses looking to strengthen their digital presence and generate predictable business growth.
- Core Identity: A digital marketing and digital technology services company based in Chennai.`
  },
  {
    id: 'chunk_confirmed_services',
    title: 'Confirmed Services Catalog',
    category: 'services',
    keywords: [
      'services', 'offer', 'what do you do', 'solutions', 'capabilities',
      'social media marketing', 'social media management', 'social media advertising',
      'digital marketing', 'seo', 'search engine optimization', 'ppc advertising',
      'pay per click', 'content marketing', 'website development', 'landing page',
      'landing page development', 'web application', 'web app', 'e-commerce development',
      'ecommerce', 'online store', 'mobile app development', 'app', 'android', 'ios',
      'website maintenance', 'maintenance', 'support', 'graphic design', 'branding',
      'logo design', 'social media creatives', 'videography', 'video editing',
      'reels', 'short-form video production', 'influencer marketing', 'personal branding',
      'event management', 'software development'
    ],
    tamilKeywords: [
      'services enna', 'enna pandreenga', 'website panna mudiyuma', 'app seiveengala',
      'insta manage pannuveengala', 'reels pannuveengala', 'logo design pannuveengala'
    ],
    content: `CONFIRMED SERVICES CATALOG:
Digital Dude provides the following confirmed services:
1. Social Media Marketing
2. Social Media Management
3. Social Media Advertising (Paid social campaigns on Facebook, Instagram, etc.)
4. Digital Marketing
5. SEO (Search Engine Optimization)
6. PPC Advertising
7. Content Marketing
8. Website Development (Custom business websites, portfolio sites, corporate portals)
9. Landing Page Development (High-conversion landing pages)
10. Web Application Development
11. E-commerce Development (Online storefronts, shopping carts, product catalogs)
12. Mobile App Development
13. Website Maintenance and Support (Keeping digital properties secure, optimized, and updated)
14. Graphic Design (Visual marketing collateral, banners, posters, decks)
15. Branding and Logo Design (Identity design, brand kits)
16. Social Media Creatives (Engaging post designs, carousel graphics)
17. Videography
18. Video Editing
19. Reels and Short-form Video Production
20. Influencer Marketing (Creator research, outreach, and campaign management)
21. Personal Branding (Thought leadership and profile management for founders and professionals)
22. Event Management
23. Software Development`
  },
  {
    id: 'chunk_pricing_policy',
    title: 'Pricing Policy & Cost Determination',
    category: 'pricing',
    keywords: [
      'price', 'pricing', 'cost', 'how much', 'charge', 'rate', 'quote', 'quotation',
      'fee', 'budget', 'expensive', 'cheap', 'package', 'packages', 'starting price',
      'hourly rate', 'minimum budget', 'payment'
    ],
    tamilKeywords: [
      'evlo', 'evlo aagum', 'cost evlo', 'vilai', 'amount', 'kattanam', 'budget'
    ],
    content: `PRICING POLICY:
- Digital Dude does NOT have fixed pricing.
- Pricing varies depending on:
  * Client requirements
  * Project scope
  * Project complexity
  * Deliverables
  * Other project-specific needs
- The final price is determined after understanding the client's requirements and is confirmed by Digital Dude before the project begins.
- Never provide a made-up price, starting price, package price, hourly rate, percentage, or minimum budget.
- For all pricing queries: Explain that Digital Dude does not have fixed pricing and that cost depends on client requirements, project scope, complexity, and deliverables.`
  },
  {
    id: 'chunk_working_hours',
    title: 'Working Hours & Support Availability',
    category: 'hours',
    keywords: [
      'working hours', 'hours', 'timing', 'timings', 'time', 'open', 'close',
      'schedule', 'available', 'availability', 'support hours', '24/7', 'weekend', 'sunday'
    ],
    tamilKeywords: [
      'neram', 'ethana mani', 'eppo open', 'working time enna'
    ],
    content: `WORKING HOURS & SUPPORT:
- Digital Dude's regular working hours are: 9:30 AM to 5:30 PM.
- Customer enquiries, communication, and support are handled during these working hours (9:30 AM to 5:30 PM).
- Digital Dude does NOT provide 24/7 support or round-the-clock availability.`
  },
  {
    id: 'chunk_service_limitations',
    title: 'Service Limitations & Project Acceptance',
    category: 'limitations',
    keywords: [
      'limitation', 'limitations', 'exclusion', 'exclusions', 'can you do everything',
      'guarantee', 'feasible', 'feasibility', 'scope', 'acceptance'
    ],
    tamilKeywords: [
      'mudiyuma', 'seiveengala', 'guarantee iruka'
    ],
    content: `SERVICE LIMITATIONS & PROJECT FEASIBILITY:
- Digital Dude currently has no specific service limitations or exclusions.
- Services are offered based on:
  * Client requirements
  * Project scope
  * Feasibility
- "No specific service limitations" is NOT a guarantee that every possible request will always be accepted.
- Availability for custom or unlisted requests depends on the specific project requirements, scope, and feasibility.`
  },
  {
    id: 'chunk_missing_information_rules',
    title: 'Missing & Unconfirmed Information Safeguards',
    category: 'missing_info',
    keywords: [
      'timeline', 'timelines', 'how long', 'how many days', 'how many weeks', 'how many months',
      'website timeline', 'seo timeline', 'monthly posts', 'monthly reels', 'how many reels',
      'how many posts', 'exact deliverables', 'photography', 'photo shoot', 'exact google ads',
      'service package', 'packages', 'minimum budget', 'payment terms', 'advance payment',
      'contract duration', 'revision policy', 'consultation process', 'guarantee', 'results guarantee'
    ],
    tamilKeywords: [
      'evlo naal aagum', 'ethana reel', 'ethana post', 'time aagum', 'advance kudukanuma'
    ],
    content: `MISSING & UNCONFIRMED INFORMATION RULES:
The following items are NOT confirmed in the current knowledge base and must NEVER be invented:
- Website development timelines
- SEO timelines
- Number of monthly posts
- Number of monthly reels
- Exact social media deliverables
- Photography availability (Photography is not explicitly confirmed; only Videography and Video Production are confirmed)
- Exact Google Ads platforms
- Service packages
- Minimum project budget
- Payment terms & advance payment
- Contract duration
- Revision policy
- Consultation process & quotation process
- Project-specific guarantees or result timelines (e.g., ranking in X months, X leads/sales)

MANDATORY PROTOCOL:
If asked about any of the unconfirmed items, say clearly:
"I don't have a confirmed answer for that in my current Digital Dude information. Please contact Digital Dude directly for the exact details."`
  },
  {
    id: 'chunk_tanglish_tamil_mapping',
    title: 'Tamil & Tanglish Intent Interpretations',
    category: 'language',
    keywords: [
      'tamil', 'tanglish', 'language', 'panna mudiyuma', 'evlo cost aagum',
      'manage pannuveengala', 'reels pannuveengala', 'seo result vara evlo time aagum',
      'google ads run pannuveengala'
    ],
    tamilKeywords: [
      'tamil theriyuma', 'tamil la sollunga', 'tanglish'
    ],
    content: `CUSTOMER LANGUAGE MAPPINGS (ENGLISH & TANGLISH):
Understand informal customer phrasing and Tanglish / Tamil questions:
- "Website panna mudiyuma?" → Maps to Website Development. (Yes, Digital Dude provides website development.)
- "Website evlo cost aagum?" → Maps to Website Development Pricing. (Digital Dude does not have fixed pricing; cost depends on project requirements, scope, complexity, and deliverables.)
- "Instagram manage pannuveengala?" → Maps to Social Media Management. (Yes, Digital Dude provides social media management and social media marketing.)
- "Reels pannuveengala?" → Maps to Reels & Short-form Video Production. (Yes, Digital Dude produces reels and short-form videos. However, exact monthly quantities are not fixed/confirmed and depend on requirements.)
- "SEO result vara evlo time aagum?" → Maps to SEO timeline. (SEO is a confirmed service, but the exact timeline to get results is not confirmed in the knowledge base; customer should contact Digital Dude directly.)
- "Google ads run pannuveengala?" → Maps to PPC / Advertising. (Digital Dude offers PPC Advertising and Social Media Advertising; availability for specific platforms depends on project scope and feasibility.)
- "Can you handle Insta?" → Instagram / Social Media Management
- "Can you make reels?" → Reels and short-form video production
- "Can you fix my website?" → Website Maintenance and Support
- "Can you make an online store?" → E-commerce Development
- "Can you build an app?" → Mobile App Development
- "Can you promote my personal brand?" → Personal Branding
- "Can you find influencers?" → Influencer Marketing`
  },
  {
    id: 'chunk_contact_channels',
    title: 'Verified Contact Channels & Human Handoff',
    category: 'contact',
    keywords: [
      'contact', 'phone', 'email', 'mobile', 'call', 'whatsapp', 'address',
      'office', 'reach', 'talk to human', 'speak to someone', 'enquiry', 'inquiry'
    ],
    tamilKeywords: [
      'phone number', 'contact panna', 'pesanum', 'office engu'
    ],
    content: `VERIFIED CONTACT CHANNELS:
When information is unconfirmed or the customer wants to discuss project requirements, direct them to contact Digital Dude:
- Phone / WhatsApp: +91 97870-97006, +91 89396-51525
- Email: wedigitaldude@gmail.com, lalith@digital-dude.com
- Office Address: No.90, Ramanujakoodam Street, Poonamallee, Chennai - 600056, Tamil Nadu, India.
- Enquiries are handled during working hours (9:30 AM to 5:30 PM).`
  }
];

/**
 * Intelligent Retrieval Engine:
 * Scores chunks against customer query, matching English & Tanglish tokens,
 * phrases, and intents. Returns the most relevant knowledge chunks.
 */
export function retrieveKnowledgeChunks(query) {
  const normalized = query.toLowerCase().trim();
  const tokens = normalized.split(/\s+/).filter(t => t.length > 1);

  const scored = KNOWLEDGE_CHUNKS.map(chunk => {
    let score = 0;

    // Check exact phrase matches in content or keywords
    for (const kw of chunk.keywords) {
      if (normalized.includes(kw)) {
        score += 8;
      }
    }

    for (const tkw of chunk.tamilKeywords) {
      if (normalized.includes(tkw)) {
        score += 10;
      }
    }

    // Token overlap
    for (const token of tokens) {
      if (chunk.keywords.some(k => k.includes(token))) score += 2;
      if (chunk.tamilKeywords.some(k => k.includes(token))) score += 3;
      if (chunk.title.toLowerCase().includes(token)) score += 3;
      if (chunk.content.toLowerCase().includes(token)) score += 1;
    }

    // Specific intent boosters
    if (/price|cost|how much|rate|charge|fee|budget|evlo|vilai/i.test(normalized)) {
      if (chunk.id === 'chunk_pricing_policy') score += 15;
    }

    if (/hour|time|timing|schedule|open|close|24\/7|neram/i.test(normalized)) {
      if (chunk.id === 'chunk_working_hours') score += 15;
    }

    if (/timeline|how long|days|weeks|months|many reels|many posts|advance|payment term|guarantee/i.test(normalized)) {
      if (chunk.id === 'chunk_missing_information_rules') score += 15;
    }

    if (/service|what do you do|website|app|seo|reels|insta|video|design|logo|influencer|pannuveengala|mudiyuma/i.test(normalized)) {
      if (chunk.id === 'chunk_confirmed_services') score += 12;
    }

    if (/mudiyuma|evlo|pannuveengala|seiveengala|aagum|enga/i.test(normalized)) {
      if (chunk.id === 'chunk_tanglish_tamil_mapping') score += 12;
    }

    if (/contact|call|phone|email|address|office|reach/i.test(normalized)) {
      if (chunk.id === 'chunk_contact_channels') score += 12;
    }

    return { chunk, score };
  });

  scored.sort((a, b) => b.score - a.score);

  // Take top chunks with positive score, or at least the business overview + services if vague
  let selected = scored.filter(s => s.score > 2).slice(0, 4).map(s => s.chunk);

  if (selected.length === 0) {
    selected = [
      KNOWLEDGE_CHUNKS.find(c => c.id === 'chunk_business_profile'),
      KNOWLEDGE_CHUNKS.find(c => c.id === 'chunk_confirmed_services')
    ];
  }

  // Always include contact info if missing info chunk is selected
  const hasMissingInfo = selected.some(c => c.id === 'chunk_missing_information_rules');
  const hasContact = selected.some(c => c.id === 'chunk_contact_channels');
  if (hasMissingInfo && !hasContact) {
    const contactChunk = KNOWLEDGE_CHUNKS.find(c => c.id === 'chunk_contact_channels');
    if (contactChunk) selected.push(contactChunk);
  }

  return {
    chunks: selected,
    chunkIds: selected.map(c => c.id)
  };
}
