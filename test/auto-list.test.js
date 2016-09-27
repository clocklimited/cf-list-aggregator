var createAggregator = require('..')
  , saveMongodb = require('save-mongodb')
  , async = require('async')
  , should = require('should')
  , moment = require('moment')
  , eql = require('fleet-street/lib/sequential-object-eql')
  , returnedArticle = require('./returned-article-fixture')
  , sectionFixtures = require('fleet-street/test/section/fixtures')
  , publishedArticleMaker = require('./lib/published-article-maker')
  , draftArticleMaker = require('./lib/draft-article-maker')
  , momentToDate = require('./lib/moment-to-date')
  , logger = require('./null-logger')
  , createListService = require('./mock-list-service')
  , dbConnect = require('./lib/db-connection')
  , createArticleService
  , createSectionService
  , section
  , sectionService
  , dbConnection

before(function(done) {
  dbConnect.connect(function (err, db) {
    dbConnection = db

    createSectionService = require('./mock-section-service')(saveMongodb(dbConnection.collection('section')))

    sectionService = createSectionService()
    sectionService.create(sectionFixtures.newVaildModel, function (err, newSection) {
      section = newSection
      done()
    })
  })
})

// Clean up after tests
after(dbConnect.disconnect)

// Each test gets a new article service
beforeEach(function() {
  createArticleService = require('./mock-article-service')
  (saveMongodb(dbConnection.collection('article' + Date.now())))
})

describe('List aggregator (for an auto list)', function () {

  it('should return articles whose tags match those of the list', function (done) {

    var articles = []
      , listId
      , listService = createListService()
      , sectionService = createSectionService()
      , articleService = createArticleService()

    async.series(
      [ publishedArticleMaker.createArticles(2, articleService,
        articles, { tags: [ { tag: 'test-tag', type: 'test-type' } ] })
      , publishedArticleMaker.createArticles(3, articleService, [])
      , publishedArticleMaker(articleService, [], { tags: [ { tag: 'test-tag2', type: 'test-type' } ] })
      , publishedArticleMaker(articleService, articles, { tags:
          [ { tag: 'test-tag', type: 'test-type' }
          , { tag: 'test-tag2', type: 'test-type' }
          ] })
      , function (cb) {
          listService.create(
            { type: 'auto'
            , name: 'test list'
            , tags: [ { tag: 'test-tag', type: 'test-type' } ]
            , order: 'recent'
            , limit: 100
            }
            , function (err, res) {
                listId = res._id
                cb(null)
              })
        }
      ], function (err) {
        if (err) throw err

        var aggregate = createAggregator(listService, sectionService, articleService, { logger: logger })
        aggregate(listId, null, null, section, function (err, results) {
          should.not.exist(err)
          results.should.have.length(3)
          results.forEach(function (result, i) {
            eql(returnedArticle({ _id: articles[i].articleId,
              tags: articles[i].tags, displayDate: result.displayDate }),
            result, false, true)
          })
          done()
        })

      })
  })

  it('should return articles from a particular sections', function (done) {

    var articles = []
      , listId
      , listService = createListService()
      , sectionService = createSectionService()
      , articleService = createArticleService()

    sectionService.find({}, function (err, sections) {
      if (err) return done(err)
      async.series(
        [ publishedArticleMaker(articleService, articles, { section: sections[0]._id })
        , publishedArticleMaker.createArticles(3, articleService, articles, { section: sections[1]._id })
        , publishedArticleMaker.createArticles(2, articleService, [])
        , draftArticleMaker(articleService)
        , publishedArticleMaker(articleService, [], { section: sections[2]._id })
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
          if (err) throw err

          var aggregate = createAggregator(listService, sectionService, articleService, { logger: logger })

          aggregate(listId, null, null, section, function (err, results) {
            should.not.exist(err)
            results.should.have.length(4)
            results.forEach(function (result, i) {
              eql(returnedArticle(
                { _id: articles[i].articleId, displayDate: result.displayDate })
                , result, false, true)
            })
            done()
          })

        })

    })

  })

  it ('should return articles of a particular type', function(done) {
    var articles = []
      , listId
      , listService = createListService()
      , sectionService = createSectionService()
      , articleService = createArticleService()

    async.series(
      [ publishedArticleMaker.createArticles(2, articleService, articles, { type: 'article' })
      , publishedArticleMaker.createArticles(2, articleService, articles, { type: 'gallery' })
      , publishedArticleMaker.createArticles(2, articleService, [], { type: 'styleselector' })
      , draftArticleMaker(articleService, [], { type: 'article' })
      , publishedArticleMaker(articleService, [], { type: 'article' })
      , function (cb) {
          listService.create(
            { type: 'auto'
            , name: 'test list'
            , order: 'recent'
            , articleTypes: [ 'article' ]
            , limit: 100
            }
            , function (err, res) {
                listId = res._id
                cb(null)
              })
        }
      ], function (err) {
        if (err) throw err

        var aggregate = createAggregator(listService, sectionService, articleService, { logger: logger })

        aggregate(listId, null, null, section, function (err, results) {
          should.not.exist(err)
          results.should.have.length(3)
          results.forEach(function (result, i) {
            eql(returnedArticle(
              { _id: articles[i].articleId, displayDate: result.displayDate })
              , result, false, true)
          })
          done()
        })

      })
  })

  it ('should return articles of a particular sub type', function(done) {
    var articles = []
      , listId
      , listService = createListService()
      , sectionService = createSectionService()
      , articleService = createArticleService()

    async.series(
      [ publishedArticleMaker(articleService, articles, { subType: 'Portrait' })
      , publishedArticleMaker(articleService, articles, { subType: 'Landscape' })
      , publishedArticleMaker.createArticles(2, articleService, articles, { subType: 'Video' })
      , publishedArticleMaker.createArticles(2, articleService, [], { subType: 'Portrait' })
      , draftArticleMaker(articleService, [], { subType: 'Portrait' })
      , publishedArticleMaker(articleService, [], { subType: 'Landscape' })
      , function (cb) {
          listService.create(
            { type: 'auto'
            , name: 'test list'
            , order: 'recent'
            , articleSubTypes: [ 'Portrait' ]
            , limit: 100
            }
            , function (err, res) {
                listId = res._id
                cb(null)
              })
        }
      ], function (err) {
        if (err) throw err

        var aggregate = createAggregator(listService, sectionService, articleService, { logger: logger })

        aggregate(listId, null, null, section, function (err, results) {
          should.not.exist(err)
          results.should.have.length(3)
          results.forEach(function (result, i) {
            eql(returnedArticle(
              { _id: articles[i].articleId, displayDate: result.displayDate })
              , result, false, true)
          })
          done()
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
                listId = res._id
                cb(null)
              })
        }
      ], function (err) {
        if (err) throw err

        var aggregate = createAggregator(listService, sectionService, articleService, { logger: logger })

        aggregate(listId, null, null, section, function (err, results) {
          should.not.exist(err)
          results.should.have.length(5)
          results.forEach(function (result, i) {
            eql(returnedArticle(
              { _id: articles[articles.length - i - 1].articleId
              , displayDate: articles[articles.length - i - 1].displayDate })
              , result, false, true)
          })
          done()
        })

      })
  })

  it('should order the articles alphabetically', function (done) {

    var articles = []
      , listId
      , listService = createListService()
      , sectionService = createSectionService()
      , articleService = createArticleService()

    async.series(
      [ publishedArticleMaker(articleService, articles, { shortTitle: 'j' })
      , publishedArticleMaker(articleService, articles, { shortTitle: 'a' })
      , publishedArticleMaker(articleService, articles, { shortTitle: '9' })
      , draftArticleMaker(articleService)
      , publishedArticleMaker(articleService, articles, { shortTitle: '0' })
      , publishedArticleMaker(articleService, articles, { shortTitle: 'z' })
      , function (cb) {
          listService.create(
            { type: 'auto'
            , name: 'test list'
            , order: 'alphabetical'
            , limit: 100
            }
            , function (err, res) {
                listId = res._id
                cb(null)
              })
        }
      ], function (err) {
        if (err) throw err

        var aggregate = createAggregator(listService, sectionService, articleService, { logger: logger })

        aggregate(listId, null, null, section, function (err, results) {
          should.not.exist(err)
          results.should.have.length(5)
          results.forEach(function (result, i) {
            eql(returnedArticle(
              { _id: articles[articles.length - i - 1].articleId
              , displayDate: result.displayDate
              , shortTitle: articles[articles.length - i - 1].shortTitle })
              , result, false, true)
          })
          done()
        })

      })
  })

  it('should order the articles by number of comments')
  it('should order the articles by popularity')

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
                listId = res._id
                cb(null)
              })
        }
      ], function (err) {
        if (err) throw err

        var aggregate = createAggregator(listService, sectionService, articleService, { logger: logger })

        aggregate(listId, null, null, section, function (err, results) {
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
      [ publishedArticleMaker.createArticles(2, articleService, articles,
          { liveDate: twoWeeksAgo, expiryDate: oneWeekAgo, section: 'preview-section' })
      , function (cb) {
          listService.create(
            { type: 'auto'
            , name: 'test list'
            , sections: ['preview-section']
            , limit: 100
            }
          , function (err, res) {
              listId = res._id
              cb()
            }
          )
        }
      ]
    , function (err) {
        if (err) throw err

        var aggregate = createAggregator(listService, sectionService, articleService,
          { logger: logger, date: oneAndAHalfWeeksAgo })

        aggregate(listId, null, null, section, function (err, results) {
          results.length.should.equal(2)
          done()
        })
      }
    )
  })

  it('should not include any manual list items that are present on the list in the aggregation', function (done) {

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
            , articles: [ { itemId: 'abc123', isCustom: false } ]
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
        aggregate(listId, null, null, section, function (err, results) {
          should.not.exist(err)
          results.should.have.length(3, 'Manual list items were pulled in by the aggregation')
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
      [ publishedArticleMaker(articleService, articles, { shortTitle: 'j' })
      , publishedArticleMaker(articleService, articles, { shortTitle: 'a', longTitle: 'bar' })
      , publishedArticleMaker(articleService, articles, { shortTitle: '9', longTitle: 'bar' })
      , draftArticleMaker(articleService)
      , publishedArticleMaker(articleService, articles, { shortTitle: '0', longTitle: 'bar'  })
      , publishedArticleMaker(articleService, articles, { shortTitle: 'z' })
      , draftArticleMaker(articleService)
      , function (cb) {
          listService.create(
            { type: 'auto'
            , name: 'test list'
            , order: 'recent'
            , limit: 3
            }
            , function (err, res) {
                listId = res._id
                cb(null)
              })
        }
      ], function (err) {
        if (err) throw err

        function prepareAutoQuery() {
          var q = { query: {}, options: {}, overrides: null }

          q.query.longTitle = 'bar'
          q.options.sort = [ [ 'shortTitle', 'asc' ] ]

          return q
        }

        var options = { logger: logger, prepareAutoQuery: prepareAutoQuery }
          , aggregate = createAggregator(listService, sectionService, articleService, options)

        aggregate(listId, null, null, section, function (err, results) {
          should.not.exist(err)
          results.should.have.length(3)

          results.forEach(function (article, i) {
            eql(returnedArticle(
              { _id: articles[articles.length - i - 1].articleId
              , displayDate: article.displayDate
              , shortTitle: articles[articles.length - i - 1].shortTitle })
              , article, false, true)

            article.longTitle.should.equal('bar')
          })

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
      [ publishedArticleMaker(articleService, articles, { shortTitle: 'j' })
      , publishedArticleMaker(articleService, articles, { shortTitle: 'a' })
      , publishedArticleMaker(articleService, articles, { shortTitle: '9' })
      , draftArticleMaker(articleService)
      , publishedArticleMaker(articleService, articles, { shortTitle: '0' })
      , publishedArticleMaker(articleService, articles, { shortTitle: 'z' })
      , draftArticleMaker(articleService)
      , function (cb) {
          listService.create(
            { type: 'auto'
            , name: 'test list'
            , order: 'alphabetical'
            , limit: 3
            }
            , function (err, res) {
                listId = res._id
                cb(null)
              })
        }
      ], function (err) {
        if (err) throw err

        var options = { logger: logger, prepareAutoQuery: {} }
          , aggregate = createAggregator(listService, sectionService, articleService, options)

        aggregate(listId, null, null, section, function (err, results) {
          should.not.exist(err)
          results.should.have.length(3)

          results.forEach(function (article, i) {
            eql(returnedArticle(
              { _id: articles[articles.length - i - 1].articleId
              , displayDate: article.displayDate
              , shortTitle: articles[articles.length - i - 1].shortTitle })
              , article, false, true)

          })

          done()
        })

      })
  })
})
