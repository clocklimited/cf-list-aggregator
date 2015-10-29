module.exports = createSchema

var schemata = require('schemata')
  , validity = require('validity')

function createSchema () {
  return schemata(
    { _id: { type: String }
    , state: { type: String, validators: { all: [ validity.required ] } }
    , headline: { type: String, validators: { all: [ validity.required ] } }
    , sections: { type: Array }
    , tags: { type: Array }
    , displayDate: { type: Date, validators: { all: [ validity.required ] } }
    , liveDate: { type: Date, validators: { all: [ validity.required ] } }
    , expiryDate: { type: Date, validators: { all: [ validity.required ] } }
    })
}
