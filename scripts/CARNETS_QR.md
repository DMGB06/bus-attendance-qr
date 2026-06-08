# Generación de carnets QR

## Requisitos

```powershell
cd scripts
pip install -r requirements-qr.txt
```

## Generar todos los carnets (109 alumnos)

```powershell
python generar_carnets_qr.py
```

## Salida

| Archivo | Descripción |
|---|---|
| `output/carnets_qr/Carnets_BusControl.pdf` | PDF A4 listo para imprimir (10 carnets/hoja) |
| `output/carnets_qr/png/BU0098.png` | PNG individual por alumno (300 DPI) |
| `output/carnets_qr/manifest.csv` | Control de códigos generados |
| `data/alumnos_activos.csv` | Lista exportada (opcional) |

## Probar uno solo

```powershell
python generar_carnets_qr.py --codigo BU0098
python generar_carnets_qr.py --limit 3
```

## Usar CSV de Supabase

Exporta desde SQL Editor y pasa la ruta:

```powershell
python generar_carnets_qr.py --csv data/alumnos_activos.csv
```

## Contenido del QR

Cada QR contiene **solo el código** del alumno (ej. `BU0098`), que es lo que la app escanea.

## Impresión

1. Abre `Carnets_BusControl.pdf`
2. Imprime a color o escala de grises
3. Plastifica tamaño carnet (~85 × 54 mm)
4. Prueba 3 QR con la app antes de entregar todos

## Alumno nuevo

1. Crear alumno en Supabase con `codigo` nuevo
2. Exportar CSV o actualizar migración
3. `python generar_carnets_qr.py --codigo BU0133`
