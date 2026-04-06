// Using Groq API (completely free, no billing required)
// Get your free key at: https://console.groq.com

const MAX_TRANSCRIPT_CHARS = 12000;
const MAX_CONTEXT_CHARS = 14000;

async function callGroq(systemPrompt, userPrompt) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.1,
      max_tokens: 2048,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content || '';
  return raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
}

// ---------------------------------------------------------------------------
// Fallback keyword extraction
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
  const isDecisionQ = /\b(decision|decided|agreed|resolve)\b/i.test(qLower);
  const isActionQ = /\b(action|task|assigned|responsible|who will|who is)\b/i.test(qLower);
  const stopWords = new Set(['what','were','the','did','was','how','why','when','who','which','that','this','with','from','have','been','they','their','about','will','would','could','should','does','make','into','than','then','them','some','such','more','also','just','like','your','our','our','its']);
  const matchedLines = [];
  for (const transcript of transcripts) {
    const lines = transcript.content.split('\n').filter(l => l.trim());
    let added = false;
    for (const line of lines) {
      const lower = line.toLowerCase();
      let match = false;
      if (isDecisionQ && /\b(decided|agreed|approved|confirmed|we will|final decision)\b/i.test(line)) match = true;
      else if (isActionQ && /\b(I will|I'll|will handle|will prepare|will send|please)\b/i.test(line)) match = true;
      else {
        const keywords = qLower.split(/\W+/).filter(w => w.length > 3 && !stopWords.has(w));
        match = keywords.some(kw => lower.includes(kw));
      }
      if (match) {
        matchedLines.push(line.trim());
        if (!added) { sources.push({ transcript_title: transcript.title, excerpt: line.trim() }); added = true; }
      }
    }
  }
  if (matchedLines.length > 0) {
    const unique = [...new Set(matchedLines)];
    return { answer: 'Based on the transcripts, here are the relevant findings:\n\n' + unique.slice(0, 8).join('\n\n'), sources };
  }
  return { answer: 'No relevant information found in the transcripts for your question. Try rephrasing.', sources: [] };
}

// ---------------------------------------------------------------------------
// Groq-powered extraction
// ---------------------------------------------------------------------------

async function extractDecisions(transcript) {
  if (!process.env.GROQ_API_KEY) {
    console.warn('GROQ_API_KEY not set — using fallback');
    return fallbackExtractDecisions(transcript);
  }
  try {
    const system = `You are an expert meeting analyst extracting DECISIONS from meeting transcripts.

DEFINITION: A decision is something the team formally agreed on or concluded — not suggestions, not action items, not opinions.

INSTRUCTIONS:
- Find EVERY decision in the transcript — do not miss any
- Write each as a clean standalone sentence (10-20 words)
- Start each with a verb or noun — NEVER with speaker names, "Decision made", "We agreed", "Also", etc.
- Strip all filler phrases completely
- Each decision must be self-contained and clear

GOOD examples:
["The mobile app launch was postponed to Q4.", "Travel budget was reduced by 30%.", "API redesign was prioritized for Q3.", "A staged rollout approach was chosen over a big bang deployment."]

BAD examples (do NOT do this):
["Also, we agreed to cut the travel budget by 30 percent. No more unnecessary conferences.", "Decision made - delay launch"]

Return ONLY a valid JSON array of strings. No markdown, no explanation.`;

    const user = 'Extract ALL decisions from this transcript:\n\n' + transcript.slice(0, MAX_TRANSCRIPT_CHARS);
    const text = await callGroq(system, user);
    const decisions = JSON.parse(text);
    return Array.isArray(decisions) ? decisions.filter(d => typeof d === 'string' && d.length > 10) : [];
  } catch (err) {
    console.error('Groq extractDecisions error:', err.message, '— falling back');
    return fallbackExtractDecisions(transcript);
  }
}

async function extractActionItems(transcript) {
  if (!process.env.GROQ_API_KEY) {
    console.warn('GROQ_API_KEY not set — using fallback');
    return fallbackExtractActionItems(transcript);
  }
  try {
    const system = `You are an expert meeting analyst extracting ACTION ITEMS from meeting transcripts.

DEFINITION: An action item is a specific task that a named person committed to completing.

INSTRUCTIONS:
- Find EVERY action item — do not miss any
- "action": Start with a verb. Write the task clearly and concisely. NEVER include praise like "Great decision.", "That's brilliant.", commentary, or speaker names in the action text
- "assigned_to": First name of the responsible person only (or null if unknown)
- "due_date": The deadline exactly as mentioned e.g. "October 1st", "next Friday", "by end of week" (or null if not mentioned)

GOOD example:
[
  {"action": "Prepare revised budget proposal", "assigned_to": "James", "due_date": "October 1st"},
  {"action": "Draft hiring justification document", "assigned_to": "James", "due_date": "next Friday"},
  {"action": "Coordinate with HR to fast-track recruitment", "assigned_to": "Anna", "due_date": "October 15th"},
  {"action": "Update the travel policy", "assigned_to": "Anna", "due_date": "next week"}
]

BAD example (do NOT do this):
[{"action": "Great decision. prepare the revised budget proposal by October 1st.", "assigned_to": "James", "due_date": "October"}]

Return ONLY a valid JSON array. No markdown, no explanation.`;

    const user = 'Extract ALL action items from this transcript:\n\n' + transcript.slice(0, MAX_TRANSCRIPT_CHARS);
    const text = await callGroq(system, user);
    const items = JSON.parse(text);
    return Array.isArray(items) ? items.filter(i => i && typeof i.action === 'string' && i.action.length > 5) : [];
  } catch (err) {
    console.error('Groq extractActionItems error:', err.message, '— falling back');
    return fallbackExtractActionItems(transcript);
  }
}

async function chatQuery(question, transcripts) {
  if (!process.env.GROQ_API_KEY) {
    console.warn('GROQ_API_KEY not set — using fallback chat');
    return fallbackChat(question, transcripts);
  }

  const contextParts = transcripts.map(t =>
    `=== Transcript: "${t.title}" ===\n${t.content.slice(0, 3000)}`
  );
  const context = contextParts.join('\n\n').slice(0, MAX_CONTEXT_CHARS);

  try {
    const system = `You are an intelligent meeting assistant. Answer the user's question based ONLY on the provided meeting transcripts.

INSTRUCTIONS:
- Give a clear, well-written summarized answer — do NOT dump raw transcript lines
- If asking about decisions: summarize what was decided and why
- If asking about a person: summarize their specific contributions and concerns
- If asking about action items: list them clearly with owner and deadline
- Cite which transcript(s) the answer comes from
- Keep answer to 3-5 sentences max

Return ONLY this exact JSON format:
{"answer": "your clear answer here", "sources": [{"transcript_title": "filename", "excerpt": "one short relevant quote"}]}

No markdown outside JSON, no explanation, just the JSON object.`;

    const user = `Transcripts:\n\n${context}\n\nQuestion: ${question}`;
    const text = await callGroq(system, user);
    const result = JSON.parse(text);
    return {
      answer: result.answer || 'No answer found.',
      sources: Array.isArray(result.sources) ? result.sources : [],
    };
  } catch (err) {
    console.error('Groq chatQuery error:', err.message, '— falling back');
    return fallbackChat(question, transcripts);
  }
}

module.exports = { extractDecisions, extractActionItems, chatQuery };