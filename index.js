#!/usr/bin/env node

"use strict";

var fs = require("fs-extra");
var mustache = require("mustache");
var pit = require("pit-ro");
var request = require("request");

var config = pit.get("pinboard.in");
var data = {
  item: []
};
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

if (process.argv.length === 3 && process.argv[2] === "--force") {
  force = true;
}

if (!force) {
  try {
    data = fs.readJsonSync("index.json");
    qs.fromdt = data.item[0].time;
  } catch (e) {
    force = true;
  }
}

qs.auth_token = config.username + ":" + config.token;
request.get({
  qs: qs,
  uri: url
}, function (err, res, body) {
  var newData;
  var template;

  if (err) {
    throw err;
  }

  if (res.statusCode !== 200) {
    throw new Error("Pinboard API server returned an error: " + res.statusCode);
  }

  newData = JSON.parse(body).filter(function (item) {
    if (item.toread === "yes") {
      return false;
    }

    return true;
  });

  if (force) {
    data.item = newData.slice(0);
    newData = [];
  }

  if (!force && newData.length === 0) {
    return;
  }

  newData.reverse().forEach(function (item) {
    data.item.unshift(item);
  });
  fs.writeJsonSync("index.json", data);
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
  template = fs.readFileSync("src/index.mustache", "utf8");
  mustache.escape = function (string) {
    return String(string).replace(/[&<>"']/g, function (s) {
      return entityMap[s];
    });
  };
  mustache.parse(template);
  data.archives.year.forEach(function (year) {
    var d = data[year];

    d.path = "../";
    d.year = year;
    fs.outputFileSync(
      "dist/" + year + "/index.html",
      mustache.render(template, d)
    );
  });
  fs.outputFileSync("dist/index.html", mustache.render(template, data));
});
