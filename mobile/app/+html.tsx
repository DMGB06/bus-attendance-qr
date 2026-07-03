import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

const scrollbarCss = `
:root {
  --app-scrollbar-track: #e2e8f0;
  --app-scrollbar-thumb: #94a3b8;
  --app-scrollbar-thumb-hover: #64748b;
}
* {
  scrollbar-color: var(--app-scrollbar-thumb) var(--app-scrollbar-track);
}
*::-webkit-scrollbar {
  width: 9px;
  height: 9px;
}
*::-webkit-scrollbar-track {
  background: var(--app-scrollbar-track);
  border-radius: 10px;
}
*::-webkit-scrollbar-thumb {
  background: var(--app-scrollbar-thumb);
  border-radius: 10px;
  border: 2px solid transparent;
  background-clip: padding-box;
}
*::-webkit-scrollbar-thumb:hover {
  background: var(--app-scrollbar-thumb-hover);
  border: 2px solid transparent;
  background-clip: padding-box;
}
`;

/**
 * Plantilla HTML para web: aplica el reset de Expo (`html`/`body`/`#root` al 100% de alto).
 * Sin esto, en el navegador la app suele verse “a media pantalla” porque `flex:1` y `minHeight:'100%'`
 * no tienen un contenedor padre con altura definida.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <link rel="manifest" href="/pwa.json" />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: scrollbarCss }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
