module.exports = getCustomItemOrder

var isVisible = require('cf-visibility-check')

/*
 * Determines the index that the custom items
 * should be located at once the existing items
 * have been retrieved from the system. This is because
 * some items may not have been retrieved due to having
 * been deleted from the system, or due to visibility rules.
 */
function getCustomItemOrder (results, items, date) {

  var customListItems = []
    , resultIds = results.map(function (item) { return item._id })
    , filteredItems = items.filter(function (item) {
        if (item.isCustom || resultIds.indexOf(item.itemId) !== -1) return item
      })
    , i = 0

  filteredItems.forEach(function (item) {
    if (item.isCustom) {
      if (!isVisible(item.properties, date)) return
      item.listIndex = i
      customListItems.push(item)
    }
    i++
  })

  return customListItems

}
