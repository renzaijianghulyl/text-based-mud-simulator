type ParsedDialogueMsg = {
  role: 'user' | 'dialogue';
  text: string;
  speaker?: string;
};

const SPEAKER_LINE_RE = /^([^:]{1,20})\s*:\s*(.+)$/;

export function parseDialogues(dialogueText: string, npcName: string): ParsedDialogueMsg[] {
  try {
    const lines = dialogueText.split('\n');
    const messages: ParsedDialogueMsg[] = [];

    for (const rawLine of lines) {
      const normalized = rawLine.trim().replace(/：/g, ':');
      if (!normalized) continue;

      const match = normalized.match(SPEAKER_LINE_RE);
      if (!match) {
        messages.push({ role: 'dialogue', text: normalized, speaker: npcName });
        continue;
      }

      const speaker = match[1].trim();
      const content = match[2].trim();
      if (!content) continue;

      if (speaker === '你') {
        messages.push({ role: 'user', text: content });
      } else if (speaker === npcName) {
        messages.push({ role: 'dialogue', text: content, speaker });
      } else {
        messages.push({ role: 'dialogue', text: content, speaker: npcName });
      }
    }

    if (messages.length === 0) {
      return [{ role: 'dialogue', text: dialogueText, speaker: npcName }];
    }

    return messages;
  } catch (error) {
    console.warn('[parseDialogues] parse failed, fallback to single dialogue', error);
    return [{ role: 'dialogue', text: dialogueText, speaker: npcName }];
  }
}
