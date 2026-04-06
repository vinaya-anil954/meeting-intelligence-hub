const SPEAKER_COLON_RE = /^([A-Z][A-Za-z0-9 _.'-]{1,40}):\s+(.+)/;

function parseVTT(content) {
  const lines = content.split(/\r?\n/);
  const textLines = [];
  const speakerSet = new Set();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("WEBVTT")) continue;
    if (/^(NOTE|STYLE|REGION)\b/.test(trimmed)) continue;
    if (/^(Kind|Language|Position|Align|Size|Line)\s*:/i.test(trimmed)) continue;
    if (/^\d{2}:\d{2}[\d:.]+\s*-->\s*\d{2}:\d{2}/.test(trimmed)) continue;
    if (/^\d+$/.test(trimmed)) continue;

    // FIX: preserve speaker prefix so chatbot can match speaker queries
    const vTagMatch = trimmed.match(/^<v[ \t]+([^>\s][^>]{0,100})>(.*)/i);
    if (vTagMatch) {
      const speaker = vTagMatch[1].trim();
      const dialogue = vTagMatch[2].replace(/<[^>]{0,200}>/g, "").trim();
      speakerSet.add(speaker);
      if (dialogue) textLines.push(speaker + ": " + dialogue);
      continue;
    }

    const colonMatch = trimmed.match(SPEAKER_COLON_RE);
    if (colonMatch) {
      const speaker = colonMatch[1].trim();
      const dialogue = colonMatch[2].trim();
      speakerSet.add(speaker);
      if (dialogue) textLines.push(speaker + ": " + dialogue);
      continue;
    }

    const cleaned = trimmed.replace(/<[^>]{0,200}>/g, "").trim();
    if (cleaned) textLines.push(cleaned);
  }

  const text = textLines.join("\n");
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  return { text, speakers: Array.from(speakerSet), wordCount };
}

function parseTXT(content) {
  const lines = content.split(/\r?\n/);
  const speakerSet = new Set();
  const textLines = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const colonMatch = trimmed.match(SPEAKER_COLON_RE);
    if (colonMatch) speakerSet.add(colonMatch[1].trim());
    textLines.push(trimmed);
  }

  const text = textLines.join("\n");
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  return { text, speakers: Array.from(speakerSet), wordCount };
}

module.exports = { parseVTT, parseTXT };
