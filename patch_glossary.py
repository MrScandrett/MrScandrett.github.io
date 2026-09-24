import json

file_path = '/home/evanscandrett/Projects/MrScandrett.github.io/data/glossary.json'

with open(file_path, 'r') as f:
    data = json.load(f)

new_terms = [
    {
      "term": "node",
      "aliases": ["nodes"],
      "pronunciation": "nohd",
      "ipa": "/noʊd/",
      "definition": "A single point in a game tree, representing one specific board state at a particular moment in time."
    },
    {
      "term": "depth",
      "pronunciation": "depth",
      "ipa": "/dɛpθ/",
      "definition": "How many turns ahead an AI calculates. A depth of 1 looks only at the immediate next move."
    },
    {
      "term": "branching factor",
      "pronunciation": "BRANCH-ing FAK-ter",
      "ipa": "/ˈbræntʃɪŋ ˈfæktər/",
      "definition": "The number of legal moves available from a given position. Higher branching factors make games harder for AI to calculate fully."
    },
    {
      "term": "terminal state",
      "aliases": ["terminal scoring", "terminal states", "terminal"],
      "pronunciation": "TER-min-ul stayt",
      "ipa": "/ˈtɜrmɪnəl steɪt/",
      "definition": "An end-game scenario (win, loss, or draw) where the game tree stops growing and is assigned a fixed score."
    },
    {
      "term": "game tree",
      "aliases": ["game trees"],
      "pronunciation": "gaym tree",
      "ipa": "/ɡeɪm tri/",
      "definition": "A vast, branching mathematical map of every possible future sequence of moves."
    },
    {
      "term": "pruning",
      "aliases": ["alpha-beta pruning"],
      "pronunciation": "PROON-ing",
      "ipa": "/ˈpruːnɪŋ/",
      "definition": "An optimization technique that skips evaluating branches of the game tree if the AI has already found a provably better move elsewhere."
    },
    {
      "term": "recursion",
      "aliases": ["recursive"],
      "pronunciation": "ri-KUR-zhun",
      "ipa": "/rɪˈkɜːrʒən/",
      "definition": "A programming technique where a function repeatedly calls itself to break down complex problems into simpler ones."
    },
    {
      "term": "minimax",
      "pronunciation": "MIN-ee-maks",
      "ipa": "/ˈmɪnimæks/",
      "definition": "A decision rule used in artificial intelligence and game theory for minimizing the possible loss for a worst case scenario."
    }
]

data['terms'].extend(new_terms)

# sort alphabetically
data['terms'].sort(key=lambda x: x['term'].lower())

with open(file_path, 'w') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

