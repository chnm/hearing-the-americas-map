# Hearing the Americas Map

This map visualizes spatial data from Hearing the Americas.

## Omeka HTML block

The site compiles down to a single index.html page in `dist/`, which can be copy and pasted into an Omeka HTML block.

With the auto-generated `<p>` that Omeka adds, change this to `<p style="display: none">`.

## npm Commands

Running the local server: 

`npm start`

Compile JS and CSS files for production, which produces a single `index.html` file in `dist/` that we can embed in an Omeka S HTML block: 

`npm run compile`

Watch JS files for local development: 

`npm run watchjs`

Lint JS files: 

`npm run lint`