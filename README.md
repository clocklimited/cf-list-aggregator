# cf-list-aggregator

[![build status](https://api.travis-ci.org/clocklimited/cf-list-aggregator.svg)](http://travis-ci.org/clocklimited/cf-list-aggregator) [![Dependences](https://david-dm.org/clocklimited/cf-list-aggregator.svg)](https://david-dm.org/clocklimited/cf-list-aggregator/) [![Join the chat at https://gitter.im/clocklimited/cf-list-aggregator](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/clocklimited/cf-list-aggregator?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

Aggregates content from lists.

## Installation

      npm install cf-list-aggregator

## Usage

```js
var aggregate = createAggregator(listService, sectionService, articleService, { logger: logger })
aggregate(listId, dedupe, limit, section, function (err, results) {})
```

## Types of list
There are two types of list:

### 1. Automatic

Automatic lists are used to auto-generate list content based on a number of properties:

- tags
- sections

For example (some properties omitted for brevity):

```js
// This list will get all content with the Location tag "London"
{ type: 'auto'
, tags: [ { type: 'Location', tag: 'London' } ]
}
```

```js
// Assuming the section "Reviews" has ID=123 and "Guides" has ID=456, this list
// will get all content from "Reviews", including any sub-sections and all content
// from "Guides", but nothing from "Guides" > "Premium".
{ type: 'auto'
, sections:
  [ { id: '123', includeSubSections: true }
  , { id: '456', includeSubSections: false }
  ]
}
```

### 2. Manual

Manual lists are lists where the contents are hand picked. The list object differs
from the automatic list in that the contents are described in the `items` array property.

```js
{ type: 'manual'
, items: []
}
```

## Specifying manual list content

The most common and basic way to define a piece of manual list content is to
provide the id of an item that exists in the `crudService` provided:

```js
{ type: 'manual'
, items: [ { itemId: '123' }, isCustom: false, overrides: {} ]
}
```

### Overriding item properties

Sometimes the item appearing in a list will need a slight modification for the context in
which it will be used, perhaps a snappier title or a more appropriate image. In order to achieve
this, the `overrides` property is used.

```js
// The item ID=123 look like this:
{ _id: '123', title: 'Top 10 List Aggregation Modules' /* etc… */ }
// In order to select this item but give it a different image…
{ itemId: '123', isCustom: false, overrides: { image: 'http://diff.img/123' } }
```

All of the original item's content will be retrieved from the `crudService` and then the
overrides will be applied.

## Inserting custom items

Sometimes it is useful to inject an item that doesn't exist in the `crudService`. To do this,
the item format is like so:

```js
{ isCustom: true, properties: { title: 'A Custom Item', image: 'http://notinthe.db' /* etc… */ } }
```

### Date based previewing

To create a list aggregator which allows searching from any date perspective, pass a `date` parameter into the options object like so:

```js
var aggregate = createAggregator(listService, sectionService, articleService, { logger: logger, date: new Date() })
```

This aggregator instance now performs all operations based on this date.

### Specifying fields to return

To specify fields to return from the query, use the `fields` option. This field can either be an object or an array - mongo is tolerant of either.

The default list is pretty minimal: `[ "_id", "headline" ]` so you will want to pass in the desired list every time. It is important to
only specify the properties needed in order to minimise unnecessary database traffic.

```js
  fields: { longTitle: 1, tags: 1 }
```

Or an array:
```js
  fields: ['longTitle', 'tags']
```

Example:
```js
var aggregate = createAggregator(listService, sectionService, articleService, { logger: logger, fields: { longTitle: 1 } })
```

### Overriding prepareAutoQuery and prepareManualQuery

If your application needs to modify the queries that the list aggregator makes (need a custom sort function for automatic lists? override prepareAutoQuery) then override these functions.

Just pass in either `prepareAutoQuery` or `prepareManualQuery` as options to the list aggregator.
The expected input and output for these functions is:

e.g

```
function prepareAutoQuery(list) {
  return { options: {}, query: {} }
}
```

```
function prepareManualQuery(list, IdType) {
  return { options: {}, query: {} }
}
```


## Changlog

### v.2.0.0

- The schema for lists that this module consumes is now totally different and not backwards compatible.
- `crudService.idType` is no longer required to be passed in. Make sure the version of `save-mongodb`
in your application is `>=0.0.12` so that it will properly reach into the `_id: { $in: [] }` query
and conver to the appropriate id type.

### v1.0.0

- The format for `list.sections` changed to account for functionality to include
sub-sections. Previously the format was:

```js
list.sections = [ 'id1', 'id2', 'id3' ]
```

This has changed to:

```js
list.sections =
  [ { id: 'id1', includeSubSections: true }
  , { id: 'id2', includeSubSections: false }
  , { id: 'id3', includeSubSections: true }
  ]
```


## Credits
[Paul Serby](https://github.com/serby/) follow me on twitter [@serby](http://twitter.com/serby)

## Licence
Licensed under the [New BSD License](http://opensource.org/licenses/bsd-license.php)
