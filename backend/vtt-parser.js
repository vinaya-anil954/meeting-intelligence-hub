/**
 * VTT (WebVTT) Parser Utility
 * Strips headers/timestamps, extracts plain dialogue text, detects speakers.
 */

// Regex to match "Speaker Name: dialogue" — hyphen placed at end of class to avoid range interpretation
const SPEAKER_COLON_RE = /^([A-Z][A-Za-z0-9 _.'-]{1,40}):\s+(.+)/;

/**
 * Parse a WebVTT file content into plain text.
 * @param {string} content - raw VTT file content
 * @returns {{ text: string, speakers: string[], wordCount: number }}
 */
function parseVTT(content) {
  const lines = content.split(/\r?\n/);
  const textLines = [];
  const speakerSet = new Set();

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip blank lines, WEBVTT header, NOTE/STYLE/REGION blocks, Kind/Language metadata
    if (!trimmed) continue;
    if (trimmed.startsWith('WEBVTT')) continue;
    if (/^(NOTE|STYLE|REGION)\b/.test(trimmed)) continue;
    if (/^(Kind|Language|Position|Align|Size|Line)\s*:/i.test(trimmed)) continue;

    // Skip timestamp lines like "00:00:01.000 --> 00:00:05.000"
    if (/^\d{2}:\d{2}[\d:.]+\s*-->\s*\d{2}:\d{2}/.test(trimmed)) continue;

    // Skip pure numeric sequence numbers (cue identifiers)
    if (/^\d+$/.test(trimmed)) continue;

    // Extract speaker from "<v Speaker Name>dialogue" pattern (WebVTT voice span)
    const vTagMatch = trimmed.match(/^<v[ \t]+([^>\s][^>]{0,100})>(.*)/i);
    if (vTagMatch) {
      const speaker = vTagMatch[1].trim();
      const dialogue = vTagMatch[2].replace(/<[^>]{0,200}>/g, '').trim();
      speakerSet.add(speaker);
      if (dialogue) textLines.push(dialogue);
      continue;
    }

    // Extract speaker from "Speaker Name: dialogue" pattern
    const colonMatch = trimmed.match(SPEAKER_COLON_RE);
    if (colonMatch) {
      const speaker = colonMatch[1].trim();
      const dialogue = colonMatch[2].trim();
      speakerSet.add(speaker);
      if (dialogue) textLines.push(dialogue);
      continue;
    }

    // Strip any remaining inline VTT tags (<c>, <b>, timestamps, etc.)
    const cleaned = trimmed.replace(/<[^>]{0,200}>/g, '').trim();
    if (cleaned) textLines.push(cleaned);
  }

  const text = textLines.join(' ');
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  return {
    text,
    speakers: Array.from(speakerSet),
    wordCount,
  };
}

/**
 * Parse a plain .txt transcript.
 * Detects speakers using "Name: dialogue" patterns.
 * @param {string} content
 * @returns {{ text: string, speakers: string[], wordCount: number }}
 */
function parseTXT(content) {
  const lines = content.split(/\r?\n/);
  const speakerSet = new Set();
  const textLines = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const colonMatch = trimmed.match(SPEAKER_COLON_RE);
    if (colonMatch) {
      speakerSet.add(colonMatch[1].trim());
    }
    textLines.push(trimmed);
  }

  const text = textLines.join(' ');
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  return {
    text,
    speakers: Array.from(speakerSet),
    wordCount,
  };
}

module.exports = { parseVTT, parseTXT };
