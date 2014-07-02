#!/usr/bin/env node

'use strict';

var fs = require('fs');
var mustache = require('mustache');
var path = require('path');
var request = require('request');

var url = 'https://feeds.pinboard.in/json/u:hail2u/';

request(url, function (error, response, body) {
  if (error || response.statusCode !== 200) {
    error = error ? error : new Error('Server returned ' + response.statusCode + '.');

    throw error;
  }

  var __basename = path.basename(__filename, '.js');
  var template = fs.readFileSync(__basename + '.mustache', 'utf-8');
  var rendered = mustache.render(template, {
    item: JSON.parse(body)
  });
  fs.writeFileSync(__basename + '.html', rendered);
});
