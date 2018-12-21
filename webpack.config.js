/*
  Note that you need to make sure the build has completely
  finished before reloading your web page - otherwise,
  only a partial bundle will be served
*/
const path = require('path')

// Phaser webpack config
const phaserModule = path.join(__dirname, '/node_modules/phaser-ce/');
const phaser = path.join(phaserModule, 'build/custom/phaser-split.js');
const pixi = path.join(phaserModule, 'build/custom/pixi.js');
const p2 = path.join(phaserModule, 'build/custom/p2.js');

module.exports = {
  // starting point for our frontend JavaScript (place to enter when bundling)
  entry: './client/index.js',

  // where to output our newly bundled file
  output: {
    // the ABSOLUTE path for the directory
    path: path.join(__dirname, '/public'),
    // the name of the file that will contain our output
    // we could name this whatever we want, but bundle.js is convention
    filename: 'bundle.js'
  },

  mode: 'development',
  devtool: 'source-map',

  // extra modules to incorporate when parsing files
  module: {
    rules: [{
      // which files to apply this loader to (end in `js` or `jsx`)
      test: /jsx?$/,

      // which folders to ignore / not apply this to
      exclude: /(node_modules|bower_components)/,

      // which loader to use for this rule-set --> check out .babelrc for our specified rules
      use: ['babel-loader']
    },
    { test: /pixi\.js/, use: ['expose-loader?PIXI'] },
		{ test: /phaser-split\.js$/, use: ['expose-loader?Phaser'] },
		{ test: /p2\.js/, use: ['expose-loader?p2'] },]
  },
  resolve: {
		alias: {
			phaser,
			pixi,
			p2,
		},
	},
}
