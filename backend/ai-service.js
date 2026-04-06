// Using Google Gemini (free tier: 15 req/min, 1500 req/day)
// Get your free key at: https://aistudio.google.com

const MAX_TRANSCRIPT_CHARS = 12000;
const MAX_CONTEXT_CHARS = 14000;

async function callGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2 },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  // Strip markdown code fences if present
  return raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
}

// ---------------------------------------------------------------------------
// Fallback: keyword/regex extraction when Gemini is unavailable or errors
// ---------------------------------------------------------------------------

function fallbackExtractDecisions(transcript) {
  const decisions = [];
  const lines = transcript.split(/[\n]+/);
  const decisionKeywords = /\b(decided|agreed|approved|confirmed|resolved|concluded|final decision|we will go with|we have decided)\b/i;
  const excludeKeywords = /\b(I will|I'll|please|can you|could you|maybe|try)\b/i;

  for (const line of lines) {
    const trimmed = line.replace(/^[A-Z][a-z]+:\s*/, '').trim();
    if (trimmed.length > 20 && decisionKeywords.test(trimmed) && !excludeKeywords.test(trimmed)) {
      decisions.push(trimmed);
    }
  }
  return [...new Set(decisions)].slice(0, 10);
}

function fallbackExtractActionItems(transcript) {
  const items = [];
  const lines = transcript.split(/[\n]+/);
  const actionKeywords = /\b(I will|I'll|will handle|will prepare|will update|will complete|will coordinate|will send|will follow up|will schedule)\b/i;
  const vagueWords = /\b(maybe|try|nothing|perhaps)\b/i;
  const speakerPattern = /^([A-Z][a-z]+):\s*/;
  const datePattern = /\b(by|before|due|deadline)\s+(.+?)(\.|$)/i;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length > 15 && actionKeywords.test(trimmed) && !vagueWords.test(trimmed)) {
      const speakerMatch = trimmed.match(speakerPattern);
      const speaker = speakerMatch ? speakerMatch[1] : 'Unknown';
      let actionText = speakerMatch ? trimmed.replace(speakerPattern, '').trim() : trimmed;
      actionText = actionText.replace(/I'll|I will/gi, '').replace(/-/g, '').trim();
      const dateMatch = trimmed.match(datePattern);
      items.push({ action: actionText, assigned_to: speaker, due_date: dateMatch ? dateMatch[2].trim() : null });
    }
  }
  return items.slice(0, 10);
}

function fallbackChat(question, transcripts) {
  const qLower = question.toLowerCase();
  const sources = [];
  const isDecisionQ = /\b(decision|decided|agreed|resolve|agreed on)\b/i.test(qLower);
  const isActionQ = /\b(action|task|assigned|responsible|todo|to do|who is|who will)\b/i.test(qLower);
  const stopWords = new Set(['what','were','the','did','was','how','why','when','who','which','that','this','with','from','have','been','they','their','about','will','would','could','should','does','make','into','than','then','them','some','such','more','also','just','like','your','our','its']);

  const matchedLines = [];

  for (const transcript of transcripts) {
    const lines = transcript.content.split('\n').filter(l => l.trim());
    let added = false;

    for (const line of lines) {
      const lower = line.toLowerCase();
      let match = false;

      if (isDecisionQ && /\b(decided|agreed|approved|confirmed|we will|let's go with|final decision)\b/i.test(line)) {
        match = true;
      } else if (isActionQ && /\b(I will|I'll|will take|will handle|will coordinate|will prepare|will send|please)\b/i.test(line)) {
        match = true;
      } else {
        const keywords = qLower.split(/\W+/).filter(w => w.length > 3 && !stopWords.has(w));
        match = keywords.some(kw => lower.includes(kw));
      }

      if (match) {
        matchedLines.push(line.trim());
        if (!added) {
          sources.push({ transcript_title: transcript.title, excerpt: line.trim() });
          added = true;
        }
      }
    }
  }

  if (matchedLines.length > 0) {
    const unique = [...new Set(matchedLines)];
    return {
      answer: 'Based on the transcripts, here are the relevant findings:\n\n' + unique.slice(0, 8).join('\n\n'),
      sources,
    };
  }

  return {
    answer: 'No relevant information found in the transcripts for your question. Try rephrasing, or check that you have uploaded transcripts to this project.',
    sources: [],
  };
}

// ---------------------------------------------------------------------------
// Gemini-powered extraction (falls back automatically on any error)
// ---------------------------------------------------------------------------

async function extractDecisions(transcript) {
  if (!process.env.GEMINI_API_KEY) {
    console.warn('GEMINI_API_KEY not set — using fallback decision extraction');
    return fallbackExtractDecisions(transcript);
  }
  try {
    const prompt = `You are an expert meeting analyst. Extract only the key decisions made in the meeting transcript below.
A decision is something the team agreed on or resolved.
Return ONLY a valid JSON array of plain strings, one per decision. No explanation, no markdown, just the JSON array.

Meeting transcript:
${transcript.slice(0, MAX_TRANSCRIPT_CHARS)}`;

    const text = await callGemini(prompt);
    const decisions = JSON.parse(text);
    return Array.isArray(decisions) ? decisions.filter(d => typeof d === 'string') : [];
  } catch (err) {
    console.error('Gemini extractDecisions error:', err.message, '— falling back');
    return fallbackExtractDecisions(transcript);
  }
}

async function extractActionItems(transcript) {
  if (!process.env.GEMINI_API_KEY) {
    console.warn('GEMINI_API_KEY not set — using fallback action item extraction');
    return fallbackExtractActionItems(transcript);
  }
  try {
    const prompt = `You are an expert meeting analyst. Extract all action items from the meeting transcript below.
For each action item return a JSON object with exactly these fields:
- "action": string (what needs to be done)
- "assigned_to": string or null (person responsible)
- "due_date": string or null (deadline, or null if not mentioned)

Return ONLY a valid JSON array of these objects. No explanation, no markdown, just the JSON array.

Meeting transcript:
${transcript.slice(0, MAX_TRANSCRIPT_CHARS)}`;

    const text = await callGemini(prompt);
    const items = JSON.parse(text);
    return Array.isArray(items) ? items.filter(i => i && typeof i.action === 'string') : [];
  } catch (err) {
    console.error('Gemini extractActionItems error:', err.message, '— falling back');
    return fallbackExtractActionItems(transcript);
  }
}

async function chatQuery(question, transcripts) {
  if (!process.env.GEMINI_API_KEY) {
    console.warn('GEMINI_API_KEY not set — using fallback chat');
    return fallbackChat(question, transcripts);
  }

  const contextParts = transcripts.map(t =>
    `=== Transcript: "${t.title}" ===\n${t.content.slice(0, 3000)}`
  );
  const context = contextParts.join('\n\n').slice(0, MAX_CONTEXT_CHARS);

  try {
    const prompt = `You are an intelligent meeting assistant. Answer the question based ONLY on the transcript context provided.
Always cite which transcript your answer came from.

Return ONLY a valid JSON object with exactly these fields:
- "answer": string (your answer)
- "sources": array of objects, each with "transcript_title" (string) and "excerpt" (string)

No explanation, no markdown, just the JSON object.

Meeting transcripts:
${context}

Question: ${question}`;

    const text = await callGemini(prompt);
    const result = JSON.parse(text);
    return {
      answer: result.answer || 'No answer found.',
      sources: Array.isArray(result.sources) ? result.sources : [],
    };
  } catch (err) {
    console.error('Gemini chatQuery error:', err.message, '— falling back to keyword search');
    return fallbackChat(question, transcripts);
  }
}

module.exports = { extractDecisions, extractActionItems, chatQuery };