module.exports = override

var extend = require('lodash.assign')

/*
 * Takes an item and an object of key/values
 * of which to override the items's own properties.
 * Overrides the properties on a new object so as
 * not to mutate the original item.
 */
function override(item, overrides) {
  var o = {}
  Object.keys(overrides).forEach(function (key) {
    if (!item.hasOwnProperty(key)) return
    o[key] = overrides[key]
  })
  return extend({}, item, o)
}
