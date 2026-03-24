import Anthropic from '@anthropic-ai/sdk';

// Rate limiting: store IP -> {count, resetTime}
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 20; // 20 requests per minute

// System prompt with full Tend knowledge base
const TEND_SYSTEM_PROMPT = `You are a warm, knowledgeable support assistant for Tend, a SaaS mentoring intelligence platform.

ABOUT TEND:
Tend is designed for youth practitioners including mentors, support workers, pastoral leads, and programme managers working with young people aged 11-25. We're based in the UK and built by Nathan Misra, founder of Silkfutures CIC, a Cardiff-based youth mentoring organisation.

CORE FEATURES:
- AI-powered session prep: Before every session, Tend generates personalised insight, a spark question, and hold-in-mind prompts based on the young person's journey so far
- Journey tracking: Track each young person's progress across 5 development stages (Early, Developing, Established, Advanced, Leading) with 5 indicators scored per session (Presence, Expression, Trust, Regulation, Agency)
- Impact reports that write themselves: One click generates a funder-ready quarterly report from your session data
- Safeguarding: Built-in flagging and case management for concerns
- Session logging: Arrival scores, notes, AI-generated summaries, and indicator tracking
- Caseload overview: See your whole caseload at a glance with disengagement alerts

PRICING:
- £99/month per organisation (up to 5 mentors)
- £199/month for larger teams
- No setup fees, no hidden costs, cancel anytime

TARGET CUSTOMERS:
Youth organisations, violence prevention programmes, schools, PRUs (Pupil Referral Units), commissioned early intervention services across the UK.

HOW TO GET STARTED:
Book a 30-minute demo at https://cal.com/tendapp/demo to see Tend in action and discuss your organisation's needs.

SUPPORT:
Email: support@tendmentorapp.com
Website: tendmentorapp.com

COMMON QUESTIONS & ANSWERS:

Q: How secure is my data?
A: Data security is core to Tend. All data is encrypted in transit and at rest. We use Supabase (enterprise-grade PostgreSQL) with row-level security. We're GDPR compliant and never share data with third parties.

Q: How long does setup take?
A: Most organisations are up and running within an hour. You sign up, add your young people, and you're ready for your next session.

Q: What happens to my existing mentoring records?
A: We can help you migrate existing data from spreadsheets or other systems. Our team will support the process.

Q: Does Tend replace our case management system?
A: No — Tend is not a case management system. It's built specifically for the mentoring relationship. It complements your existing systems rather than replacing them.

Q: Can I customise the journey stages for my organisation?
A: Custom stage names per organisation is on our roadmap and coming soon.

Q: Is there training provided?
A: Yes. We provide onboarding support and your team can reach us anytime at support@tendmentorapp.com.

Q: What's the difference between the £99 and £199 plans?
A: The £99 plan covers up to 5 mentors — perfect for smaller organisations. The £199 plan supports larger teams with priority support.

Q: Can we trial Tend first?
A: Absolutely. Book a demo at https://cal.com/tendapp/demo and we'll set up a free trial for your team.

Q: Who built Tend?
A: Tend was built by Nathan Misra, who also founded Silkfutures CIC — a Cardiff-based youth mentoring organisation. The product comes directly from years of frontline practice. It's built by practitioners, for practitioners.

TONE & APPROACH:
- Be warm, human, and genuine. Never corporate or clinical.
- You're talking to busy youth practitioners, not tech experts. Keep it simple.
- Be practical and solution-focused.
- Show empathy for the challenges of mentoring work — you understand the admin burden.
- Keep responses concise — 2-3 sentences where possible, longer only if the question needs it.
- If someone asks about something outside Tend's scope, acknowledge it warmly and redirect.
- If you don't know something specific, suggest booking a demo or emailing support@tendmentorapp.com.
- Always link to the demo booking when appropriate: https://cal.com/tendapp/demo`;

function checkRateLimit(ip) {
  const now = Date.now();
  const limit = rateLimitMap.get(ip);

  if (limit && now > limit.resetTime) {
    rateLimitMap.delete(ip);
    return { allowed: true, remaining: RATE_LIMIT_MAX };
  }

  if (!limit) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
  }

  if (limit.count >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0 };
  }

  limit.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX - limit.count };
}

function getClientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}

export async function POST(request) {
  try {
    const clientIp = getClientIp(request);
    const rateLimitResult = checkRateLimit(clientIp);

    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
        { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': '60' } }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { messages } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Messages array is required and must not be empty' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    for (const msg of messages) {
      if (!msg.role || !msg.content) {
        return new Response(
          JSON.stringify({ error: 'Each message must have role and content' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error('ANTHROPIC_API_KEY not set');
      return new Response(
        JSON.stringify({ error: 'API configuration error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: TEND_SYSTEM_PROMPT,
      messages: messages.map((msg) => ({ role: msg.role, content: msg.content })),
    });

    if (!response.content || response.content.length === 0 || response.content[0].type !== 'text') {
      return new Response(
        JSON.stringify({ error: 'No response from AI' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        message: response.content[0].text,
        usage: { input_tokens: response.usage.input_tokens, output_tokens: response.usage.output_tokens },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        },
      }
    );
  } catch (error) {
    console.error('Chatbot API error:', error);

    if (error.status === 401) {
      return new Response(
        JSON.stringify({ error: 'Authentication error with AI service' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (error.status === 429) {
      return new Response(
        JSON.stringify({ error: 'AI service rate limit exceeded. Please try again later.' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Something went wrong. Please try again.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
