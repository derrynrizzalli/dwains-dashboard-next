# Blueprints

Blueprints let you install reusable dashboard pages and card replacements.

## Install Blueprints

1. Open the Add blueprint dialog.
2. Choose a blueprint from the gallery, paste YAML, or load from a URL.
3. Fill in the required fields.
4. Save.

The gallery only lists page blueprints and has a search field. Replace-card blueprints are assigned on the Blueprint replacements settings page.

## Page Blueprints

Page blueprints add complete pages to the More pages section.

## Replacement Blueprints

Replacement blueprints can replace generated entity cards for domains such as lights, covers or climate.

The Blueprint replacements settings page lists every domain replacement. Use the switch to turn one off for a while, the pencil to pick another blueprint or change its inputs, or the delete button to go back to the standard cards. Assign replacement opens a dialog where you filter the gallery by domain. A domain can have one replacement at a time.

## Writing Blueprints

A blueprint is YAML with a `blueprint:` section that describes the blueprint and its inputs, and a `card:` section with the card configuration. In the card, `$<input>$` is replaced by the value of that input. When a value is only a placeholder, the type of the input value is kept, so `$days$` can become the number `7`.

```yaml
blueprint:
  name: Waste collection
  name_nl: Afvalkalender
  icon: mdi:trash-can-outline
  version: 1.0.0
  type: page
  input:
    title: { name: Title, type: text-field, default: '' }
    items: { name: Waste types, type: entity-list, entity_domain: sensor, default_icon: mdi:trash-can-outline }
card:
  type: vertical-stack
  cards:
    - type: markdown
      requires_input: title
      content: "## $title$"
    - repeat: items
      template: { type: tile, entity: $item.entity$, name: $item.name$, icon: $item.icon$ }
```

### Blueprint Fields

| Field | Description |
| --- | --- |
| `name` | Name of the blueprint, also the suggested page name. |
| `name_<lang>` | Name in another language, for example `name_nl` or `name_pt-br`. |
| `description` | Short description shown in the dialog. |
| `description_<lang>` | Description in another language. |
| `icon` | Suggested page icon, for example `mdi:trash-can-outline`. |
| `version` | Version used for update checks. |
| `type` | `page` or `replace-card`. |
| `author` | Author shown in the dialog. |
| `custom_cards` | HACS cards the blueprint needs. |
| `input` | The fields the user fills in. |

The dialog uses the dashboard language. Without a translation for that language it uses the plain `name` or `description`.

### Inputs

Every input has a `type`, an optional `name`, `description` and `default`, and can have `name_<lang>` and `description_<lang>`.

| Type | Value |
| --- | --- |
| `text-field` | Text. |
| `number` | Number. |
| `boolean` | On or off. |
| `icon-picker` | An icon. |
| `area-picker` | An area id. |
| `entity-picker` | An entity id. |
| `entity-list` | A list of rows, see below. |

An `entity-picker` without `default` is required: the blueprint cannot be saved until an entity is chosen. Give it `default: ''` to make it optional. Two extra fields help users choose:

- `entity_domain: sensor` only offers entities of that domain.
- `suggest_entity: sensor.waste_paper` preselects that entity when it exists. With `entity_domain` set, `suggest_entity: waste_paper` works as well.

### Entity Lists

An `entity-list` input lets the user add, remove and reorder rows. Each row has a `name`, an `entity`, an optional `icon` and, when the card uses `$item.image$`, an optional `image`. The list starts empty and needs at least one row with an entity before the blueprint can be saved.

| Field | Description |
| --- | --- |
| `entity_domain` | Only offer entities of this domain in each row. |
| `default_icon` | Icon for rows without one. Without it rows use `mdi:shape`. |
| `add_label` | Label of the add button, also as `add_label_<lang>`. |

### Repeat

A list entry with `repeat` and `template` is replaced by one copy of the template for every row of that entity list. Rows without an entity are left out. Inside the template you can use:

| Placeholder | Value |
| --- | --- |
| `$item.name$`, `$item.entity$`, `$item.icon$`, `$item.image$` | The field of the row. Any other field of the row works the same way. |
| `$item.index$` | Position of the row, starting at 0. |
| `$item.last$` | `true` for the last row. |

`$item.index$` and `$item.last$` are a number and a boolean when they are the whole value, and text inside a longer text.

### Optional Parts

Add `requires_input: <input>` to any object in the card to leave that object out when the input is empty. Empty means no text, off, or an entity list without a row that has an entity. The `requires_input` key itself never ends up in the card.

### Entity Lists In Other Cards

- `$entities.<input>$` as the whole value gives the entities of the rows as a list without duplicates, for example for `entities:` of a glance or history card.
- `$json.<input>$` inside a text gives the rows as JSON, for cards that read data from a template.

### Translated Texts

An object with only an `i18n` key is replaced by the text for the language of the person viewing the dashboard. Without a text for that language it uses English, and otherwise the first text.

```yaml
card:
  type: markdown
  content:
    i18n:
      en: "Next collection"
      nl: "Volgende ophaling"
      de: "Nächste Abholung"
```

The texts are kept in the saved page, so every user sees their own language.

## Blueprint Gallery

The blueprint gallery is loaded from a `blueprints.json` file. Each item points to a raw blueprint YAML file.

Example:

```json
{
  "blueprints": [
    {
      "name": "Birthdays",
      "description": "Birthday page with calendar support.",
      "type": "page",
      "author": "Dwain Scheeren",
      "version": "1.0.0",
      "url": "https://raw.githubusercontent.com/example/repo/main/page.yaml"
    }
  ]
}
```
