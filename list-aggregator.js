module.exports = createAggregator

var unique = require('lodash.uniq')
  , async = require('async')
  , createListAggregator = require('./lib/aggregator')
  , extrapolateSectionIds = require('cf-section-extrapolator')

function createAggregator (listService, sectionService, crudService, options) {

  var aggregateList = createListAggregator(crudService, options)

  /*
   * Runs the list aggregator over a number of lists
   */
  function aggregateLists (lists, dedupe, limit, section, cb) {

    // Make sure 'no limit' will work with comparison operators
    if (typeof limit !== 'number') limit = Infinity

    // Normalise the list input, so it's always an array
    if (!Array.isArray(lists)) lists = [ lists ]

    // Don't look up the same list more than once unnecessarily
    lists = unique(lists)

    /*
     * Looks up a list by id, and collects the article content for it
     */
    function aggregateEach (listId, cb) {
      listService.read(listId, function (err, list) {

        if (err) return cb(err)
        if (!list) return cb(null, [])

        if (!Array.isArray(list.sections)) list.sections = []

        var opts = {}

        if (options.hasOwnProperty('ensurePublic')) {
          opts.ensurePublic = options.ensurePublic
        }

        extrapolateSectionIds(sectionService, section._id, list.sections, opts, function (err, ids) {

          if (err) return cb(err)

          // Swap out list.sections for the list of actual section ids
          list.sections = ids

          aggregateList(list, cb)

        })

      })
    }

    /*
     * Flatten list aggregations into a 1D array of articles
     * (aggregations is an array of arrays).
     */
    function flattenAggregations (aggregations) {
      var articles = []
      aggregations.forEach(function (result) {
        articles = articles.concat(result)
      })
      return articles
    }

    /*
     * Dedupes and array of articles with or without a deduper provided
     */
    function dedupeResults (articles, cb) {

      // Make sure that each article in the list is unique. Custom items are always unique.
      var i = 0
        , deduped

      articles = unique(articles, function (article) {
        return (article.type === 'custom' || typeof article._id === 'undefined') ? i++ : article._id
      })

      if (dedupe) {
        // If a deduper has been passed, use it
        deduped = []
        articles.forEach(function (article) {
          var isDuplicate = dedupe.has(article._id)
          if (!isDuplicate && deduped.length < limit) {
            deduped.push(article)
          }
        })
      } else {
        // Otherwise just return up to the limit of articles
        deduped = articles.slice(0, isFinite(limit) ? limit : undefined)
      }

      return cb(null, deduped)

    }

    // Lookup each list and concatenate the contents of
    // each, then dedupe the results and callback
    async.map(lists, aggregateEach, function (err, results) {
      if (err) return cb(err)
      dedupeResults(flattenAggregations(results), cb)
    })

  }

  return aggregateLists

}
