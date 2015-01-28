var itemFixtures = require('../fixtures/item')

module.exports = function draftArticleMaker(articleService) {
  return function (cb) {
    articleService.create(itemFixtures.validNew, cb)
  }
}
