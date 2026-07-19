export interface ParsedICSEvent {
  title: string;
  start: string;
  end: string;
  description?: string;
  location?: string;
}

export function parseICS(icsText: string): ParsedICSEvent[] {
  const events: ParsedICSEvent[] = [];
  const lines = icsText.split(/\r?\n/);
  let currentEvent: Partial<ParsedICSEvent> | null = null;
  let inEvent = false;

  const parseDate = (val: string): string => {
    const cleanVal = val.trim();
    
    // Format: YYYYMMDDTHHmmssZ or YYYYMMDDTHHmmss
    if (cleanVal.length >= 15 && cleanVal.includes("T")) {
      const y = cleanVal.substring(0, 4);
      const m = cleanVal.substring(4, 6);
      const d = cleanVal.substring(6, 8);
      const h = cleanVal.substring(9, 11);
      const min = cleanVal.substring(11, 13);
      const s = cleanVal.substring(13, 15);
      return `${y}-${m}-${d}T${h}:${min}:${s}`;
    }
    
    // Format: YYYYMMDD
    if (cleanVal.length === 8) {
      const y = cleanVal.substring(0, 4);
      const m = cleanVal.substring(4, 6);
      const d = cleanVal.substring(6, 8);
      return `${y}-${m}-${d}T09:00:00`; // Default start time
    }
    
    return cleanVal;
  };

  for (let line of lines) {
    line = line.trim();
    if (line === "BEGIN:VEVENT") {
      inEvent = true;
      currentEvent = {};
    } else if (line === "END:VEVENT" && inEvent && currentEvent) {
      if (currentEvent.title && currentEvent.start && currentEvent.end) {
        events.push(currentEvent as ParsedICSEvent);
      }
      inEvent = false;
      currentEvent = null;
    } else if (inEvent && currentEvent) {
      const colonIndex = line.indexOf(":");
      if (colonIndex > -1) {
        const key = line.substring(0, colonIndex);
        const val = line.substring(colonIndex + 1);

        if (key.startsWith("SUMMARY")) {
          currentEvent.title = val;
        } else if (key.startsWith("DTSTART")) {
          currentEvent.start = parseDate(val);
        } else if (key.startsWith("DTEND")) {
          currentEvent.end = parseDate(val);
        } else if (key.startsWith("DESCRIPTION")) {
          currentEvent.description = val.replace(/\\n/g, "\n");
        } else if (key.startsWith("LOCATION")) {
          currentEvent.location = val;
        }
      }
    }
  }

  return events;
}
