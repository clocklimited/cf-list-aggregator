module.exports = prepareManualQuery

function prepareManualQuery (list, limit) {

  var q = { query: {}, options: {}, overrides: null }
    , ids = list.items
        .filter(function (item) { return !item.isCustom })
        .map(function (item) { return item.itemId })

  if (limit) {
    list = list.slice(0, limit)
  }

  q.query._id = { $in: ids }
  q.overrides = list.items

  if (list.order === 'recent') {
    q.options.sort = { displayDate: -1 }
  }

  return q

}
