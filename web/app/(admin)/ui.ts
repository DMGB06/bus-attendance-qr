export type Tip = { text: string; top: number; quick: boolean };

let timer: ReturnType<typeof setTimeout> | undefined;
let lastHide = 0;

// La primera ayuda demora 350ms; si se acaba de cerrar otra, sale al instante.
export function showTip(el: HTMLElement, text: string, instant: boolean, set: (t: Tip) => void) {
  clearTimeout(timer);
  const quick = instant || Date.now() - lastHide < 300;
  const go = () => set({ text, top: el.getBoundingClientRect().top + el.offsetHeight / 2, quick });
  if (quick) go();
  else timer = setTimeout(go, 350);
}

export function hideTip(shown: boolean, set: (t: null) => void) {
  clearTimeout(timer);
  if (shown) lastHide = Date.now();
  set(null);
}

// Cookie no sensible: el servidor la lee para pintar el menu ya contraido, sin parpadeo.
export function saveCollapsed(collapsed: boolean) {
  document.cookie = `cb-menu=${collapsed ? 1 : 0}; path=/; max-age=31536000; samesite=lax`;
}
