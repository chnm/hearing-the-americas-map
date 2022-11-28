// Bundle the js files together into dist/main.js
const webpack = require('webpack');
const path = require('path');

const postcss = require('postcss');
const autoprefixer = require('autoprefixer');
const cssnano = require('cssnano');
const fs = require('fs');

// We bundle assets/main.js as well as the files it imports. We also bundle the
// files that main.js imports, and so on. This is called "tree shaking".
// We use the "mode" option to tell webpack to use its built-in
// optimizations appropriate for the given environment.
module.exports = {
    mode: 'production',
    entry: './assets/main.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'index.js'
    },
    plugins: [
        new webpack.ProvidePlugin({
            d3: 'd3',
        }),
    ],
};

const minifyCss = async () => {
    const output = await postcss([cssnano, autoprefixer]).process(
        fs.readFileSync('assets/main.css', 'utf8'),
        { from: 'assets/main.css', to: 'dist/main.css' }
    );
    fs.writeFileSync('dist/main.css', output.css);
};

minifyCss();