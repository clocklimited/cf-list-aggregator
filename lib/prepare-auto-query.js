module.exports = prepareAutoQuery

function prepareAutoQuery(list) {

  var q = { query: {}, options: {}, overrides: null }

  if (Array.isArray(list.tags) && list.tags.length) q.query.tags = { $in: list.tags }

  if (Array.isArray(list.sections) && list.sections.length) q.query.sections = { $in: list.sections }

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
