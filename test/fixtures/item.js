var now = new Date()
  , isoDisplay = now.toISOString()
  , isoLive = new Date(now.getFullYear() - 1, 1, 1).toISOString()
  , isoExpired = new Date(now.getFullYear() + 2, 1, 1).toISOString()

exports.validNewPublished =
  { _id: null
  , headline: 'Published item'
  , state: 'Published'
  , sections: []
  , tags: []
  , displayDate: isoDisplay
  , liveDate: isoLive
  , expiryDate: isoExpired
  }

exports.validNew =
  { headline: 'Draft item'
  , state: 'Draft'
  , sections: []
  , tags: []
  , displayDate: isoDisplay
  , liveDate: isoLive
  , expiryDate: isoExpired
  }
