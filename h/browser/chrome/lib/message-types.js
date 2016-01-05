/**
 * Constants for messages sent between parts of the extension via
 * the Chrome message passing APIs
 */
var types = {
  /**
   * Dispatched when a browser tab into which the sidebar has been loaded
   * is unloaded.
   */
  TAB_DOCUMENT_UNLOADED: 'TAB_DOCUMENT_UNLOADED',
};

module.exports = types;
