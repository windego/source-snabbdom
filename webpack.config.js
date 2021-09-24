const path = require('path');

module.exports = {
  mode: "development",
  entry: './src/index.ts',
  output: {
    // path: path.resolve(__dirname, 'dist'),
    publicPath: '/assets/',
    filename: 'bundle.js',
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  devServer: {
    port: 8080,//端口号
    //静态文件夹
    static: {
      directory: path.join(__dirname, 'www'),
    },
  }
};