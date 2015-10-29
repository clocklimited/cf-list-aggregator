module.exports = createProcessor

var async = require('async')
  , isVisible = require('cf-visibility-check')

function createProcessor (crudService, options) {

  return processResults

  /*
   * Process the results that come back from the system
   * when the list query is run. Some items will not come
   * back because of visibility rules, and if they have been
   * overridden in such a way that means they should be visible,
   * the item needs to be fetched individually.
   */
  function processResults (results, items, cb) {

    if (!items) return cb(null, results)

    var resultIds = results.map(function (item) { return item._id })

    async.mapSeries(items, function (item, cb) {

      if (item.isCustom) return cb(null)

      // if an overridden item, need to check if its live and if so, get all of the other data for this article
      if (item.overrides && Object.keys(item.overrides).length) {
        // Only get extra article data if its actually needed (i.e the article is live)
        if (!isVisible(item.overrides, options.date)) return cb(null)
        return crudService.read(item.itemId, cb)
      }

      // if not a custom item or an overidden item, just add to the list of results
      var index = resultIds.indexOf(item.itemId)
      if (index !== -1) return cb(null, results[index])
      cb(null)

    }
  , function (err, results) {
      if (err) return cb(err)
      cb(null, results.filter(function (item) { return !!item }))
    })
  }
}
