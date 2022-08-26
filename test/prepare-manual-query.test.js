var prepareManualQuery = require('../lib/prepare-manual-query')
  , assert = require('assert')

describe('prepareManualQuery()', function () {

  it('should limit the number of id\'s queried by the limit specified', function () {
    var q = prepareManualQuery(
      [ { _id: 0, shortTitle: 'James' }
        , { _id: 1, shortTitle: 'Robert' }
      ],
      1
    )
    assert.deepEqual(q.query._id.$in, [0])
  })
})
