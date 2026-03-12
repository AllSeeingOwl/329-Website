const path = require('path');

module.exports = {
  entry: './public/index.js', // You will need to create an entry point if you use webpack
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist/webpack'),
  },
  mode: 'development',
  module: {
    rules: [
      {
        test: /\.txt$/,
        use: 'raw-loader', // Use raw-loader if you want webpack to handle the .txt files as raw strings
      },
    ],
  },
};