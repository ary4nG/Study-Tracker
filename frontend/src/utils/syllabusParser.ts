/**
 * parseSyllabus — converts raw pasted syllabus text into an array of clean topic names.
 *
 * Rules (applied in order):
 *  1. Split on newlines
 *  2. Strip leading numbered prefixes: "1." / "1)" / "1:"
 *  3. Strip leading bullet prefixes: • - * – ▪
 *  4. Trim whitespace
 *  5. Filter: min 3 chars, not ALL-CAPS-only, not ending with ":"
 */
export function parseSyllabus(text: string): string[] {
    return text
        .split('\n')
        .map((line) =>
            line
                // Strip numbered prefixes: 1. / 1) / 1: (with optional leading whitespace)
                .replace(/^\s*\d+[.):\s]+/, '')
                // Strip bullet prefixes: • - * – ▪
                .replace(/^\s*[•\-*–▪]\s*/, '')
                .trim()
        )
        .filter((line) => {
            if (line.length < 3) return false;            // too short to be a topic
            if (/^[A-Z\s\d]+$/.test(line)) return false; // ALL CAPS — likely a section header
            if (line.endsWith(':')) return false;          // section label like "Introduction:"
            return true;
        });
}
