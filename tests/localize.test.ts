import { describe, expect, it } from 'vitest';
import { loadTranslations, SUPPORTED_LANGUAGES } from '../src/i18n';
import { ddLang, ddLocale, ddLocalize, ddLocalizePlural, hasDdTranslation } from '../src/utils/localize';

const hass = (language?: string, legacyLanguage?: string) => ({
  locale: language === undefined ? undefined : { language },
  language: legacyLanguage,
});

describe('ddLang', () => {
  it.each([
    ['pt-BR', 'pt-br'],
    ['pt-br', 'pt-br'],
    ['pt_BR', 'pt-br'],
    ['de-DE', 'de'],
    ['de-CH', 'de'],
    ['nl', 'nl'],
    ['nl-BE', 'nl'],
    ['en-GB', 'en'],
    ['fr-CA', 'fr'],
    ['ru', 'ru'],
    ['zh-TW', 'zh-hant'],
    ['zh-HK', 'zh-hant'],
    ['zh-Hant', 'zh-hant'],
    ['zh-CN', 'zh-hans'],
    ['zh-Hans', 'zh-hans'],
    ['zh_CN', 'zh-hans'],
    ['xx', 'en'],
    ['', 'en'],
  ])('maps %s to %s', (language, expected) => {
    expect(ddLang(hass(language))).toBe(expected);
  });

  it('only returns supported languages', () => {
    for (const language of ['pt', 'es-MX', 'it-IT', 'sv', 'zh']) {
      expect(SUPPORTED_LANGUAGES).toContain(ddLang(hass(language)));
    }
  });

  it('prefers the user locale over the server language', () => {
    expect(ddLang(hass('de', 'nl'))).toBe('de');
    expect(ddLang(hass(undefined, 'nl'))).toBe('nl');
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
  it('falls back to English until a language is loaded', async () => {
    expect(ddLocalize(hass('fr'), 'devices.title')).toBe('Devices');
    await loadTranslations('fr');
    expect(ddLocalize(hass('fr'), 'devices.title')).toBe('Appareils');
  });

  it('translates into the active language', async () => {
    await Promise.all([loadTranslations('nl'), loadTranslations('de')]);
    expect(ddLocalize(hass('en'), 'devices.title')).toBe('Devices');
    expect(ddLocalize(hass('nl-NL'), 'devices.title')).toBe('Apparaten');
    expect(ddLocalize(hass('de'), 'devices.title')).toBe('Geräte');
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

  it('follows the plural rules of the locale', async () => {
    await Promise.all([loadTranslations('fr'), loadTranslations('ru')]);
    // French uses the singular for zero.
    const frZero = ddLocalizePlural(hass('fr'), 'common.device', 0);
    expect(frZero).toBe(ddLocalize(hass('fr'), 'common.device.one', { count: 0 }));
    expect(ddLocalizePlural(hass('ru'), 'common.device', 3)).toBe('3 устройства');
  });

  it.each([
    [0, '0 устройств'],
    [1, '1 устройство'],
    [2, '2 устройства'],
    [5, '5 устройств'],
    [11, '11 устройств'],
    [21, '21 устройство'],
    [22, '22 устройства'],
    [25, '25 устройств'],
    [101, '101 устройство'],
    [1.5, '1.5 устройства'],
  ])('uses the Russian plural form for %s devices', async (count, expected) => {
    await loadTranslations('ru');
    expect(ddLocalizePlural(hass('ru'), 'common.device', count)).toBe(expected);
  });

  it('uses Russian few and many with adjective agreement', async () => {
    await loadTranslations('ru');
    expect(ddLocalizePlural(hass('ru'), 'common.entity', 3)).toBe('3 сущности');
    expect(ddLocalizePlural(hass('ru'), 'common.person', 2)).toBe('2 человека');
    expect(ddLocalizePlural(hass('ru'), 'common.person', 5)).toBe('5 человек');
    expect(ddLocalizePlural(hass('ru'), 'status.light_on', 2)).toBe('2 включённых светильника');
    expect(ddLocalizePlural(hass('ru'), 'status.light_on', 5)).toBe('5 включённых светильников');
  });

  it('falls back to one and other when a language has no extra form', async () => {
    await loadTranslations('de');
    // Arabic resolves to the English dictionary, which only has one/other.
    expect(ddLocalizePlural(hass('ar'), 'common.device', 3)).toBe('3 devices');
    expect(ddLocalizePlural(hass('de'), 'common.device', 3)).toBe(
      ddLocalize(hass('de'), 'common.device.other', { count: 3 })
    );
  });

  it('passes extra variables along', () => {
    expect(ddLocalizePlural(hass('en'), 'common.device', 4, { count: 'four' })).toBe('four devices');
  });
});
