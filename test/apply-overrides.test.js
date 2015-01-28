var override = require('../lib/apply-overrides')
  , assert = require('assert')

describe('override()', function () {

  it('should override supplied properties', function () {
    assert.deepEqual(override({ a: 1, b: 2 }, { a: 10 }), { a: 10, b: 2 })
  })

  it('should not override anything if no properties are supplied', function () {
    assert.deepEqual(override({ a: 1, b: 2 }, {}), { a: 1, b: 2 })
  })

  it('should only override properties that the object already has', function () {
    assert.deepEqual(override({ a: 1, b: 2 }, { c: 10 }), { a: 1, b: 2 })
  })

})
