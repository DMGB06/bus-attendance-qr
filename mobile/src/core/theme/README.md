# Sistema de diseño (tema)

Guía para aplicar estilos sin valores hardcodeados.

## Flujo en componentes

```tsx
const { colors, tokens } = useAppTheme();

const styles = useMemo(
  () =>
    StyleSheet.create({
      title: {
        ...tokens.typography.title1,
        color: colors.textTitle,
      },
      card: {
        padding: tokens.spacing.lg,
        borderRadius: tokens.radius.xl,
        backgroundColor: colors.surfaceCard,
        borderColor: colors.surfaceCardBorder,
      },
    }),
  [colors, tokens],
);
```

## Qué token usar

| Necesidad | Token |
|-----------|-------|
| Título de pantalla | `tokens.typography.display` o `title1` |
| Subtítulo | `tokens.typography.body` + `colors.textMuted` |
| Texto de tarjeta | `tokens.typography.headline` + `colors.textTitle` |
| Texto secundario | `tokens.typography.caption` + `colors.textMuted` |
| Badge / overline | `tokens.typography.overline` |
| Padding pequeño | `tokens.spacing.sm` (8) |
| Padding medio | `tokens.spacing.md` (12) |
| Padding grande | `tokens.spacing.lg` (16) / `xl` (24) |
| Radio de tarjeta | `tokens.radius.xl` (22) o `2xl` (28) |
| Píldora / círculo | `tokens.radius.full` |
| Fondo de pantalla | `colors.screenSolid` |
| Tarjeta | `colors.surfaceCard` + `colors.surfaceCardBorder` |
| Botón primario | `colors.primaryPressed` |
| Advertencia | `colors.feedbackWarningBg` / `feedbackWarningTitle` |
| Escáner | `colors.scanner*` |
| Login | `colors.auth*` |
| Modal | `colors.modal*` |
| Altura de botón | `tokens.layout.buttonHeight` |
| Icono en fila / header | `tokens.layout.iconMd` |
| Icono hero / cierre de viaje | `tokens.layout.iconLg` |
| Icono estado vacío | `tokens.layout.iconEmptyState` |
| Avatar de perfil | `tokens.layout.avatarProfileSize` |
| Altura cámara escáner | `tokens.layout.cameraMinHeight` / `cameraMaxHeight` |

## Reglas

1. **No usar** `fontSize`, `padding` o `borderRadius` numéricos sueltos en pantallas.
2. **Sí usar** `tokens.typography.*` para texto y `tokens.spacing` / `tokens.radius` para layout.
3. **Colores** siempre desde `colors.*` (nunca hex en componentes).
4. **Tamaños fijos** de iconos o cámara → `tokens.layout.*`.
5. Estilos dependientes del tema → `useMemo` + dependencias `[colors, tokens]`.

## Archivos del sistema

- `tokens.ts` — espaciado, radios, tipografía, layout
- `semanticColors.ts` — paletas light/dark
- `ThemeProvider.tsx` — contexto `useAppTheme()`
- `buildPaperTheme.ts` — puente con React Native Paper
