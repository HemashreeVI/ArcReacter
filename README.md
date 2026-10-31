# ArcReacter

Portfolio of **Hemashree Venugopal Indrajith**, in an Iron Man red-and-gold theme.

- **Boot intro**: a J.A.R.V.I.S.-style start-up sequence that ends by powering up the arc reactor.
- **3D arc reactor**: built in code with React Three Fiber. It reacts to scroll and the pointer, and the camera moves around it as you scroll.
- **Two modes**: *HUD* (dark) and *LAB* (a bright workshop with hologram projectors). They switch with a shockwave transition, without reloading the page.
- **Project dossiers**: tilting cards that open into a full write-up with a gallery and mission log.

## Run

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # static site in out/
```

## Edit content

All text, projects, experience and links live in `app/lib/site.ts`. Images go in `public/img/`.

## Deploy

Pushing to `main` deploys to GitHub Pages through `.github/workflows/deploy.yml`.
In the repo settings, set **Pages → Source** to **GitHub Actions**.
