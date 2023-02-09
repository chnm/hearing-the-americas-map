// Bundle the js files together into dist/main.js
const webpack = require('webpack');
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const HtmlInlineScriptPlugin = require('html-inline-script-webpack-plugin');

const postcss = require('postcss');
const autoprefixer = require('autoprefixer');
const cssnano = require('cssnano');
const fs = require('fs');

// For development, we want to bundle the files together, but we don't want
// to minify them. We also want to use source maps so that we can debug
// our original source files.
module.exports = {
    mode: 'development',
    entry: './src/assets/main.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'index.js'
    },
    module: {
        rules: [
            {
                test: /\.(csv)$/,
                loader: 'csv-loader',
                options: {
                    header: true
                }
            },
        ],
    },
    plugins: [
        new webpack.ProvidePlugin({
            d3: 'd3',
        }),
    ],
};

// We bundle assets/main.js as well as the files it imports. We also bundle the
// files that main.js imports, and so on. This is called "tree shaking".
// We use the "mode" option to tell webpack to use its built-in
// optimizations appropriate for the given environment.
module.exports = {
    mode: 'production',
    entry: './src/assets/main.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'index.js'
    },
    module: {
        rules: [
            {
                test: /\.(csv)$/,
                loader: 'csv-loader',
                options: {
                    header: true
                }
            },
        ],
    },
    plugins: [
        new webpack.ProvidePlugin({
            d3: 'd3',
        }),
        new HtmlWebpackPlugin({
            template: 'index.html',
            filename: 'index.html',
            inject: 'body',
            inlineSource: '.(js|css)$',
        }),
        new HtmlInlineScriptPlugin(),
    ],
};

const minifyCss = async () => {
    const output = await postcss([cssnano, autoprefixer]).process(
        fs.readFileSync('src/assets/main.css', 'utf8'),
        { from: 'src/assets/main.css', to: 'dist/main.css' }
    );
    fs.writeFileSync('dist/main.css', output.css);
};

minifyCss();