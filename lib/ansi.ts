import Anser from 'anser';

export const ansiToHtml = (text: string): string => {
  return Anser.ansiToHtml(text, { use_classes: true });
};

export const containsAnsi = (text: string): boolean => {
  return /\x1b\[[0-9;]*m/.test(text);
};

export const stripAnsi = (text: string): string => {
  // Strip ANSI CSI escape sequences (colors, cursor, clear, etc.)
  return text.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
};

export const normalizePtyText = (text: string): string => {
  return stripAnsi(text).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
};
