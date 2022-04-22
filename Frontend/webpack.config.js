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
const { dirname } = require('path');

const BACKEND_LOCATION = path.join(__dirname, 'dist');

module.exports = {
  mode: 'development',
  output: {
    filename: 'pbl.bundle.js',
    path: BACKEND_LOCATION,
  },
  devtool: 'inline-source-map',
  devServer: {
    // contentBase: path.join(__dirname, 'dist'),
    static: {
      directory: path.join(__dirname, 'dist'),
    },
    port: process.env.PBL_DEV_PORT || 3001,
    proxy: {
      '/api': ['http://localhost', process.env.PBL_PORT || '3000'].join(':')
    },
    historyApiFallback: true
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            "presets": [
              "@babel/preset-env", 
              "@babel/preset-react",
              {
                'plugins': ["@babel/plugin-transform-runtime", '@babel/plugin-proposal-class-properties']
              }
            ]
          }
        }
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      }
    ]
  },
  plugins: [
    new Dotenv()
  ]
};