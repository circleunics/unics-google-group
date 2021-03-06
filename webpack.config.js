const path = require('path');
const GasPlugin = require("gas-webpack-plugin");

module.exports = {
  mode: 'development',
  entry: [
    './src/OnFormsSubmit/common.ts',
    './src/oauth2.ts'
  ],
  devtool: false,
  output: {
    filename: 'bundle.js',
    path: path.join(__dirname, 'dist')
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader'
      }
    ]
  },
  resolve: {
    extensions: [
      '.ts'
    ]
  },
  plugins: [
    new GasPlugin()
  ]
};
