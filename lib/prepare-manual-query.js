module.exports = prepareManualQuery

function prepareManualQuery(list, IdType) {

  var q = { query: {}, options: {}, overrides: null }
    , ids = []

  list.items.forEach(function (item) {
    if (!item.isCustom) ids.push(new IdType(item.itemId))
  })

  q.query._id = { $in: ids }
  q.overrides = list.items

  return q

}
