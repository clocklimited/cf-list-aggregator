module.exports = prepareAutoQuery

function prepareAutoQuery (list) {

  var q = { query: {}, options: {}, overrides: null }
    , properties = [ 'tags', 'sections' ]

  properties.forEach(function (p) {
    if (Array.isArray(list[p]) && list[p].length) q.query[p] = { $in: list[p] }
  })

  // TODO: enable other order options by faciliting them being passed in
  // either as a function, or as a mongo-like sort array,
  // e.g [ [ 'customProperty', 'asc' ] ]

  switch (list.order) {
  case 'recent':
    q.options.sort = [ [ 'displayDate', 'desc' ] ]
    break
  }

  return q

}
