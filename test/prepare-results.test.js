var prepareResults = require('../lib/prepare-results')
  , assert = require('assert')

describe('prepare()', function () {

  it('should not make assumptions about the order of items', function () {
    var prepared = prepareResults(
        [ { _id: 0, shortTitle: 'James' }
        , { _id: 1, shortTitle: 'Robert' }
        ]
      , [ { itemId: 1, overrides: { shortTitle: 'Bob' } }
        , { itemId: 0, overrides: { shortTitle: 'Jim' } }
        ])
    assert.deepEqual(prepared, [ { _id: 0, shortTitle: 'Jim' }, { _id: 1, shortTitle: 'Bob' } ])
  })

})
