var prepareManualQuery = require('../lib/prepare-manual-query'), assert = require('assert')

describe('prepareManualQuery()', function () {

  it('should limit the number of id\'s queried by the limit specified', function () {
    var list = prepareManualQuery(
      [ { _id: 0, shortTitle: 'James' }
      , { _id: 1, shortTitle: 'Robert' }
      ]
    , [ { itemId: 1, overrides: { shortTitle: 'Bob' } }
      , { itemId: 0, overrides: { shortTitle: 'Jim' } }
      ]), limit = 2
    list.slice(0, limit)
    assert.deepEqual(list, [ { _id: 0, shortTitle: 'Jim' }, { _id: 1, shortTitle: 'Bob' } ])
  })
})
