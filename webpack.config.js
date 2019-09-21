const path = require("path");
var LiveReloadPlugin = require("webpack-livereload-plugin");

module.exports = {
  entry: "./demo/demo.ts",
  devtool: "inline-source-map",
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: "ts-loader",
        exclude: /node_modules/
      }
    ]
  },
  plugins: [new LiveReloadPlugin()],
  resolve: {
    extensions: [".ts", ".js"]
  },
  devServer: {
    contentBase: path.join(__dirname, "demo"),
    compress: true,
    port: 9000
  },
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "demo/dist")
  }
};
