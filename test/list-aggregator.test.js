var createAggregator = require('..')
  , async = require('async')
  , should = require('should')
  , createDedupe = require('doorman')
  , logger = require('mc-logger')
  , saveMongodb = require('save-mongodb')
  , mockSection = { _id: '123' }
  , createArticleService
  , createSectionService
  , createListService = require('./lib/mock-list-service')
  , customListItemMaker = require('./lib/custom-list-item-maker')
  , publishedArticleMaker = require('./lib/published-article-maker')
  , draftArticleMaker = require('./lib/draft-article-maker')
  , dbConnect = require('./lib/db-connection')
  , dbConnection

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

describe('List Aggregator', function () {

  describe('createAggregator()', function () {

    it('should be a function and return a function', function () {
      createAggregator.should.be.type('function')
      createAggregator().should.be.type('function')
    })

  })

  describe('aggregate()', function () {

    it('should not error when an object that isn\'t a list is passed', function (done) {

      var listService = createListService()
        , sectionService = createSectionService()
        , articleService = createArticleService()

      createAggregator(listService, sectionService, articleService
        , { logger: logger })({}, null, null, mockSection, function (err, results) {
        if (err) return done(err)
        results.should.have.length(0)
        done()
      })
    })

    it('should not have duplicates if a deduper is not injected', function (done) {
      var articles = []
        , listIds = []
        , listService = createListService()
        , sectionService = createSectionService()
        , articleService = createArticleService()

      async.series(
        [ publishedArticleMaker.createArticles(5, articleService, articles)
        , draftArticleMaker(articleService)
        , function (cb) {
            listService.create(
              { type: 'auto'
              , name: 'test list'
              , order: 'recent'
              , limit: 100
              }
              , function (err, res) {
                  listIds.push(res._id)
                  cb(null)
                })
          }
        , function (cb) {
            listService.create(
              { type: 'auto'
              , name: 'test list'
              , order: 'recent'
              , limit: 100
              }
              , function (err, res) {
                  listIds.push(res._id)
                  cb(null)
                })
          }
        ], function (err) {
          if (err) throw err

          var aggregate = createAggregator(listService, sectionService, articleService, { logger: logger })

          aggregate(listIds, null, null, mockSection, function (err, results) {
            should.not.exist(err)
            results.should.have.length(5)
            done()
          })

        })
    })

  })

  it('should not have duplicates if a deduper is injected', function (done) {
    var articles = []
      , listIds = []
      , listService = createListService()
      , sectionService = createSectionService()
      , articleService = createArticleService()

    async.series(
      [ publishedArticleMaker.createArticles(5, articleService, articles)
      , draftArticleMaker(articleService)
      , function (cb) {
          listService.create(
            { type: 'auto'
            , name: 'test list'
            , order: 'recent'
            , limit: 100
            }
            , function (err, res) {
                listIds.push(res._id)
                cb(null)
              })
        }
      , function (cb) {
          listService.create(
            { type: 'auto'
            , name: 'test list'
            , order: 'recent'
            , limit: 100
            }
            , function (err, res) {
                listIds.push(res._id)
                cb(null)
              })
        }
      ], function (err) {
        if (err) throw err

        var aggregate = createAggregator(listService, sectionService, articleService, { logger: logger })
        aggregate(listIds, createDedupe(), null, mockSection, function (err, results) {
          should.not.exist(err)
          results.should.have.length(5)
          done()
        })

      })
  })

  it('should return a limited set with deduper', function (done) {
    var articles = []
      , listIds = []
      , listService = createListService()
      , sectionService = createSectionService()
      , articleService = createArticleService()

    async.series(
      [ publishedArticleMaker.createArticles(11, articleService, articles)
      , draftArticleMaker(articleService)
      , function (cb) {
          listService.create(
            { type: 'auto'
            , name: 'test list'
            , order: 'recent'
            , limit: 2
            }
            , function (err, res) {
                listIds.push(res._id)
                cb(null)
              })
        }
      , function (cb) {
          listService.create(
            { type: 'auto'
            , name: 'test list'
            , order: 'recent'
            , limit: 100
            }
            , function (err, res) {
                listIds.push(res._id)
                cb(null)
              })
        }
      ], function (err) {
        if (err) throw err

        var aggregate = createAggregator(listService, sectionService, articleService, { logger: logger })
          , dedupe = createDedupe()

        dedupe(articles[1].articleId)

        sectionService.create({}, function (err, section) {
          if (err) return done(err)
          aggregate(listIds, dedupe, 6, section, function (err, results) {
            should.not.exist(err)
            results.should.have.length(6)
            done()
          })
        })
      })
  })

  it('should return a limited set with deduper on a list of just custom items', function (done) {
    var listItems = []
      , listIds = []
      , listService = createListService()
      , sectionService = createSectionService()
      , articleService = createArticleService()

    async.series(
      [ customListItemMaker(listItems)
      , customListItemMaker(listItems)
      , customListItemMaker(listItems)
      , customListItemMaker(listItems)
      , customListItemMaker(listItems)
      , function (cb) {
          listService.create(
            { type: 'manual'
            , name: 'manual test list'
            , items: listItems
            , limit: 100
            }
            , function (err, res) {
                listIds.push(res._id)
                cb(null)
              })
        }
      , function (cb) {
          listService.create(
            { type: 'auto'
            , name: 'test list'
            , order: 'recent'
            , limit: 100
            }
            , function (err, res) {
                listIds.push(res._id)
                cb(null)
              })
        }

      ], function (err) {
        if (err) throw err

        var aggregate = createAggregator(listService, sectionService, articleService, { logger: logger })
          , dedupe = createDedupe()

        dedupe(listItems[1].properties._id)

        sectionService.create({}, function (err, section) {
          if (err) return done(err)
          aggregate(listIds, dedupe, 4, section, function (err, results) {
            if (err) return done(err)
            results.should.have.length(4)
            done()
          })
        })
      })
  })
})
