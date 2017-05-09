var prepareAutoQuery = require('../lib/prepare-auto-query')
  , assert = require('assert')

describe('prepareAutoQuery()', function () {

  it('should support articleType queries', function () {
    var list = { articleTypes: [ 'type1', 'type2' ] }
    assert.deepEqual(prepareAutoQuery(list),
      { query: { type: { '$in': [ 'type1', 'type2' ] } }
      , options: {}
      , overrides: null
    })
  })

})

