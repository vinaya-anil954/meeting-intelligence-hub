async function extractDecisions(transcript) {
  // Keyword-based extraction with fallback patterns
  const keywords = ['decided', 'agreed', 'approved', 'will use', 'will implement', 'will go with', 'concluded', 'resolved', 'committed to'];
  const sentences = transcript.split(/[.!?\n]/).map((s) => s.trim()).filter((s) => s.length > 10);
  const extracted = sentences
    .filter((s) => keywords.some((k) => s.toLowerCase().includes(k)))
    .slice(0, 10)
    .map((s) => ({ text: s, confidence: 0.75 }));

  if (extracted.length === 0) {
    // Fallback: pick sentences that look like decisions
    return sentences
      .filter((s) => s.length > 20 && s.length < 200)
      .slice(0, 5)
      .map((s) => ({ text: s, confidence: 0.5 }));
  }

  return extracted;
}

async function extractActionItems(transcript) {
  // Keyword-based extraction
  const keywords = ['will ', 'needs to', 'need to', 'should ', 'must ', 'action item', 'task:', 'to-do', 'follow up', 'responsible for', 'assigned to'];
  const sentences = transcript.split(/[.!?\n]/).map((s) => s.trim()).filter((s) => s.length > 10);
  const extracted = sentences
    .filter((s) => keywords.some((k) => s.toLowerCase().includes(k)))
    .slice(0, 10)
    .map((s) => {
      // Try to extract assignee from patterns like "John will..." or "assigned to Sarah"
      const assigneeMatch = s.match(/([A-Z][a-z]+)\s+will\s|assigned to\s+([A-Z][a-z]+)/);
      const assignedTo = assigneeMatch ? (assigneeMatch[1] || assigneeMatch[2]) : 'TBD';
      return { action: s, assignedTo, dueDate: null, confidence: 0.7 };
    });

  if (extracted.length === 0) {
    return sentences
      .filter((s) => s.length > 20 && s.length < 200)
      .slice(0, 3)
      .map((s) => ({ action: s, assignedTo: 'TBD', dueDate: null, confidence: 0.4 }));
  }

  return extracted;
}

async function askChatbot(question, context) {
  // Keyword-based Q&A without external API dependency
  const lowerQuestion = question.toLowerCase();
  const lowerContext = context.toLowerCase();

  if (lowerQuestion.includes('decision') || lowerQuestion.includes('decided')) {
    const lines = context.split('\n').filter((l) =>
      ['decided', 'agreed', 'approved', 'will use', 'will implement'].some((k) => l.toLowerCase().includes(k))
    );
    if (lines.length > 0) {
      return `Based on the transcripts, the following decisions were made:\n\n${lines.slice(0, 5).join('\n')}`;
    }
  }

  if (lowerQuestion.includes('action') || lowerQuestion.includes('task') || lowerQuestion.includes('todo')) {
    const lines = context.split('\n').filter((l) =>
      ['will ', 'needs to', 'should ', 'assigned to'].some((k) => l.toLowerCase().includes(k))
    );
    if (lines.length > 0) {
      return `Action items found in the transcripts:\n\n${lines.slice(0, 5).join('\n')}`;
    }
  }

  if (lowerQuestion.includes('sentiment') || lowerQuestion.includes('mood') || lowerQuestion.includes('tone')) {
    return 'Please check the Sentiment Analysis tab for detailed mood and tone charts across the meeting transcripts.';
  }

  // Generic search: find lines containing question keywords
  const keywords = question.split(/\s+/).filter((w) => w.length > 3);
  const relevantLines = context
    .split('\n')
    .filter((line) => keywords.some((kw) => line.toLowerCase().includes(kw.toLowerCase())))
    .slice(0, 5);

  if (relevantLines.length > 0) {
    return `Here is what I found related to "${question}":\n\n${relevantLines.join('\n')}`;
  }

  if (!lowerContext.trim()) {
    return 'No transcripts are available yet. Please upload some meeting transcripts first.';
  }

  return `I couldn't find specific information about "${question}" in the uploaded transcripts. Try rephrasing your question or check the Decisions and Action Items tabs for structured data.`;
}

module.exports = { extractDecisions, extractActionItems, askChatbot };