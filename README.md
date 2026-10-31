# Portfolio · Hemashree Venugopal Indrajith

A portfolio built around a glossy miniature 3D city on a floating platform.

- **The city is built in code** (React Three Fiber): glass towers with real window grids, moving cars, trees, parks and floating clouds. When the site loads, the buildings rise out of the platform from the centre outwards.
- **Projects are landmarks.** Scroll to *Projects* and each of the 8 projects is a tower with a label. Tap one and the camera flies to it and opens its write-up.
- **Day / night.** The moon button switches to night: windows light up, cars turn on their headlights and the platform rings glow.
- The camera moves around the city as you scroll. Frosted-glass cards, smooth scrolling and scroll-triggered reveals.

## Run

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # static site in out/
```

## Edit content

All text, projects, experience and links live in `app/lib/site.ts`. Images go in `public/img/`.

## Deploy

Pushing to `main` builds the site and publishes it to the `gh-pages` branch (`.github/workflows/deploy.yml`).
Live at https://hemashreevi.github.io/ArcReacter/
