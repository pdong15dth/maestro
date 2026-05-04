/**
 * Incremental terminal/PTY output parser.
 *
 * Maintains state across chunks so we only process new data.
 * Handles ANSI stripping, \r overwrites, \b backspaces, and TUI border cleanup.
 */

const ANSI_CSI = /\x1b\[[0-9;:?]*[a-zA-Z]/g;
const ANSI_OSC = /\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g;
const ANSI_OTHER = /\x1b[()[\]#%*+.\/=>?@\\^_{|}~0-9A-Za-z]/g;

function stripAnsiChunk(chunk: string): string {
  return chunk
    .replace(ANSI_OSC, '')
    .replace(ANSI_CSI, '')
    .replace(ANSI_OTHER, '')
    .replace(/\x1b/g, '');
}

const LEADING_BORDER = /^[\s\u2500-\u257F\-|=+]+/;
const TRAILING_BORDER = /[\s\u2500-\u257F\-|=+]+$/;
const BORDER_ONLY = /^[\s\u2500-\u257F\-|=+_*/\\·•]*$/;

export class TerminalParser {
  private lines: string[] = [];
  private currentLine = '';

  /** Process a new chunk and return the current cleaned output. */
  process(chunk: string): string {
    const clean = stripAnsiChunk(chunk);

    for (let i = 0; i < clean.length; i++) {
      const ch = clean.charCodeAt(i);

      if (ch === 10) {
        // \n — flush current line
        this.lines.push(this.currentLine);
        this.currentLine = '';
      } else if (ch === 13) {
        // \r — overwrite from start of line
        this.currentLine = '';
      } else if (ch === 8) {
        // \b — backspace
        this.currentLine = this.currentLine.slice(0, -1);
      } else {
        this.currentLine += clean[i];
      }
    }

    return this.getOutput();
  }

  /** Get cleaned output without mutating state. */
  getOutput(): string {
    const all = [...this.lines, this.currentLine];
    const out: string[] = [];
    let emptyStreak = 0;

    for (let line of all) {
      // Strip leading/trailing box-drawing chars
      line = line.replace(LEADING_BORDER, '').replace(TRAILING_BORDER, '');

      // Skip pure-border lines
      if (BORDER_ONLY.test(line)) {
        line = '';
      }

      if (line === '') {
        emptyStreak++;
        if (emptyStreak <= 2) {
          out.push(line);
        }
      } else {
        emptyStreak = 0;
        out.push(line);
      }
    }

    // Trim leading/trailing blank lines
    while (out.length && out[0] === '') out.shift();
    while (out.length && out[out.length - 1] === '') out.pop();

    return out.join('\n');
  }

  reset(): void {
    this.lines = [];
    this.currentLine = '';
  }
}
