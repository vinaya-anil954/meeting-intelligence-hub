const OpenAI = require('openai');

const MAX_TRANSCRIPT_CHARS = 12000;
const MAX_CONTEXT_CHARS = 14000;

// 🚨 DISABLE AI (fix Gemini/OpenAI issues)
const USE_AI = false;

let openaiClient = null;

function getOpenAIClient() {
  if (!openaiClient && process.env.OPENAI_API_KEY && USE_AI) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

// ---------------------------------------------------------------------------
// CLEAN FALLBACK DECISION EXTRACTION
// ---------------------------------------------------------------------------

function fallbackExtractDecisions(transcript) {
  const decisions = [];
  const lines = transcript.split(/[\n]+/);

  const decisionKeywords = /\b(decided|agreed|approved|confirmed|resolved|final decision)\b/i;
  const excludeKeywords = /\b(I will|I'll|maybe|try|please|can you|could you)\b/i;

  for (const line of lines) {
    const trimmed = line.replace(/^[A-Z][a-z]+:\s*/, '').trim();

    if (
      trimmed.length > 20 &&
      decisionKeywords.test(trimmed) &&
      !excludeKeywords.test(trimmed)
    ) {
      decisions.push(trimmed);
    }
  }

  return [...new Set(decisions)];
}

// ---------------------------------------------------------------------------
// CLEAN FALLBACK ACTION EXTRACTION
// ---------------------------------------------------------------------------

function fallbackExtractActionItems(transcript) {
  const items = [];
  const lines = transcript.split(/[\n]+/);

  const actionKeywords = /\b(I will|I'll|will handle|will prepare|will update|will complete|will coordinate)\b/i;
  const vagueWords = /\b(maybe|try|nothing|perhaps)\b/i;

  const speakerPattern = /^\[(.*?)\]/;
  const datePattern = /\b(by|before|due|deadline)\s+(.+?)\b/i;

  for (const line of lines) {
    let trimmed = line.trim();

    if (
      trimmed.length > 15 &&
      actionKeywords.test(trimmed) &&
      !vagueWords.test(trimmed)
    ) {
      const speakerMatch = trimmed.match(speakerPattern);
      const speaker = speakerMatch
        ? speakerMatch[1].replace(":", "").trim()
        : "Unknown";

      let actionText = trimmed
        .replace(/\[.*?\]/, "")
        .replace(/I'll|I will/gi, "")
        .trim();

      const dateMatch = trimmed.match(datePattern);

      items.push({
        action: actionText,
        assigned_to: speaker,
        due_date: dateMatch ? dateMatch[2].trim() : null
      });
    }
  }

  return items.filter(a => a.action && a.action.length > 5);
}

// ---------------------------------------------------------------------------
// EXTRACTION FUNCTIONS (FORCE FALLBACK)
// ---------------------------------------------------------------------------

async function extractDecisions(transcript) {
  return fallbackExtractDecisions(transcript);
}

async function extractActionItems(transcript) {
  return fallbackExtractActionItems(transcript);
}

// ---------------------------------------------------------------------------
// IMPROVED FALLBACK CHAT
// ---------------------------------------------------------------------------

function fallbackChat(question, transcripts) {
  const qLower = question.toLowerCase();
  const sources = [];
  const matchedLines = [];

  for (const transcript of transcripts) {
    const lines = transcript.content.split('\n').filter(l => l.trim());

    for (const line of lines) {
      const lower = line.toLowerCase();

      if (lower.includes(qLower.split(" ")[0])) {
        matchedLines.push(line.trim());
        sources.push({
          transcript_title: transcript.title,
          excerpt: line.trim()
        });
      }
    }
  }

  if (matchedLines.length > 0) {
    return {
      answer: 'Relevant findings:\n\n' + [...new Set(matchedLines)].slice(0, 5).join('\n\n'),
      sources
    };
  }

  return {
    answer: 'No relevant information found.',
    sources: []
  };
}

// ---------------------------------------------------------------------------
// CHAT FUNCTION
// ---------------------------------------------------------------------------

async function chatQuery(question, transcripts) {
  return fallbackChat(question, transcripts);
}

// ---------------------------------------------------------------------------

module.exports = {
  extractDecisions,
  extractActionItems,
  chatQuery
};