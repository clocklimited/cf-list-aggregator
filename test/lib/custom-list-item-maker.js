var extend = require('lodash.assign')
  , itemFixtures = require('../fixtures/item')
  , uniqueId = require('hat')

module.exports = function customListItemMaker(articles, custom) {
  return function (cb) {
    var properties = extend({}, itemFixtures.validNewPublished, custom, { _id: uniqueId() })
    articles.push({ isCustom: true, properties: properties })
    cb(null)
  }
}
