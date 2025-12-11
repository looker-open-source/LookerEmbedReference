// Copyright 2022 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

const path = require('path');
const Dotenv = require('dotenv-webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin')

const BACKEND_LOCATION = path.join(__dirname, 'dist');

module.exports = {
  mode: 'development',
  output: {
    filename: 'pbl.bundle.js',
    path: BACKEND_LOCATION,
  },
  entry: {
    index: './src/index.js',
  },
  devtool: 'inline-source-map',
  devServer: {
    https: true,
    hot: true,
    static: {
      directory: path.join(__dirname, 'src'),
    },
    port: process.env.PBL_CLIENT_PORT || 3001,
    proxy: {
      '/api': ['http://localhost', process.env.PBL_BACKEND_PORT || '3000'].join(':')
    },
    historyApiFallback: true
  },
  module: {
    rules: [
      {
        resourceQuery: /raw/,
        type: 'asset/source',
      },
      {
        test: /\.(js|jsx)$/,
        resourceQuery: { not: [/raw/] },
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            "presets": [
              "@babel/preset-env",
              ["@babel/preset-react", { "runtime": "automatic" }]
            ],
            "plugins": ["@babel/plugin-transform-runtime", "@babel/plugin-proposal-class-properties"]
          }
        }
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
    ]
  },
  plugins: [
    new Dotenv(),
    new HtmlWebpackPlugin({
      templateContent: `
        <html>
          <head>
            <title>Looker Embedded Reference Implementation</title>
          </head>
          <body>
            <div class="fullpage">
              <div id="app" style="width: 100%; height: 100%"></div>
            </div>
          </body>
        </html>
      `
    })
  ]
};