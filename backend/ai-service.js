const OpenAI = require('openai');

const MAX_TRANSCRIPT_CHARS = 12000;
const MAX_CONTEXT_CHARS = 14000;

let openaiClient = null;

function getOpenAIClient() {
  if (!openaiClient && process.env.OPENAI_API_KEY) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

// ---------------------------------------------------------------------------
// Fallback: keyword/regex extraction when OpenAI is unavailable
// ---------------------------------------------------------------------------

function fallbackExtractDecisions(transcript) {
  const decisions = [];
  const lines = transcript.split(/[.\n]+/);
  const decisionKeywords = /\b(decided|agreed|will|going to|approved|confirmed|resolved|concluded|determined)\b/i;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length > 20 && decisionKeywords.test(trimmed)) {
      decisions.push(trimmed);
    }
  }
  return decisions.slice(0, 10);
}

function fallbackExtractActionItems(transcript) {
  const items = [];
  const lines = transcript.split(/[.\n]+/);
  const actionKeywords = /\b(will|needs? to|should|must|has to|assigned to|action item|follow up|take care of|responsible for)\b/i;
  const namePattern = /\b([A-Z][a-z]+ [A-Z][a-z]+|[A-Z][a-z]+)\b/g;
  const datePattern = /\b(by|before|due|deadline) ([\w,]{1,20} \d{4}|\w{3,10} \d{1,2}(?:st|nd|rd|th)?|\d{4}-\d{2}-\d{2})\b/i;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length > 15 && actionKeywords.test(trimmed)) {
      const names = trimmed.match(namePattern) || [];
      const dateMatch = trimmed.match(datePattern);
      items.push({
        action: trimmed,
        assigned_to: names[0] || null,
        due_date: dateMatch ? dateMatch[2].trim() : null,
      });
    }
  }
  return items.slice(0, 10);
}

// ---------------------------------------------------------------------------
// OpenAI-powered extraction
// ---------------------------------------------------------------------------

async function extractDecisions(transcript) {
  const ai = getOpenAIClient();
  if (!ai) {
    console.warn('OPENAI_API_KEY not set — skipping decision extraction');
    return [];
  }

  try {
    const response = await ai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are an expert meeting analyst. Extract only the key decisions made in the meeting transcript. A decision is something the team agreed on or resolved. Return a JSON array of plain strings, one per decision. Return only the JSON array with no extra text.',
        },
        { role: 'user', content: `Meeting transcript:\n\n${transcript.slice(0, MAX_TRANSCRIPT_CHARS)}` },
      ],
      temperature: 0.2,
    });

    const text = response.choices[0].message.content.trim();
    const cleaned = text.replace(/^```(?:json)?|```$/g, '').trim();
    const decisions = JSON.parse(cleaned);
    return Array.isArray(decisions) ? decisions.filter((d) => typeof d === 'string') : [];
  } catch (err) {
    console.error('OpenAI extractDecisions error:', err.message);
    return fallbackExtractDecisions(transcript);
  }
}

async function extractActionItems(transcript) {
  const ai = getOpenAIClient();
  if (!ai) {
    console.warn('OPENAI_API_KEY not set — skipping action item extraction');
    return [];
  }

  try {
    const response = await ai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are an expert meeting analyst. Extract all action items from the meeting transcript. For each action item return a JSON object with fields: "action" (string — what needs to be done), "assigned_to" (string — person responsible, or null), "due_date" (string — deadline in YYYY-MM-DD or descriptive text, or null). Return a JSON array of these objects only, no extra text.',
        },
        { role: 'user', content: `Meeting transcript:\n\n${transcript.slice(0, MAX_TRANSCRIPT_CHARS)}` },
      ],
      temperature: 0.2,
    });

    const text = response.choices[0].message.content.trim();
    const cleaned = text.replace(/^```(?:json)?|```$/g, '').trim();
    const items = JSON.parse(cleaned);
    return Array.isArray(items)
      ? items.filter((i) => i && typeof i.action === 'string')
      : [];
  } catch (err) {
    console.error('OpenAI extractActionItems error:', err.message);
    return fallbackExtractActionItems(transcript);
  }
}

/**
 * Answer a natural-language question using transcript content.
 * @param {string} question
 * @param {Array<{title: string, content: string}>} transcripts
 * @returns {Promise<{answer: string, sources: Array<{transcript_title: string, excerpt: string}>}>}
 */
async function chatQuery(question, transcripts) {
  const ai = getOpenAIClient();

  if (!ai) {
    // Keyword-based fallback search when no OpenAI key is configured
    const keywords = question.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
    const sources = [];
    const matchedExcerpts = [];

    for (const transcript of transcripts) {
      const lines = transcript.content.split('\n').filter((l) => l.trim());
      for (const line of lines) {
        const lower = line.toLowerCase();
        if (keywords.some((kw) => lower.includes(kw))) {
          matchedExcerpts.push(line.trim());
          if (!sources.find((s) => s.transcript_title === transcript.title)) {
            sources.push({ transcript_title: transcript.title, excerpt: line.trim() });
          }
        }
      }
    }

    if (matchedExcerpts.length > 0) {
      return {
        answer: `Based on the transcripts, here are the relevant sections:\n\n${matchedExcerpts.slice(0, 5).join('\n')}`,
        sources,
      };
    }

    return {
      answer: 'No relevant information found in the transcripts for your question.',
      sources: [],
    };
  }

  // Build context from transcripts (trim to avoid token limits)
  const contextParts = transcripts.map((t) => {
    const snippet = t.content.slice(0, 3000);
    return `=== Transcript: "${t.title}" ===\n${snippet}`;
  });
  const context = contextParts.join('\n\n').slice(0, MAX_CONTEXT_CHARS);

  try {
    const response = await ai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are an intelligent meeting assistant. Answer questions based solely on the provided meeting transcript context. Always cite your sources by specifying which transcript the information came from and quote a brief relevant excerpt (1-2 sentences). Return a JSON object with two fields: "answer" (string) and "sources" (array of objects with "transcript_title" and "excerpt" fields). Return only the JSON object, no extra text.',
        },
        {
          role: 'user',
          content: `Meeting transcripts context:\n\n${context}\n\nQuestion: ${question}`,
        },
      ],
      temperature: 0.3,
    });

    const text = response.choices[0].message.content.trim();
    const cleaned = text.replace(/^```(?:json)?|```$/g, '').trim();
    const result = JSON.parse(cleaned);
    return {
      answer: result.answer || 'No answer found.',
      sources: Array.isArray(result.sources) ? result.sources : [],
    };
  } catch (err) {
    console.error('OpenAI chatQuery error:', err.message);
    return {
      answer: 'Sorry, I encountered an error processing your question. Please try again.',
      sources: [],
    };
  }
}

module.exports = { extractDecisions, extractActionItems, chatQuery };
