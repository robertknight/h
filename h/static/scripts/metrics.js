/**
 * The metrics module provides functions to record client events
 * for use in calculating client performance metrics.
 */
var eventTypes = {
  /** The embed code which initializes the app started */
  EMBED_START: 'embed-start',
  /**
   * The sidebar app was created and the Angular bootstrap
   * process completed.
   */
  APP_START: 'app-start',
  /**
   * The session state has been received and the app will
   * now load the initial set of annotations for the current URI
   */
  APP_START_COMPLETE: 'app-start-complete',
  /** Annotations were loaded. */
  ANNOTATION_LOAD: 'annotation-load',
};

var events = [];

// convert an event type value (eg. 'app-start')
// to the corresponding key
function upcase(name) {
  return name.toUpperCase().replace(/-/g, '_');
}

function recordEvent(event) {
  if (!eventTypes[upcase(event.type)]) {
    throw new Error('Unknown event type: ' + event.type);
  }

  if (event.once) {
    var seenAlready = events.filter(function (earlierEvent) {
      return earlierEvent.type === event.type;
    }).length > 0;
    if (seenAlready) {
      return;
    }
  }

  if (!event.timestamp) {
    event.timestamp = Date.now();
  }
  events.push(event);

  console.log('H: %s (%s)', event.type, event.timestamp)
}

function record(event) {
  if (typeof event === 'string') {
    recordEvent({type: event});
  } else if (event.type) {
    recordEvent(event)
  } else {
    console.error('Event has no type field', event);
  }
}

module.exports = {
  eventTypes: eventTypes,
  record: record,
};
