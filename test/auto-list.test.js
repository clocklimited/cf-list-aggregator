var createAggregator = require('..')
  , saveMongodb = require('save-mongodb')
  , async = require('async')
  , should = require('should')
  , moment = require('moment')
  , assert = require('assert')
  , mockSection = { _id: '123' }
  , publishedArticleMaker = require('./lib/published-article-maker')
  , draftArticleMaker = require('./lib/draft-article-maker')
  , momentToDate = require('./lib/moment-to-date')
  , logger = require('mc-logger')
  , createListService = require('./lib/mock-list-service')
  , dbConnect = require('./lib/db-connection')
  , createArticleService
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

describe('List aggregator (for an auto list)', function () {

  it('should return articles whose tags match those of the list', function (done) {

    var articles = []
      , listId
      , listService = createListService()
      , sectionService = createSectionService()
      , articleService = createArticleService()
      , tags =
        [ { tag: 'test-tag', type: 'test-type' }
        , { tag: 'test-tag2', type: 'test-type' }
        ]

    async.series(
      [ publishedArticleMaker.createArticles(2, articleService, articles, { tags: [ tags[0] ] })
      , publishedArticleMaker.createArticles(3, articleService, [])
      , publishedArticleMaker(articleService, [], { tags: [ tags[1] ] })
      , publishedArticleMaker(articleService, articles, { tags: [ tags[0], tags[1] ] })
      , function (cb) {
          listService.create(
            { type: 'auto'
            , name: 'test list'
            , tags: [ tags[0] ]
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

        var aggregate = createAggregator(listService, sectionService, articleService, { logger: logger })
        aggregate(listId, null, null, mockSection, function (err, results) {
          should.not.exist(err)
          results.should.have.length(3)
          function getId (item) { return item._id }
          assert.deepEqual(articles.map(getId).sort(), results.map(getId).sort())
          done()
        })

      })
  })

  it('should return articles from specified sections', function (done) {

    var articles = []
      , listId
      , listService = createListService()
      , sectionService = createSectionService()
      , articleService = createArticleService()

    async.times(3, sectionService.create.bind(sectionService, {}), function (err) {
      if (err) return done(err)
      sectionService.find({}, function (err, sections) {
        if (err) return done(err)
        async.series(
          [ publishedArticleMaker(articleService, articles, { sections: [ sections[0]._id ] })
          , publishedArticleMaker.createArticles(3, articleService, articles, { sections: [ sections[1]._id ] })
          , publishedArticleMaker.createArticles(2, articleService, [])
          , draftArticleMaker(articleService)
          , publishedArticleMaker(articleService, [], { sections: [ sections[2]._id ] })
          , function (cb) {
              listService.create(
                { type: 'auto'
                , name: 'test list'
                , order: 'recent'
                , sections: [ { id: sections[0]._id }, { id: sections[1]._id } ]
                , limit: 100
                }
                , function (err, res) {
                    if (err) return done(err)
                    listId = res._id
                    cb(null)
                  })
            }
          ], function (err) {
            if (err) return done(err)
            var aggregate = createAggregator(listService, sectionService, articleService, { logger: logger })
            aggregate(listId, null, null, mockSection, function (err, results) {
              should.not.exist(err)
              results.should.have.length(4)
              function getId (item) { return item._id }
              assert.deepEqual(articles.map(getId).sort(), results.map(getId).sort())
              done()
            })
          })
      })

    })

  })

  it('should order the articles by displayDate', function (done) {

    var articles = []
      , listId
      , listService = createListService()
      , sectionService = createSectionService()
      , articleService = createArticleService()

    async.series(
      [ publishedArticleMaker(articleService, articles, { displayDate: new Date(2011, 1, 1) })
      , publishedArticleMaker(articleService, articles, { displayDate: new Date(2012, 1, 1) })
      , publishedArticleMaker(articleService, articles, { displayDate: new Date(2013, 1, 1) })
      , draftArticleMaker(articleService)
      , publishedArticleMaker(articleService, articles, { displayDate: new Date(2014, 1, 1) })
      , publishedArticleMaker(articleService, articles, { displayDate: new Date(2015, 1, 1) })
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
        var aggregate = createAggregator(listService, sectionService, articleService, { logger: logger })
        aggregate(listId, null, null, mockSection, function (err, results) {
          should.not.exist(err)
          results.should.have.length(5)
          function getId (item) { return item._id }
          assert.deepEqual(articles.map(getId).reverse(), results.map(getId))
          done()
        })

      })
  })

  it('should limit the number of articles', function (done) {

    var listId
      , listService = createListService()
      , sectionService = createSectionService()
      , articleService = createArticleService()

    async.series(
      [ publishedArticleMaker.createArticles(5, articleService, [])
      , draftArticleMaker(articleService)
      , function (cb) {
          listService.create(
            { type: 'auto'
            , name: 'test list'
            , order: 'recent'
            , limit: 3
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
          should.not.exist(err)
          results.should.have.length(3)
          done()
        })
      })
  })

  it('should return a list of articles in relation to date parameter', function (done) {
    var articles = []
      , oneWeekAgo = momentToDate(moment().subtract('week', 1))
      , twoWeeksAgo = momentToDate(moment().subtract('week', 2))
      , oneAndAHalfWeeksAgo = momentToDate(moment().subtract('week', 1).subtract('days', 3))
      , listId
      , listService = createListService()
      , sectionService = createSectionService()
      , articleService = createArticleService()

    async.series(
      [ publishedArticleMaker.createArticles(2, articleService, articles
          , { liveDate: twoWeeksAgo, expiryDate: oneWeekAgo, sections: [ 'preview-section' ] })
      , function (cb) {
          listService.create(
            { type: 'auto'
            , name: 'test list'
            , sections: [ 'preview-section' ]
            , limit: 100
            }
          , function (err, res) {
              if (err) return done(err)
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

  it('should ignore any specific list items', function (done) {

    var listId
      , listService = createListService()
      , sectionService = createSectionService()
      , articleService = createArticleService()

    async.series(
      [ publishedArticleMaker.createArticles(5, articleService, [])
      , draftArticleMaker(articleService)
      , function (cb) {
          listService.create(
            { type: 'auto'
            , name: 'test list'
            , order: 'recent'
            , items: [ { itemId: 'abc123', isCustom: false } ]
            , limit: 3
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
          should.not.exist(err)
          results.should.have.length(3)
          done()
        })
      })
  })

  it('should allow overriding of the prepareAutoQuery function', function (done) {

    var listId
      , listService = createListService()
      , sectionService = createSectionService()
      , articleService = createArticleService()
      , articles = []

    async.series(
      [ publishedArticleMaker(articleService, articles)
      , publishedArticleMaker(articleService, articles, { headline: 'bar' })
      , publishedArticleMaker(articleService, articles, { headline: 'bar' })
      , draftArticleMaker(articleService)
      , publishedArticleMaker(articleService, articles, { headline: 'bar' })
      , publishedArticleMaker(articleService, articles)
      , draftArticleMaker(articleService)
      , function (cb) {
          listService.create(
            { type: 'auto'
            , name: 'test list'
            , order: 'recent'
            , limit: 3
            }
            , function (err, res) {
                if (err) return cb(err)
                listId = res._id
                cb(null)
              })
        }
      ], function (err) {

        if (err) throw err

        function prepareAutoQuery () {
          var q = { query: {}, options: {}, overrides: null }
          q.query.headline = 'bar'
          q.options.sort = [ [ 'headline', 'asc' ] ]
          return q
        }

        var options = { logger: logger, prepareAutoQuery: prepareAutoQuery }
          , aggregate = createAggregator(listService, sectionService, articleService, options)

        aggregate(listId, null, null, mockSection, function (err, results) {
          should.not.exist(err)
          results.should.have.length(3)
          results.forEach(function (article) { article.headline.should.equal('bar') })
          done()
        })

      })
  })

  it('should only override prepareAutoQuery if a function', function (done) {
    var listId
      , listService = createListService()
      , sectionService = createSectionService()
      , articleService = createArticleService()
      , articles = []

    async.series(
      [ publishedArticleMaker(articleService, articles, { headline: 'j' })
      , publishedArticleMaker(articleService, articles, { headline: 'a' })
      , publishedArticleMaker(articleService, articles, { headline: '9' })
      , draftArticleMaker(articleService)
      , publishedArticleMaker(articleService, articles, { headline: '0' })
      , publishedArticleMaker(articleService, articles, { headline: 'z' })
      , draftArticleMaker(articleService)
      , function (cb) {
          listService.create(
            { type: 'auto'
            , name: 'test list'
            , order: 'alphabetical'
            , limit: 3
            }
            , function (err, res) {
                if (err) return cb(err)
                listId = res._id
                cb(null)
              })
        }
      ], function (err) {

        if (err) return done(err)

        var options = { logger: logger, prepareAutoQuery: {} }
          , aggregate = createAggregator(listService, sectionService, articleService, options)

        aggregate(listId, null, null, mockSection, function (err, results) {
          should.not.exist(err)
          results.should.have.length(3)
          results.forEach(function (article, i) {
            assert.equal(articles[i].headline, article.headline)
          })
          done()
        })

      })
  })
})
