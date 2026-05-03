import Anser from 'anser';

export const ansiToHtml = (text: string): string => {
  return Anser.ansiToHtml(text, { use_classes: true });
};
