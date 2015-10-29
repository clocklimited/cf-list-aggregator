var createAggregator = require('..')
  , async = require('async')
  , saveMongodb = require('save-mongodb')
  , should = require('should')
  , createListService = require('./lib/mock-list-service')
  , createArticleService = require('./lib/mock-list-service')
  , dbConnect = require('./lib/db-connection')
  , publishedArticleMaker = require('./lib/published-article-maker')
  , logger = require('mc-logger')
  , mockSection = { _id: '123' }
  , createSectionService
  , dbConnection

before(function (done) {
  dbConnect.connect(function (err, db) {
    if (err) return done(err)
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
beforeEach(function () {
  var save = saveMongodb(dbConnection.collection('article' + Date.now()))
  createArticleService = require('./lib/mock-article-service')(save)
})

describe('List aggregator fields option', function () {

  it('should allow a fields option to be passed to define fields to return', function (done) {
    var articles = []
      , listId
      , listService = createListService()
      , sectionService = createSectionService()
      , articleService = createArticleService()

    async.series(
      [ publishedArticleMaker.createArticles(3, articleService, articles)
      , function (cb) {
          listService.create(
            { type: 'auto'
            , name: 'test list'
            , order: 'recent'
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
        var aggregate = createAggregator(listService, sectionService, articleService
          , { logger: logger, fields: { headline: 1 } })
        aggregate(listId, null, null, mockSection, function (err, results) {
          if (err) return done(err)
          results.should.have.length(3)
          results.forEach(function (result) {
            // _id is always returned from mongo
            Object.keys(result).length.should.equal(2)
            var containsId = Object.keys(result).indexOf('_id') > -1
            containsId.should.equal(true)
          })
          done()
        })
      })
  })

  it('should allow the fields option to be an array of fields', function (done) {
    var articles = []
      , listId
      , listService = createListService()
      , sectionService = createSectionService()
      , articleService = createArticleService()

    async.series(
      [ publishedArticleMaker.createArticles(3, articleService, articles)
      , function (cb) {
          listService.create(
            { type: 'auto'
            , name: 'test list'
            , order: 'recent'
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

        var aggregate = createAggregator(listService, sectionService, articleService
          , { logger: logger, fields: [ 'headline', 'tags' ] })

        aggregate(listId, null, null, mockSection, function (err, results) {
          if (err) return done(err)
          results.should.have.length(3)
          results.forEach(function (result) {
            // _id is always returned from mongo
            Object.keys(result).length.should.equal(3)
            var containsId = Object.keys(result).indexOf('_id') > -1
            containsId.should.equal(true)
          })
          done()
        })
      })
  })

  it('should have a default fields object which gets used if no fields provided', function (done) {
    var articles = []
      , listId
      , listService = createListService()
      , sectionService = createSectionService()
      , articleService = createArticleService()

    async.series(
      [ publishedArticleMaker.createArticles(1, articleService, articles)
      , function (cb) {
          listService.create(
            { type: 'auto'
            , name: 'test list'
            , order: 'recent'
            , limit: 100
            }
            , function (err, res) {
                if (err) return cb(err)
                listId = res._id
                cb(null)
              })
        }
      ], function (err) {
        if (err) throw err

        var aggregate = createAggregator(listService, sectionService, articleService
          , { logger: logger })

        aggregate(listId, null, null, mockSection, function (err, results) {
          should.not.exist(err)
          results.should.have.length(1)
          results.forEach(function (result) {
            var properties = [ 'headline' ]

            properties.forEach(function (prop) {
              should.exist(result[prop])
            })

            Object.keys(properties).length.should.equal(properties.length)
          })
          done()
        })
      })
  })

  it('should allow the passing of an array which will get converted into a mongo fields query')
})
