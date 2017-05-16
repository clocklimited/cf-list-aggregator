module.exports = createAggregator

var prepareResults = require('./prepare-results')
  , prepareAutoQuery = require('./prepare-auto-query')
  , prepareManualQuery = require('./prepare-manual-query')
  , createResultsProcessor = require('./results-processor')
  , getCustomItemOrder = require('./custom-item-order')
  , defaultFields = require('./default-fields')
  , find = require('lodash.find')

function createAggregator (crudService, options) {

  var processResults = createResultsProcessor(crudService, options)

  /*
   * Aggregates a single list
   */
  function aggregateList (list, cb) {

    var q = getQuery(list, options)
      , overrides = q.overrides

    // Set the query limit
    q.options.limit = list.limit

    if (options.date) {
      q.options.date = options.date
    }

    if (options.fields) {
      q.options.fields = options.fields
    } else {
      q.options.fields = defaultFields
    }

    crudService.findPublic(q.query, q.options, function (err, unprocessedResults) {

      if (err) return cb(err)

      var items = list.type === 'manual' ? list.items : null
      processResults(unprocessedResults, items, function (error, results) {
        if (error) return cb(error)

        if (list.type !== 'manual') return cb(null, prepareResults(results, overrides))

        // Give the custom list items an order based on the items that were retrieved from the system
        var customListItems = getCustomItemOrder(results, list.items, options.date)
          // Create an array to mix in the found items with the custom items
          , newResults = []
          // Don't go any higher than list.limit, otherwise there won't be enough
          , length = Math.min(results.length + customListItems.length, list.limit)
          , i
          , custom

        for (i = 0; i < length; i++) {
          custom = find(customListItems, findItemWithOrder(i))
          // If there is a custom item that wants index i, use it otherwise
          // shift the next item off the front of the results array
          newResults[i] = custom || results.shift()
        }

        return cb(null, prepareResults(newResults, overrides))

      })
    })
  }

  return aggregateList

}

function findItemWithOrder (i) {
  return function (item) {
    return item.listIndex === i
  }
}

function getQuery (list, options) {

  var prepareManualQueryFn
    , prepareAutoQueryFn
    , additionalAutoQuery = function () {
      return function (query) {
        return query
      }
    }

  switch (list.type) {
    case 'manual':
      prepareManualQueryFn = prepareManualQuery
      if (options.prepareManualQuery && typeof options.prepareManualQuery === 'function') {
        prepareManualQueryFn = options.prepareManualQuery
      }
      return prepareManualQueryFn(list)
    case 'auto':
      prepareAutoQueryFn = prepareAutoQuery
      if (options.prepareAutoQuery && typeof options.prepareAutoQuery === 'function') {
        prepareAutoQueryFn = options.prepareAutoQuery
      }
      if (options.additionalAutoQuery && typeof options.additionalAutoQuery === 'function') {
        additionalAutoQuery = options.additionalAutoQuery
      }
      return additionalAutoQuery(list)(prepareAutoQueryFn(list))
    default:
      throw new Error('Unsupported list type "' + list.type + '"')
  }

}
