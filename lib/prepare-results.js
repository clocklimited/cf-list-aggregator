module.exports = prepare

var applyOverrides = require('./apply-overrides')
  , find = require('lodash.find')

/*
 * Applies overrides to each item in a list.
 */
function prepare(results, overrides) {
  return results.map(function (result) {
    if (result.isCustom) return result.properties
    if (overrides && overrides.length) {
      var overrideItem = find(overrides, function (listItem) {
        return listItem.itemId === result._id
      })
      if (!overrideItem || !overrideItem.overrides) return result
      return applyOverrides(result, overrideItem.overrides)
    }
    return result
  })
}
