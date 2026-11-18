// English as it's written in Canada, made from the English text when the app starts, so new text gets it too: the US
// spellings in the app's text are swapped for Canadian ones. Left alone: names of things (Game Boy Color, the MIT
// License), placeholders ({{count}}) and markup (<1></1>), and words in quotes, which are about the word itself

const swaps: [RegExp, string][] = [
  // favourite, favourites, favourited; any case, as in "Favorites" in the menu
  [/\b(?<first>[Ff])avorit(?<ending>e|es|ed)\b/gu, '$<first>avourit$<ending>'],
  // colour, colours, coloured: only in lower case, since "Color" is part of console names
  [/\bcolor(?<ending>s|ed)?\b/gu, 'colour$<ending>'],
  [/\bcentering\b/gu, 'centring'],
  [/\banalog\b/gu, 'analogue'],
]

// What's never changed: placeholders, markup and quoted words
const untouched = /(?<kept>\{\{[^}]*\}\}|<[^>]*>|"[^"]*")/u

function swapSpellings(part: string) {
  let result = part
  for (const [from, to] of swaps) {
    result = result.replace(from, to)
  }
  return result
}

function canadianizeText(text: string) {
  return text
    .split(untouched)
    .map((part, index) => (index % 2 === 1 ? part : swapSpellings(part)))
    .join('')
}

/** The English text with Canadian spelling, key for key */
export function canadianize<T extends Record<string, string>>(english: T): T {
  return Object.fromEntries(Object.entries(english).map(([key, text]) => [key, canadianizeText(text)])) as T
}
