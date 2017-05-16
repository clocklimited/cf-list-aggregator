module.exports = prepareAutoQuery

function prepareAutoQuery (list) {

  var q = { query: {}, options: {}, overrides: null }
    , properties = [ 'tags', 'sections', 'articleTypes' ]
    , articlePropertyMap = { articleTypes: 'type' }

  properties.forEach(function (p) {
    var queryKey = articlePropertyMap[p] || p
    if (Array.isArray(list[p]) && list[p].length) q.query[queryKey] = { $in: list[p] }
  })

  // TODO: enable other order options by faciliting them being passed in
  // either as a function, or as a mongo-like sort array,
  // e.g [ [ 'customProperty', 'asc' ] ]

  switch (list.order) {
  case 'recent':
    q.options.sort = { displayDate: -1 }
    break
  case 'alphabetical':
    q.options.sort = { headline: 1 }
    break
  }

  return q

}
