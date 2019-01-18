const Path = require('path');

const outputPath = Path.join( __dirname, 'dist');

module.exports = {
    mode: 'production',
    entry: './src/index.js',
    output: {
        path: outputPath,
        filename: 'locomote-sw-client.js'
    }
};
