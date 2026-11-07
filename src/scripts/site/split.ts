/**
 * Découpe un titre en lettres animables, sans casser :
 * - l'accessibilité : le titre garde son texte via aria-label, les morceaux sont aria-hidden ;
 * - la césure : un trait d'union conditionnel (&shy;) coupe le mot en deux « mots » insécables ;
 *   la ligne peut se couper entre eux, et un tiret (lettre animée elle aussi) n'est affiché
 *   que si la coupure a réellement lieu (recalculé au redimensionnement) ;
 * - les éléments internes (<mark>, <br>) : on découpe leurs nœuds texte sur place.
 * Chaque mot est un masque (overflow hidden) : les lettres montent depuis l'intérieur.
 */
const SHY = '\u00AD';
const tracked = new Set<HTMLElement>();
let resizeBound = false;

/** Affiche le tiret d'un mot coupé seulement si la suite est passée à la ligne. */
function fixHyphens(el: HTMLElement): void {
  el.querySelectorAll<HTMLElement>('.split-hyphen').forEach((h) => {
    h.style.display = 'none';
    const word = h.parentElement!;
    const next = word.nextElementSibling as HTMLElement | null;
    if (next && word.offsetTop < next.offsetTop - 2) h.style.display = '';
  });
}

export function splitChars(el: HTMLElement): HTMLElement[] {
  if (el.dataset.split === 'chars') return Array.from(el.querySelectorAll<HTMLElement>('.split-char'));
  el.setAttribute('aria-label', (el.textContent ?? '').replace(new RegExp(SHY, 'g'), '').replace(/\s+/g, ' ').trim());
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  for (const node of nodes) {
    const frag = document.createDocumentFragment();
    (node.data.match(/\s+|[^\s]+/g) ?? []).forEach((token) => {
      if (/^\s+$/.test(token)) return void frag.append(document.createTextNode(' '));
      const parts = token.split(SHY);
      parts.forEach((part, i) => {
        const word = document.createElement('span');
        word.className = 'split-word';
        word.setAttribute('aria-hidden', 'true');
        for (const ch of part) {
          const c = document.createElement('span');
          c.className = 'split-char';
          c.textContent = ch;
          word.append(c);
        }
        if (i < parts.length - 1) {
          const h = document.createElement('span');
          h.className = 'split-char split-hyphen';
          h.textContent = '-';
          word.append(h);
        }
        frag.append(word);
      });
    });
    node.replaceWith(frag);
  }
  el.dataset.split = 'chars';
  fixHyphens(el);
  tracked.add(el);
  if (!resizeBound) {
    resizeBound = true;
    window.addEventListener('resize', () => tracked.forEach((t) => (t.isConnected ? fixHyphens(t) : tracked.delete(t))));
  }
  void document.fonts?.ready.then(() => fixHyphens(el));
  return Array.from(el.querySelectorAll<HTMLElement>('.split-char'));
}
