#!/usr/bin/env node

'use strict';

var fs = require('fs');
var mustache = require('mustache');
var path = require('path');
var request = require('request');

var url = 'https://feeds.pinboard.in/json/u:hail2u/';

request(url, function (error, response, body) {
  var newData;
  var template;

  if (error) {
    throw error;
  }

  if (response.statusCode !== 200) {
    throw new Error('Server returned ' + response.statusCode + '.');
  }

  newData = JSON.parse(body);

  if (!force && newData.length === 0) {
    throw new Error('There is no new bookmarks.');
  }

  newData.reverse().forEach(function (item) {
    if (item.toread === 'yes') {
      return;
    }

    console.log('New bookmark: ' + item.href);
    data.item.unshift(item);
  });
  fs.writeFileSync('index.json', JSON.stringify(data, null, 2));
  data.archives = {
    year: []
  };
  data.item.forEach(function (item) {
    var date = new Date(item.time);
    var year = date.getFullYear();
    item.date = monthNames[date.getMonth()] + ' ' + date.getDate() + ', ' +
      year;

    if (!data[year]) {
      data.archives.year.push(year.toString());
      data[year] = {
        item: []
      };
    }

    data[year].item.push(item);
  });
  data.item = data.item.slice(0, 50);
  data.path = './';
  template = fs.readFileSync('index.mustache', 'utf-8');
  mustache.parse(template);
  data.archives.year.forEach(function (year) {
    var d = data[year];
    d.path = '../';
    d.year = year;
    year = 'build/' + year;

    if (!fs.existsSync(year) || !fs.statSync(year).isDirectory()) {
      fs.mkdirSync(year);
    }

    fs.writeFileSync(year + '/index.html', mustache.render(template, d));
  });
  fs.writeFileSync(__basename + '.html', rendered);
});
