---
title: Languages
---

# Languages

Dwains Dashboard Next follows the language selected in the Home Assistant user profile. No separate dashboard language setting is required.

## Supported Languages

This build ships English (`en`) only. Every other Home Assistant language uses the English dictionary.

## Translation Files

Translations are stored in `src/i18n/locales/en.ts`. English is the only dictionary.

Variables inside translations use braces, for example `{count}` or `{name}`. Singular and plural text uses matching `.one` and `.other` keys.

## Validate Translations

Run the translation check before building or publishing:

```bash
npm run i18n:check
```

The check fails when a language is missing a key, contains an empty value, changes required placeholders, or when the dashboard uses an unknown literal translation key.

## Add a Language

This fork does not load extra languages. Adding one means restoring a dictionary under `src/i18n/locales` and a loader in `src/i18n/index.ts`, then running `npm run i18n:check`.
