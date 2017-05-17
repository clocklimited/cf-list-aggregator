module.exports = prepareAutoQuery

const queryExpression =
  { tags: { key: '$or', fn: tags => tags.map(tag => ({ tags: { $elemMatch: tag } })) }
  , sections: { key: 'sections', fn: sections => ({ $in: sections }) }
  }

function prepareAutoQuery (list) {

  var q = { query: {}, options: {}, overrides: null }

  Object.keys(queryExpression).forEach((property) => {
    if (Array.isArray(list[property]) && list[property].length) {
      q.query[queryExpression[property].key] = queryExpression[property].fn(list[property])
    }
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
