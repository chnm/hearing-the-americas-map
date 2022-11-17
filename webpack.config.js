// Bundle the js files together into dist/main.js
const webpack = require('webpack');
const path = require('path');

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