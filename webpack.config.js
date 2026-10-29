const defaultConfig = require( '@wordpress/scripts/config/webpack.config' );
const CopyWebpackPlugin = require( 'copy-webpack-plugin' );
const path = require( 'path' );

module.exports = {
	...defaultConfig,
	plugins: [
		...defaultConfig.plugins,
		new CopyWebpackPlugin( {
			patterns: [
				{
					from: path.resolve( __dirname, 'resources/images' ),
					to: path.resolve( __dirname, 'assets/images' ),
					noErrorOnMissing: true,
				},
			],
		} ),
	],
};
