import { describe, expect, it } from 'vitest';
import { loadTranslations, SUPPORTED_LANGUAGES } from '../src/i18n';
import { ddLang, ddLocale, ddLocalize, ddLocalizePlural, hasDdTranslation } from '../src/utils/localize';

const hass = (language?: string, legacyLanguage?: string) => ({
  locale: language === undefined ? undefined : { language },
  language: legacyLanguage,
});

describe('ddLang', () => {
  it.each([
    'pt-BR',
    'pt-br',
    'pt_BR',
    'de-DE',
    'de-CH',
    'nl',
    'nl-BE',
    'en',
    'en-GB',
    'fr-CA',
    'ru',
    'zh-TW',
    'zh-HK',
    'zh-Hant',
    'zh-CN',
    'zh-Hans',
    'zh_CN',
    'xx',
    '',
  ])('maps %s to English', (language) => {
    expect(ddLang(hass(language))).toBe('en');
  });

  it('only returns supported languages', () => {
    expect(SUPPORTED_LANGUAGES).toEqual(['en']);
    for (const language of ['pt', 'es-MX', 'it-IT', 'sv', 'zh', 'nl']) {
      expect(SUPPORTED_LANGUAGES).toContain(ddLang(hass(language)));
    }
  });

  it('ignores a non-English user locale and server language', () => {
    expect(ddLang(hass('de', 'nl'))).toBe('en');
    expect(ddLang(hass(undefined, 'nl'))).toBe('en');
  });

  it('falls back to English without hass', () => {
    expect(ddLang(undefined)).toBe('en');
    expect(ddLang({})).toBe('en');
  });
});

describe('ddLocale', () => {
  it('keeps the regional locale for number and plural formatting', () => {
    expect(ddLocale(hass('pt-BR'))).toBe('pt-BR');
    expect(ddLocale(undefined)).toBe('en');
  });
});

describe('ddLocalize', () => {
  it('keeps English for languages this build does not ship', async () => {
    expect(ddLocalize(hass('fr'), 'devices.title')).toBe('Devices');
    await loadTranslations('en');
    expect(ddLocalize(hass('fr'), 'devices.title')).toBe('Devices');
    expect(ddLocalize(hass('nl-NL'), 'devices.title')).toBe('Devices');
    expect(ddLocalize(hass('de'), 'devices.title')).toBe('Devices');
  });

  it('returns the key for unknown keys', () => {
    expect(ddLocalize(hass('nl'), 'does.not.exist')).toBe('does.not.exist');
    expect(hasDdTranslation('does.not.exist')).toBe(false);
    expect(hasDdTranslation('devices.title')).toBe(true);
  });

  it('replaces every occurrence of a variable', () => {
    expect(ddLocalize(hass('en'), 'common.device.other', { count: 3 })).toBe('3 devices');
  });
});

describe('ddLocalizePlural', () => {
  it('picks the English singular only for one', () => {
    expect(ddLocalizePlural(hass('en'), 'common.device', 1)).toBe('1 device');
    expect(ddLocalizePlural(hass('en'), 'common.device', 0)).toBe('0 devices');
    expect(ddLocalizePlural(hass('en'), 'common.device', 2)).toBe('2 devices');
  });

  it('uses English plural text for every locale', async () => {
    await loadTranslations('en');
    // The viewer's locale still chooses one/other. French treats zero as singular.
    expect(ddLocalizePlural(hass('fr'), 'common.device', 0)).toBe('0 device');
    expect(ddLocalizePlural(hass('ru'), 'common.device', 3)).toBe('3 devices');
    expect(ddLocalizePlural(hass('ru'), 'common.entity', 3)).toBe('3 entities');
    expect(ddLocalizePlural(hass('ru'), 'common.person', 2)).toBe('2 people');
    expect(ddLocalizePlural(hass('ru'), 'status.light_on', 5)).toBe('5 lights on');
    expect(ddLocalizePlural(hass('de'), 'common.device', 3)).toBe('3 devices');
    expect(ddLocalizePlural(hass('ar'), 'common.device', 3)).toBe('3 devices');
  });

  it('passes extra variables along', () => {
    expect(ddLocalizePlural(hass('en'), 'common.device', 4, { count: 'four' })).toBe('four devices');
  });
});
