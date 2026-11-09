// Copyright 2022-2026 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors');

var indexRouter = require('./routes/index');
var apiRouter = require('./routes/api');

var app = express();

var allowedOrigin = process.env.PBL_FRONTEND_ORIGIN || 'https://localhost:3001';

app.use(
  cors({
    origin: allowedOrigin,
    credentials: true,
  })
);
app.use(logger('dev'));
app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: false, limit: '16kb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/api', apiRouter);

app.use(function (err, _req, res, next) {
  if (err && (err.type === 'entity.too.large' || err instanceof SyntaxError)) {
    res.setHeader('Content-Type', 'application/json');
    return res.status(err.status || 400).send({ error: 'Invalid request payload' });
  }
  return next(err);
});

module.exports = app;
