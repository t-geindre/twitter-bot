var Encore = require('@symfony/webpack-encore');

Encore
    .setOutputPath('build/')
    .setPublicPath('/build')
    .cleanupOutputBeforeBuild()
    .configureBabel(function(babelConfig) {
        babelConfig.presets.push('es2017');
    })
    .addEntry('twitter-bot', './src/main.js' )
    .enableSourceMaps(!Encore.isProduction())
;

var config = Encore.getWebpackConfig();
config.watchOptions = { poll: true, ignored: /node_modules/ };
module.exports = config;

