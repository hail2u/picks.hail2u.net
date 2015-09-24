#!/usr/bin/env node

"use strict";

var fs = require("fs");
var mustache = require("mustache");
var pit = require("pit-ro");
var request = require("request");

var config = pit.get("pinboard.in");
var data = JSON.parse(fs.readFileSync("index.json", "utf-8"));
var entityMap = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
};
var force = false;
var monthNames = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec"
];
var qs = {
  format: "json"
};
var url = "https://api.pinboard.in/v1/posts/all";

mustache.escape = function (string) {
  return String(string).replace(/[&<>"']/g, function (s) {
    return entityMap[s];
  });
};

if (process.argv.length === 3 && process.argv[2] === "--force") {
  force = true;
}

qs.fromdt = data.item[0].time;
qs.auth_token = config.username + ":" + config.token;
request.get({
  qs: qs,
  uri: url
}, function (error, response, body) {
  var newData;
  var template;

  if (error) {
    throw error;
  }

  if (response.statusCode !== 200) {
    throw new Error("Server returned " + response.statusCode + ".");
  }

  newData = JSON.parse(body);

  if (!force && newData.length === 0) {
    throw new Error("There is no new bookmarks.");
  }

  newData.reverse().forEach(function (item) {
    if (item.toread === "yes") {
      return;
    }

    console.log("New bookmark: " + item.href);
    data.item.unshift(item);
  });
  fs.writeFileSync("index.json", JSON.stringify(data, null, 2));
  data.archives = {
    year: []
  };
  data.item.forEach(function (item) {
    var date = new Date(item.time);
    var year = date.getFullYear();
    item.date = monthNames[date.getMonth()] + " " + date.getDate() + ", " +
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
  data.path = "./";
  template = fs.readFileSync("index.mustache", "utf-8");
  mustache.parse(template);
  data.archives.year.forEach(function (year) {
    var d = data[year];
    d.path = "../";
    d.year = year;
    year = "dist/" + year;

    try {
      fs.mkdirSync(year);
    } catch (e) {
      console.error('Directory "' + year + '" found.');
    }

    fs.writeFileSync(year + "/index.html", mustache.render(template, d));
  });
  fs.writeFileSync("dist/index.html", mustache.render(template, data));
  console.log("");
});
