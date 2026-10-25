# Dashboard

This dashboard uses React 18 and Vite with `.html`, `.css`, and `.js` source files.
JSX markup is supported inside `.js` files by `vite.config.js`; no `.jsx` files
or browser-loaded Babel scripts are needed.

## Run locally

Use Node.js 22.12+ (Node.js 24 is supported). From this folder:

```sh
cd "Front End"
npm install
npm run dev
```

Vite opens `http://localhost:5173/HomePage.html` (the port may change if busy).
Use the server URL instead of opening the HTML file directly from disk.

## Files

The `Front End` directory is organized as follows:

```text
Front End/
  HomePage.html          HTML shell and application entry
  src/
    main.js              Mounts the React application
    pages/               Page components and their CSS
    components/          UI components such as export and preview panels
    utils/               Spreadsheet preview and export helpers
    assets/images/       Images imported by components
  tests/                 Spreadsheet helper tests
  vite.config.js         Vite configuration and JSX support
  package.json           Dependencies and npm scripts
  package-lock.json      Dependency lockfile
  Dockerfile             Frontend container build
  nginx.conf             Production server configuration
  dist/                  Generated production build
```

`HomePage.html` loads `src/main.js`; page components import their own CSS.

New components can be written in `.js` files and imported where needed. The
automatic JSX runtime means components do not need `import React` just for JSX;
import hooks such as `useState` from `react` when you use them.

## Build and preview

```sh
npm run build
npm run preview
```

Run the frontend tests from `Front End` with `npm test`.

Deploy the contents of `dist` to a static web server and visit `/HomePage.html`.
The production files include React, so visitors do not fetch it from a CDN.

## Run with Docker

From the repository root, build and start the services:

```sh
docker compose up --build -d
```

Open `http://localhost:5173/`. The frontend container serves Vite's production
build through Nginx. Run the same command after changing frontend files to
rebuild the image, then refresh the browser (Ctrl+F5 if it shows old content).

Import images from React components (for example,
`import logo from "../assets/images/UMBC-primary-logo-CMYK-on-black.png"` in a page and
`<img src={logo} alt="UMBC" />`) so Vite includes them in the production build.
The `Front End` directory is the build root, not part of the website URL.
