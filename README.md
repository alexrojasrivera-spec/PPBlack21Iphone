# Black 21 — Aprende a jugar Blackjack en tu iPhone

App web (PWA) para **aprender a jugar Blackjack 21 contra la casa** de forma
realista, con un **entrenador de estrategia básica** que te dice la jugada
óptima en cada mano y por qué.

No necesitas Mac, Xcode ni la App Store: se instala directamente desde Safari
y funciona **sin conexión** como una app normal.

## 📲 Cómo instalarla en tu iPhone

1. Sube estos archivos a cualquier hosting estático gratuito (ver abajo) para
   obtener una URL `https://…`.
2. Abre esa URL en **Safari** en tu iPhone.
3. Toca el botón **Compartir** (el cuadro con la flecha hacia arriba).
4. Elige **«Añadir a pantalla de inicio»**.
5. Ábrela desde el ícono **Black 21**: se ve a pantalla completa, como una app.

> Requisito de iOS: la instalación como PWA y el uso sin conexión requieren
> abrir la app por **HTTPS** (funciona en cualquier hosting; ver abajo).

### Opciones de hosting gratis (elige una)
- **GitHub Pages:** en este repo, ve a *Settings → Pages* y publica la rama.
  La URL será `https://<usuario>.github.io/<repo>/`.
- **Netlify / Vercel / Cloudflare Pages:** arrastra la carpeta o conecta el
  repo. No requiere configuración: es un sitio estático.

### Probarla en tu computadora antes
```bash
# Desde la carpeta del proyecto, con Python instalado:
python3 -m http.server 8000
# Abre http://localhost:8000
```

## 🃏 Qué incluye (reglas realistas de casino)
- **Zapato de 6 barajas** que se rebaraja al consumirse (como en las mesas reales).
- La casa **pide hasta 17 y se planta** (incluido 17 suave).
- **Blackjack paga 3:2**, el **seguro** se ofrece con As y paga 2:1.
- Acciones: **Pedir, Plantarse, Doblar, Dividir** (con re-división y doblar tras dividir).
- Apuestas con fichas y saldo (bankroll).

## 🎓 Modo entrenador (aprender a ganarle a la casa)
- Antes de cada jugada te muestra la **jugada óptima** y una **explicación**.
- Si te equivocas, te lo indica y te dice cuál era la correcta.
- **📋 Tabla de estrategia básica** completa (duros, suaves y pares).
- **📊 Estadísticas**: tu *precisión de estrategia*. Apunta a 100 % para
  reducir la ventaja de la casa a ~0.5 %.
- **❓ Ayuda**: reglas y cómo se juega.

## 🗂 Estructura
```
index.html              Página principal
css/styles.css          Estilos (mesa de casino, responsive iPhone)
js/strategy.js          Estrategia básica óptima y explicaciones
js/game.js              Motor del juego (barajas, reglas de la casa)
js/ui.js                Interfaz, entrenador y modales
manifest.webmanifest    Config PWA (instalable)
sw.js                   Service worker (funciona sin conexión)
icons/                  Íconos de la app
tools/                  Scripts de desarrollo (generar íconos, prueba visual)
```

## 🛠 Desarrollo
```bash
node tools/gen-icons.js   # regenerar íconos PNG
```

La estrategia está calibrada para 6 barajas, la casa se planta en 17 y se
permite doblar tras dividir. Es solo para **fines educativos y de
entretenimiento**; no involucra dinero real.
