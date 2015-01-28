require('should')

var createAggregator = require('..')
  , saveMongodb = require('save-mongodb')
  , async = require('async')
  , assert = require('assert')
  , moment = require('moment')
  , extend = require('lodash.assign')
  , mockSection = { _id: '123' }
  , customListItemMaker = require('./lib/custom-list-item-maker')
  , publishedArticleMaker = require('./lib/published-article-maker')
  , draftArticleMaker = require('./lib/draft-article-maker')
  , momentToDate = require('./lib/moment-to-date')
  , logger = require('mc-logger')
  , createListService = require('./lib/mock-list-service')
  , dbConnection
  , dbConnect = require('./lib/db-connection')
  , createArticleService
  , createSectionService

before(function(done) {
  dbConnect.connect(function (err, db) {
    dbConnection = db
    done()
  })
})

// Clean up after tests
after(dbConnect.disconnect)

// Each test gets a new article service
beforeEach(function () {
  var save = saveMongodb(dbConnection.collection('section'))
  createSectionService = require('./lib/mock-section-service')(save)
})

// Each test gets a new article service
beforeEach(function() {
  var save = saveMongodb(dbConnection.collection('article' + Date.now()))
  createArticleService = require('./lib/mock-article-service')(save)
})

describe('List aggregator (for a manual list)', function () {

  it('should return only the list of full articles specified by ids', function (done) {

    var articles = []
      , listId
      , listService = createListService()
      , sectionService = createSectionService()
      , articleService = createArticleService()

    async.series(
      [ publishedArticleMaker.createArticles(5, articleService, articles)
      , publishedArticleMaker.createArticles(2, articleService, [])
      , function (cb) {
          listService.create(
              { type: 'manual'
              , name: 'test list'
              , items: articles.map(function (article) { return { isCustom: false, itemId: article._id } })
              , limit: 100
              }
            , function (err, res) {
                if (err) return cb(err)
                listId = res._id
                cb(null)
              })
        }
      ], function (err) {
        if (err) return done(err)
        var aggregate = createAggregator(listService, sectionService, articleService, { logger: logger })
        aggregate(listId, null, null, mockSection, function (err, results) {
          results.should.have.length(5)
          function getId(item) { return item._id }
          assert.deepEqual(articles.map(getId), results.map(getId))
          done()
        })
      })
  })

  it('should only return published articles', function (done) {

    var articles = []
      , listId
      , listService = createListService()
      , sectionService = createSectionService()
      , articleService = createArticleService()

    async.series(
      [ publishedArticleMaker.createArticles(3, articleService, articles)
      , draftArticleMaker(articleService)
      , draftArticleMaker(articleService)
      , draftArticleMaker(articleService)
      , function (cb) {
          listService.create(
              { type: 'manual'
              , name: 'test list'
              , items: articles.map(function (article) { return { isCustom: false, itemId: article._id } })
              , limit: 100
              }
            , function (err, res) {
                listId = res._id
                cb(null)
              })
        }
      ], function (err) {
        if (err) return done(err)
        var aggregate = createAggregator(listService, sectionService, articleService, { logger: logger })
        aggregate(listId, null, null, mockSection, function (err, results) {
          results.should.have.length(3)
          function getId(item) { return item._id }
          assert.deepEqual(articles.map(getId), results.map(getId))
          done()
        })

      })

  })

  it('should limit the number of articles', function (done) {

    var articles = []
      , listId
      , listService = createListService()
      , sectionService = createSectionService()
      , articleService = createArticleService()

    async.series(
      [ publishedArticleMaker.createArticles(3, articleService, articles)
      , draftArticleMaker(articleService)
      , draftArticleMaker(articleService)
      , draftArticleMaker(articleService)
      , function (cb) {
          listService.create(
              { type: 'manual'
              , name: 'test list'
              , items: articles.map(function (article) { return { isCustom: false, itemId: article._id } })
              , limit: 2
              }
            , function (err, res) {
                listId = res._id
                cb(null)
              })
        }
      ], function (err) {
        if (err) return done(err)
        var aggregate = createAggregator(listService, sectionService, articleService, { logger: logger })
        aggregate(listId, null, null, mockSection, function (err, results) {
          results.should.have.length(2)
          function getId(item) { return item._id }
          assert.deepEqual(articles.map(getId).slice(0, 2), results.map(getId))
          done()
        })
      })

  })

  it('should override given article properties', function (done) {

    var articles = []
      , overrides = { headline: 'Override #1' }
      , listId
      , listService = createListService()
      , sectionService = createSectionService()
      , articleService = createArticleService()

    async.series(
      [ publishedArticleMaker.createArticles(3, articleService, articles)
      , draftArticleMaker(articleService)
      , draftArticleMaker(articleService)
      , draftArticleMaker(articleService)
      , function (cb) {
        listService.create(
            { type: 'manual'
            , name: 'test list'
            , items: articles.map(function (article) {
                return { isCustom: false, itemId: article._id, overrides: overrides }
              })
            , limit: 100
            }
            , function (err, res) {
                listId = res._id
                cb(null)
              })
      }
      ], function (err) {
        if (err) return done(err)
        var aggregate = createAggregator(listService, sectionService, articleService, { logger: logger })
        aggregate(listId, null, null, mockSection, function (err, results) {
          if (err) return done(err)
          results.should.have.length(3)

          function applyOverrides(item) {
            var o = extend(item, overrides)
            return { _id: o._id, headline: o.headline }
          }

          function processResults(item) {
            return { _id: item._id, headline: item.headline }
          }

          assert.deepEqual(articles.map(applyOverrides), results.map(processResults))
          done()

        })

      })
  })

  it('should return a list with custom list items', function (done) {
    var listItems = []
      , listId
      , listService = createListService()
      , sectionService = createSectionService()
      , articleService = createArticleService()

    async.series(
      [ customListItemMaker(listItems, { headline: 'Bob' })
      , customListItemMaker(listItems, { headline: 'Alice' })
      , customListItemMaker(listItems)
      , customListItemMaker([])
      , customListItemMaker(listItems)
      , customListItemMaker([])
      , customListItemMaker(listItems)
      , function (cb) {
          listService.create(
            { type: 'manual'
            , name: 'test list'
            , items: listItems
            , limit: 100
            }
          , function (err, res) {
              listId = res._id
              cb(null)
            })
        }
      ], function (err) {
        if (err) return done(err)

        var aggregate = createAggregator(listService, sectionService, articleService, { logger: logger })
        aggregate(listId, null, null, mockSection, function (err, results) {
          if (err) return done(err)
          results.should.have.length(5)
          results.forEach(function (result, i) {
            if (i === 0) {
              result.headline.should.eql('Bob')
            } else if (i === 1) {
              result.headline.should.eql('Alice')
            }
          })
          done()
        })
      })
  })

  it('should return a list with custom list items and articles', function (done) {
    var listItems = []
      , listId
      , listService = createListService()
      , sectionService = createSectionService()
      , articleService = createArticleService()

    async.series(
      [ customListItemMaker(listItems, { headline: 'Bob' })
      , customListItemMaker(listItems, { headline: 'Alice' })
      , customListItemMaker(listItems)
      , publishedArticleMaker.createArticles(2, articleService, listItems)
      , customListItemMaker(listItems)
      , customListItemMaker(listItems)
      , function (cb) {
          listService.create(
            { type: 'manual'
            , name: 'test list'
            , items: listItems.map(function (item) {
                if (!item.isCustom) return { isCustom: false, itemId: item._id }
                return item
              })
            , limit: 100
            }
          , function (err, res) {
              listId = res._id
              cb(null)
            })
        }
      ], function (err) {
        if (err) return done(err)
        var aggregate = createAggregator(listService, sectionService, articleService, { logger: logger })
        aggregate(listId, null, null, mockSection, function (err, results) {
          if (err) return done(err)
          results.should.have.length(7)
          results.forEach(function (result, i) {
            if (i === 0) {
              result.headline.should.eql('Bob')
            } else if (i === 1) {
              result.headline.should.eql('Alice')
            }
          })
          done()
        })

      })
  })

  it('should override the live and expiry date of a non live article', function (done) {

    var articles = []
      , oneWeekAhead = moment().add('week', 1)
      , twoWeeksAhead = moment().add('week', 2)
      , oneWeekAgo = moment().subtract('week', 1)
      , overrides =
         [ { liveDate: oneWeekAgo, expiryDate: oneWeekAhead, customId: null }
         ]
      , listId
      , listService = createListService()
      , sectionService = createSectionService()
      , articleService = createArticleService()

    async.series(
      [ publishedArticleMaker(articleService, articles, { liveDate: oneWeekAhead, expiryDate: twoWeeksAhead })
      , publishedArticleMaker.createArticles(2, articleService, articles)
      , function (cb) {
          listService.create(
            { type: 'manual'
            , name: 'test list'
            , items: articles.map(function (article, i) {
                return { isCustom: false, itemId: article._id, overrides: overrides[i] }
              })
            , limit: 100
            }
          , function (err, res) {
              if (err) return cb(err)
              listId = res._id
              cb(null)
            }
          )
        }
      ]
    , function (err) {
        if (err) throw done(err)
        var aggregate = createAggregator(listService, sectionService, articleService, { logger: logger })
        aggregate(listId, null, null, mockSection, function (err, results) {
          if (err) return done(err)
          results.length.should.equal(3)
          done()
        })
      }
    )
  })

  it('should override the live and expiry date of a live article', function (done) {

    var articles = []
      , oneWeekAhead = moment().add('week', 1)
      , twoWeeksAhead = moment().add('week', 2)
      , overrides =
         [ { liveDate: oneWeekAhead, expiryDate: twoWeeksAhead }
         ]
      , listId
      , listService = createListService()
      , sectionService = createSectionService()
      , articleService = createArticleService()

    async.series(
      [ publishedArticleMaker.createArticles(3, articleService, articles)
      , function (cb) {
          listService.create(
            { type: 'manual'
            , name: 'test list'
            , items: articles.map(function (article, i) {
                return { isCustom: false, itemId: article._id, overrides: overrides[i] }
              })
            , limit: 100
            }
          , function (err, res) {
              if (err) return cb(err)
              listId = res._id
              cb(null)
            }
          )
        }
      ]
    , function (err) {
        if (err) return done(err)
        var aggregate = createAggregator(listService, sectionService, articleService, { logger: logger })
        aggregate(listId, null, null, mockSection, function (err, results) {
          if (err) return done(err)
          results.length.should.equal(2)
          done()
        })
      }
    )
  })

  it('should respect live and expiry dates of non live custom items', function (done) {

    var customListItems = []
      , oneWeekAhead = moment().add('week', 1)
      , twoWeeksAhead = moment().add('week', 2)
      , listId
      , listService = createListService()
      , sectionService = createSectionService()
      , articleService = createArticleService()

    async.series(
      [ customListItemMaker(customListItems, { liveDate: oneWeekAhead, expiryDate: twoWeeksAhead })
      , customListItemMaker(customListItems)
      , customListItemMaker(customListItems)
      , function (cb) {
          listService.create(
            { type: 'manual'
            , name: 'test list'
            , items: customListItems
            , limit: 100
            }
          , function (err, res) {
              listId = res._id
              cb(null)
            })
        }
      ]
    , function (err) {
        if (err) return done(err)
        var aggregate = createAggregator(listService, sectionService, articleService, { logger: logger })
        aggregate(listId, null, null, mockSection, function (err, results) {
          results.length.should.equal(2)
          done()
        })
      }
    )
  })

  it('should work when there are expired normal items and live custom items', function (done) {

    var customListItems = []
      , oneWeekAgo = moment().subtract('week', 1)
      , twoWeeksAgo = moment().subtract('week', 2)
      , listId
      , listService = createListService()
      , sectionService = createSectionService()
      , articleService = createArticleService()

    async.series(
      [ publishedArticleMaker(articleService, customListItems, { liveDate: twoWeeksAgo, expiryDate: oneWeekAgo })
      , customListItemMaker(customListItems)
      , customListItemMaker(customListItems)
      , function (cb) {
          listService.create(
            { type: 'manual'
            , name: 'test list'
            , items: customListItems
            , limit: 100
            }
          , function (err, res) {
              listId = res._id
              cb(null)
            }
          )
        }
      ]
    , function (err) {
        if (err) return done(err)
        var aggregate = createAggregator(listService, sectionService, articleService, { logger: logger })
        aggregate(listId, null, null, mockSection, function (err, results) {
          if (err) return done(err)
          results.length.should.equal(2)
          done()
        })
      }
    )
  })

  it('should work when there are expired custom items, live custom items and live normal items', function (done) {

    var listItems = []
      , oneWeekAgo = moment().subtract('week', 1)
      , twoWeeksAgo = moment().subtract('week', 2)
      , listId
      , listService = createListService()
      , sectionService = createSectionService()
      , articleService = createArticleService()

    async.series(
      [ customListItemMaker(listItems, { liveDate: twoWeeksAgo, expiryDate: oneWeekAgo })
      , publishedArticleMaker.createArticles(2, articleService, listItems)
      , customListItemMaker(listItems)
      , customListItemMaker(listItems)
      , function (cb) {
          listService.create(
            { type: 'manual'
            , name: 'test list'
            , items: listItems.map(function (item) {
                if (!item.isCustom) return { isCustom: false, itemId: item._id }
                return item
              })
            , limit: 100
            }
          , function (err, res) {
              listId = res._id
              cb(null)
            }
          )
        }
      ]
    , function (err) {
        if (err) return done(err)
        var aggregate = createAggregator(listService, sectionService, articleService, { logger: logger })
        aggregate(listId, null, null, mockSection, function (err, results) {
          if (err) return done(err)
          results.length.should.equal(4)
          done()
        })
      }
    )
  })

  it('should adhere to the list limit with custom items', function (done) {

    var listItems = []
      , listId
      , listService = createListService()
      , sectionService = createSectionService()
      , articleService = createArticleService()

    async.series(
      [ publishedArticleMaker(articleService, listItems)
      , customListItemMaker(listItems)
      , function (cb) {
          listService.create(
            { type: 'manual'
            , name: 'test list'
            , items: listItems.map(function (item) {
                if (!item.isCustom) return { isCustom: false, itemId: item._id }
                return item
              })
            , limit: 1
            }
          , function (err, res) {
              listId = res._id
              cb(null)
            })
        }
      ]
    , function (err) {
        if (err) return done(err)
        var aggregate = createAggregator(listService, sectionService, articleService, { logger: logger })
        aggregate(listId, null, null, mockSection, function (err, results) {
          if (err) return done(err)
          results.length.should.equal(1)
          done()
        })
      })
  })

  it('should return a list of custom expired items in relation to date parameter', function (done) {
    var listItems = []
      , oneWeekAgo = momentToDate(moment().subtract('week', 1))
      , twoWeeksAgo = momentToDate(moment().subtract('week', 2))
      , oneAndAHalfWeeksAgo = momentToDate(moment().subtract('week', 1).subtract('days', 3))
      , listId
      , listService = createListService()
      , sectionService = createSectionService()
      , articleService = createArticleService()

    async.series(
      [ customListItemMaker(listItems, { liveDate: twoWeeksAgo, expiryDate: oneWeekAgo })
      , customListItemMaker(listItems, { liveDate: twoWeeksAgo, expiryDate: oneWeekAgo })
      , customListItemMaker(listItems, { liveDate: twoWeeksAgo, expiryDate: oneWeekAgo })
      , function (cb) {
          listService.create(
            { type: 'manual'
            , name: 'test list'
            , items: listItems
            , limit: 100
            }
          , function (err, res) {
              listId = res._id
              cb()
            })
        }
      ]
    , function (err) {
        if (err) return done(err)
        var aggregate = createAggregator(listService, sectionService, articleService
            , { logger: logger, date: oneAndAHalfWeeksAgo })
        aggregate(listId, null, null, mockSection, function (err, results) {
          if (err) return done(err)
          results.length.should.equal(3)
          done()
        })
      }
    )
  })

  it('should return a list of articles in relation to date parameter', function (done) {
    var listItems = []
      , oneWeekAgo = momentToDate(moment().subtract('week', 1))
      , twoWeeksAgo = momentToDate(moment().subtract('week', 2))
      , oneAndAHalfWeeksAgo = momentToDate(moment().subtract('week', 1).subtract('days', 3))
      , listId
      , listService = createListService()
      , sectionService = createSectionService()
      , articleService = createArticleService()

    async.series(
      [ publishedArticleMaker(articleService, listItems, { liveDate: twoWeeksAgo, expiryDate: oneWeekAgo })
      , publishedArticleMaker(articleService, listItems, { liveDate: twoWeeksAgo, expiryDate: oneWeekAgo })
      , function (cb) {
          listService.create(
            { type: 'manual'
            , name: 'test list'
            , items: listItems.map(function (item) { return { isCustom: false, itemId: item._id }})
            , limit: 100
            }
          , function (err, res) {
              listId = res._id
              cb()
            })
        }
      ]
    , function (err) {
        if (err) return done(err)
        var aggregate = createAggregator(listService, sectionService, articleService
            , { logger: logger, date: oneAndAHalfWeeksAgo })
        aggregate(listId, null, null, mockSection, function (err, results) {
          if (err) return done(err)
          results.length.should.equal(2)
          done()
        })
      }
    )
  })

  it('should return a combination of standard and custom items in relation to date parameter', function (done) {
    var listItems = []
      , oneWeekAgo = momentToDate(moment().subtract('week', 1))
      , twoWeeksAgo = momentToDate(moment().subtract('week', 2))
      , oneAndAHalfWeeksAgo = momentToDate(moment().subtract('week', 1).subtract('days', 3))
      , listId
      , listService = createListService()
      , sectionService = createSectionService()
      , articleService = createArticleService()

    async.series(
      [ publishedArticleMaker(articleService, listItems, { liveDate: twoWeeksAgo, expiryDate: oneWeekAgo })
      , customListItemMaker(listItems, { type: 'custom', liveDate: twoWeeksAgo, expiryDate: oneWeekAgo })
      , publishedArticleMaker(articleService, listItems, { liveDate: twoWeeksAgo, expiryDate: oneWeekAgo })
      , customListItemMaker(listItems, { type: 'custom', liveDate: twoWeeksAgo, expiryDate: oneWeekAgo })
      , function (cb) {
          listService.create(
            { type: 'manual'
            , name: 'test list'
            , items: listItems.map(function (item) {
                if (!item.isCustom) return { isCustom: false, itemId: item._id }
                return item
              })
            , limit: 100
            }
          , function (err, res) {
              listId = res._id
              cb()
            })
        }
      ]
    , function (err) {
        if (err) return done(err)
        var aggregate = createAggregator(listService, sectionService, articleService
            , { logger: logger, date: oneAndAHalfWeeksAgo })
        aggregate(listId, null, null, mockSection, function (err, results) {
          if (err) return done(err)
          results.length.should.equal(4)
          done()
        })
      }
    )
  })

  it('should override the live and expiry date of a non live article with date parameter', function (done) {

    var listItems = []
      , oneWeekAhead = momentToDate(moment().add('week', 1))
      , twoWeeksAhead = momentToDate(moment().add('week', 2))
      , oneWeekAgo = momentToDate(moment().subtract('week', 1))
      , twoWeeksAgo = momentToDate(moment().subtract('week', 2))
      , oneAndAHalfWeeksAgo = momentToDate(moment().subtract('week', 1).subtract('days', 3))
      , overrides =
        [ { liveDate: twoWeeksAgo, expiryDate: oneWeekAgo, customId: null }
        , {}
        , { liveDate: twoWeeksAgo, expiryDate: oneWeekAgo, customId: null }
        ]
      , listId
      , listService = createListService()
      , sectionService = createSectionService()
      , articleService = createArticleService()

    async.series(
      [ publishedArticleMaker(articleService, listItems, { liveDate: oneWeekAhead, expiryDate: twoWeeksAhead })
      // No override for this one so results should only be 2
      , publishedArticleMaker(articleService, listItems, { liveDate: oneWeekAhead, expiryDate: twoWeeksAhead })
      , publishedArticleMaker(articleService, listItems, { liveDate: oneWeekAhead, expiryDate: twoWeeksAhead })
      , function (cb) {
          listService.create(
            { type: 'manual'
            , name: 'test list'
            , items: listItems.map(function (item, i) {
                return { isCustom: false, itemId: item._id, overrides: overrides[i] }
              })
            , limit: 100
            }
          , function (err, res) {
              listId = res._id
              cb(null)
            })
        }
      ]
    , function (err) {
        if (err) return done(err)
        var aggregate = createAggregator(listService, sectionService, articleService
            , { logger: logger, date: oneAndAHalfWeeksAgo })
        aggregate(listId, null, null, mockSection, function (err, results) {
          if (err) return done(err)
          results.length.should.equal(2)
          done()
        })
      }
    )
  })

  it('should allow the overriding of the prepareManualQuery function', function (done) {

    var prepareManualQueryCalled = false

    function prepareManualQuery() {
      prepareManualQueryCalled = true
      return { options: {}, query: {} }
    }

    var listService =
          { read: function (a, cb) {
              cb(null, { type: 'manual', items: [] })
            }
          }
      , sectionService =
          { findPublic: function (a, b, cb) {
              cb(null, [])
            }
          }
      , articleService =
          { findPublic: function (a, b, cb) {
              cb(null, [])
            }
          }
      , aggregate = createAggregator(listService, sectionService, articleService
        , { logger: logger, prepareManualQuery: prepareManualQuery })

    aggregate('123', null, null, mockSection, function (error) {
      if (error) return done(error)
      prepareManualQueryCalled.should.equal(true)
      done()
    })
  })

})
