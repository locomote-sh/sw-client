const Path = require('path');

const { version } = require('./package.json');

const outputPath = Path.join( __dirname, 'dist', 'sw', version );

module.exports = {
    mode: 'production',
    entry: './src/index.js',
    output: {
        path: outputPath,
        filename: 'locomote-sw-client.js'
    }
};
