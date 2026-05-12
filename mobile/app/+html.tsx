import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

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
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
