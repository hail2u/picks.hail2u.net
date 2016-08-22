"use strict";

var fs = require("fs-extra");
var mustache = require("mustache");
var pit = require("pit-ro");
var request = require("request");

var config = {
  cache: "index.json",
  dest: "dist/",
  entityMap: {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  },
  force: false,
  html: "index.html",
  monthNames: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep",
    "Oct", "Nov", "Dec"],
  qs: {
    format: "json"
  },
  template: "src/index.mustache",
  url: "https://api.pinboard.in/v1/posts/all"
};
var data = {
  item: []
};

Object.assign(config, pit.get("pinboard.in"));

if (process.argv.length === 3 && process.argv[2] === "--force") {
  config.force = true;
}

if (!config.force) {
  try {
    data = fs.readJsonSync(config.cache);
    config.qs.fromdt = data.item[0].time;
  } catch (e) {
    config.force = true;
  }
}

config.qs.auth_token = config.username + ":" + config.token;
request.get({
  qs: config.qs,
  uri: config.url
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

  if (config.force) {
    data.item = newData.slice(0);
    newData = [];
  }

  if (!config.force && newData.length === 0) {
    return;
  }

  newData.reverse().forEach(function (item) {
    data.item.unshift(item);
  });
  fs.writeJsonSync(config.cache, data);
  data.archives = {
    year: []
  };
  data.item.forEach(function (item) {
    var date = new Date(item.time);
    var year = date.getFullYear();

    item.date = config.monthNames[date.getMonth()] + " " + date.getDate() +
      ", " + year;

    if (!data[year]) {
      data.archives.year.push(year.toString());
      data[year] = {
        item: []
      };
    }

    data[year].item.push(item);
  });
  data.item = data.item.slice(0, 20);
  data.path = "./";
  template = fs.readFileSync(config.template, "utf8");
  mustache.escape = function (string) {
    return String(string).replace(/[&<>"']/g, function (s) {
      return config.entityMap[s];
    });
  };
  mustache.parse(template);
  data.archives.year.forEach(function (year) {
    var d = data[year];

    d.path = "../";
    d.year = year;
    fs.outputFileSync(
      config.dest + year + "/" + config.html,
      mustache.render(template, d)
    );
  });
  fs.outputFileSync(config.dest + config.html, mustache.render(template, data));
});
