# Module glossaries

Each subject on `steam-lessons.html#module-…` has a native collapsed glossary panel after its chapter list. The glossary includes the whole shelf, regardless of grade and search filters. Readers can search terms, aliases, and definitions, and follow links to the lessons using a term.

The normal site build and distribution build regenerate the glossary automatically. Run `npm run build:module-glossaries` after changing lesson text, module lesson links, or glossary dictionaries. Run `npm run check:module-glossaries` to detect stale output; this also runs in `npm run quality`.

The generator reads every lesson tile in each module, matches shared dictionary terms using lesson contexts, includes specialist dictionaries referenced by lessons, and extracts local vocabulary lists/cards. It also reads text strings and explicit glossary markup in lesson scripts. Bible pathway lessons are selected by their page's lesson ID from the shared renderer's data. Definitions with distinct meanings remain separate entries. No automatic-marking term limit is applied.

Add new terminology and definitions to the appropriate `data/*-glossary.json`, or a lesson vocabulary list, then regenerate. The generator aggregates authored vocabulary; it does not invent definitions for words without a dictionary entry or local vocabulary definition. `data/bible-glossary.json` supplies the Bible module's subject vocabulary.
