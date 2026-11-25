import { readdir, readFile } from 'node:fs/promises';

export const locales = Object.fromEntries(await Promise.all((await readdir(new URL('./locales/', import.meta.url))).filter(file => file.endsWith('.json') && file !== 'stremio-languages.json').map(async file => [file.slice(0, -5), JSON.parse(await readFile(new URL(`./locales/${file}`, import.meta.url), 'utf8'))])));
const aliases = { ar: 'ar-AR', be: 'be-BY', bg: 'bg-BG', bn: 'bn-BD', ca: 'ca-ES', cs: 'cs-CZ', da: 'da-DK', de: 'de-DE', el: 'el-GR', en: 'en-US', eo: 'eo-EO', es: 'es-ES', et: 'et-EE', eu: 'eu-ES', fa: 'fa-IR', fi: 'fi-FI', fr: 'fr-FR', he: 'he-IL', hi: 'hi-IN', hr: 'hr-HR', hu: 'hu-HU', id: 'id-ID', it: 'it-IT', ja: 'ja-JP', ko: 'ko-KR', lt: 'lt-LT', mk: 'mk-MK', my: 'my-BM', nb: 'nb-NO', ne: 'ne-NP', nl: 'nl-NL', nn: 'nn-NO', pa: 'pa-IN', pl: 'pl-PL', pt: 'pt-BR', ro: 'ro-RO', ru: 'ru-RU', sk: 'sk-SK', sl: 'sl-SL', sr: 'sr-RS', sv: 'sv-SE', ta: 'ta-IN', te: 'te-IN', tr: 'tr-TR', uk: 'uk-UA', ur: 'ur-PK', vi: 'vi-VN', zh: 'zh-CN' };

export function languageCode(value = 'en-US') {
  for (const candidate of String(value).split(',')) {
    const code = candidate.split(';')[0].trim().replaceAll('_', '-');
    const exact = Object.keys(locales).find(locale => locale.toLowerCase() === code.toLowerCase());
    const match = exact || aliases[code.toLowerCase().split('-')[0]];
    if (locales[match]) return match;
  }
  return 'en-US';
}

export const translation = value => locales[languageCode(value)];
export const direction = value => /^(ar|fa|he|ur)-/.test(languageCode(value)) ? 'rtl' : 'ltr';

// New controls fall back to English until community translations are available.
export function downloadText(language) {
  return languageCode(language).startsWith('pt-') ? {
    actions: 'Ações', manage: 'Parar download…', stopped: 'Parado', title: 'Parar este torrent',
    explanation: 'Todos os arquivos abaixo pertencem ao mesmo torrent. Feche a reprodução em todos os dispositivos antes de parar.',
    keep: 'Parar e manter arquivos', remove: 'Parar e excluir arquivos', cancel: 'Cancelar',
    warning: 'Excluir remove todos os arquivos deste torrent do cache. Será necessário baixá-los novamente.',
    kept: 'Download parado. Arquivos mantidos; reproduza novamente para retomar.', deleted: 'Torrent e arquivos removidos do cache.',
    activeDownload: 'Este torrent está em reprodução. Feche o vídeo em todos os dispositivos e tente novamente.',
    invalidAction: 'Ação inválida ou não autorizada. Abra o painel e tente novamente.',
    downloadMissing: 'Download não encontrado.', changesFailed: 'Não foi possível atualizar o download. Tente novamente.'
  } : {
    actions: 'Actions', manage: 'Stop download…', stopped: 'Stopped', title: 'Stop this torrent',
    explanation: 'All files below belong to the same torrent. Close playback on every device before stopping it.',
    keep: 'Stop and keep files', remove: 'Stop and delete files', cancel: 'Cancel',
    warning: 'Deleting removes every cached file for this torrent. You will need to download them again.',
    kept: 'Download stopped. Files kept; play again to resume.', deleted: 'Torrent and cached files removed.',
    activeDownload: 'This torrent is playing. Close the video on every device and try again.',
    invalidAction: 'Invalid or unauthorized action. Open the dashboard and try again.',
    downloadMissing: 'Download not found.', changesFailed: 'Could not update this download. Please try again.'
  };
}
