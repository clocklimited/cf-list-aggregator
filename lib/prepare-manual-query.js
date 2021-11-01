module.exports = prepareManualQuery

function prepareManualQuery (list) {

  var q = { query: {}, options: {}, overrides: null }
    , ids = list.items
        .filter(function (item) { return !item.isCustom })
        .map(function (item) { return item.itemId })

  q.query._id = { $in: ids }
  q.overrides = list.items

  if (list.order === 'recent') {
    q.options.sort = { displayDate: -1 }
  }
  
  return q

}
