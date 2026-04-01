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
  const lines = transcript.split(/[\n]+/);
  const decisionKeywords = /\b(decided|agreed|decision made|approved|confirmed|resolved|concluded|determined|we will|let's set|the deadline)\b/i;
  const excludeKeywords = /\b(I will|I'll|he will|she will|they will|please|can you|could you)\b/i;
  for (const line of lines) {
    const trimmed = line.replace(/^[A-Z][a-z]+:\s*/, '').trim();
    if (trimmed.length > 20 && decisionKeywords.test(trimmed) && !excludeKeywords.test(trimmed)) {
      decisions.push(trimmed);
    }
  }
  return decisions.slice(0, 10);
}

function fallbackExtractActionItems(transcript) {
  const items = [];
  const lines = transcript.split(/[\n]+/);
  const actionKeywords = /\b(I will|I'll|will take|will handle|will coordinate|will prepare|will update|will set up|will complete|will run|will refactor|will investigate|will draft|please complete|please coordinate)\b/i;
  const speakerPattern = /^([A-Z][a-z]+):\s*/;
  var datePattern = /\b(?:by|before|due|deadline)\s+([\w,]{1,20}\s+\d{4}|\w{3,10}\s+\d{1,2}(?:st|nd|rd|th)?(?:\s*,?\s*\d{4})?|next\s+\w+|tomorrow\s*\w*|end of \w+|Friday|Wednesday|Monday|Tuesday|Thursday|\d{4}-\d{2}-\d{2})\b/i;

  for (const line of lines) {
    var trimmed = line.trim();
    if (trimmed.length > 15 && actionKeywords.test(trimmed)) {
      var speakerMatch = trimmed.match(speakerPattern);
      var speaker = speakerMatch ? speakerMatch[1] : null;
      var actionText = speakerMatch ? trimmed.replace(speakerPattern, '').trim() : trimmed;
      var dateMatch = trimmed.match(datePattern);
      items.push({
        action: actionText,
        assigned_to: speaker || null,
        due_date: dateMatch ? dateMatch[1].trim() : null,
      });
    }
  }
  return items.slice(0, 10);
}

// ---------------------------------------------------------------------------
// Fallback chat: smarter keyword search
// ---------------------------------------------------------------------------

function fallbackChat(question, transcripts) {
  var qLower = question.toLowerCase();
  var sources = [];

  // Detect question type
  var isDecisionQ = /\b(decision|decided|agreed|resolve)\b/i.test(qLower);
  var isActionQ = /\b(action|task|assigned|responsible|todo|to do)\b/i.test(qLower);
  var personMatch = qLower.match(/\b([A-Z][a-z]+)'?s?\b/i);

  var matchedLines = [];

  for (var t = 0; t < transcripts.length; t++) {
    var transcript = transcripts[t];
    var lines = transcript.content.split('\n').filter(function(l) { return l.trim(); });
    var added = false;

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var lower = line.toLowerCase();
      var match = false;

      if (isDecisionQ && /\b(decision made|decided|agreed|we will|let's set)\b/i.test(line)) {
        match = true;
      } else if (isActionQ && /\b(I will|I'll|will take|will handle|will coordinate|will prepare|please)\b/i.test(line)) {
        match = true;
      } else if (personMatch) {
        var person = personMatch[1].toLowerCase();
        if (lower.indexOf(person) !== -1) {
          match = true;
        }
      } else {
        // General keyword match
        var keywords = qLower.split(/\W+/).filter(function(w) { return w.length > 3; });
        for (var k = 0; k < keywords.length; k++) {
          if (lower.indexOf(keywords[k]) !== -1) {
            match = true;
            break;
          }
        }
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
    var unique = [];
    for (var j = 0; j < matchedLines.length; j++) {
      if (unique.indexOf(matchedLines[j]) === -1) {
        unique.push(matchedLines[j]);
      }
    }
    return {
      answer: 'Based on the transcripts, here are the relevant findings:\n\n' + unique.slice(0, 8).join('\n\n'),
      sources: sources,
    };
  }

  return {
    answer: 'No relevant information found in the transcripts for your question.',
    sources: [],
  };
}

// ---------------------------------------------------------------------------
// OpenAI-powered extraction
// ---------------------------------------------------------------------------

async function extractDecisions(transcript) {
  const ai = getOpenAIClient();
  if (!ai) {
    console.warn('OPENAI_API_KEY not set - using fallback decision extraction');
    return fallbackExtractDecisions(transcript);
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
        { role: 'user', content: 'Meeting transcript:\n\n' + transcript.slice(0, MAX_TRANSCRIPT_CHARS) },
      ],
      temperature: 0.2,
    });

    const text = response.choices[0].message.content.trim();
    const cleaned = text.replace(/^```(?:json)?|```$/g, '').trim();
    const decisions = JSON.parse(cleaned);
    return Array.isArray(decisions) ? decisions.filter(function(d) { return typeof d === 'string'; }) : [];
  } catch (err) {
    console.error('OpenAI extractDecisions error:', err.message);
    return fallbackExtractDecisions(transcript);
  }
}

async function extractActionItems(transcript) {
  const ai = getOpenAIClient();
  if (!ai) {
    console.warn('OPENAI_API_KEY not set - using fallback action item extraction');
    return fallbackExtractActionItems(transcript);
  }

  try {
    const response = await ai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are an expert meeting analyst. Extract all action items from the meeting transcript. For each action item return a JSON object with fields: "action" (string - what needs to be done), "assigned_to" (string - person responsible, or null), "due_date" (string - deadline in YYYY-MM-DD or descriptive text, or null). Return a JSON array of these objects only, no extra text.',
        },
        { role: 'user', content: 'Meeting transcript:\n\n' + transcript.slice(0, MAX_TRANSCRIPT_CHARS) },
      ],
      temperature: 0.2,
    });

    const text = response.choices[0].message.content.trim();
    const cleaned = text.replace(/^```(?:json)?|```$/g, '').trim();
    const items = JSON.parse(cleaned);
    return Array.isArray(items)
      ? items.filter(function(i) { return i && typeof i.action === 'string'; })
      : [];
  } catch (err) {
    console.error('OpenAI extractActionItems error:', err.message);
    return fallbackExtractActionItems(transcript);
  }
}

async function chatQuery(question, transcripts) {
  const ai = getOpenAIClient();

  if (!ai) {
    return fallbackChat(question, transcripts);
  }

  // Build context from transcripts
  const contextParts = transcripts.map(function(t) {
    const snippet = t.content.slice(0, 3000);
    return '=== Transcript: "' + t.title + '" ===\n' + snippet;
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
          content: 'Meeting transcripts context:\n\n' + context + '\n\nQuestion: ' + question,
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