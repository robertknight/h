'use strict';

var Controller = require('../base/controller');
var setElementState = require('../util/dom').setElementState;
var upgradeElements = require('../base/upgrade-elements');

/**
 * Returns the item before `current` in `items`.
 *
 * Wraps around to the end of the list if `current` is the first item.
 */
function prevItem(items, current) {
  var idx = items.indexOf(current);
  if (idx === -1) {
    return items[0];
  } else if (idx === 0) {
    return items[items.length-1];
  } else {
    return items[idx-1];
  }
}

/**
 * Returns the item after `current` in `items`.
 *
 * Wraps around to the start of the list if `current` is the first item.
 */
function nextItem(items, current) {
  var idx = items.indexOf(current);
  if (idx === -1) {
    return items[0];
  } else if (idx === items.length - 1) {
    return items[0];
  } else {
    return items[idx+1];
  }
}

/**
 * Controller for items within the dropdown list
 */
class SearchBarDropdownItemController extends Controller {
  constructor(element) {
    super(element);

    this.on('click', () => this.trigger('search-bar-dropdown:select'));
    this.on('mouseover', () => this.trigger('search-bar-dropdown:focus'));
  }

  facet() {
    return this.refs.title.textContent.trim();
  }

  update(state) {
    setElementState(this.element, {active: state.active});
  }
}

/**
 * Controller for the search bar.
 */
class SearchBarController extends Controller {
  constructor(element) {
    super(element);

    upgradeElements(element, {
      '.js-search-bar-dropdown-item': SearchBarDropdownItemController,
    });

    this._input = this.refs.searchBarInput;
    this._dropdown = this.refs.searchBarDropdown;
    this._dropdownItems = this.childControllers(SearchBarDropdownItemController);

    var closeDropdown = () => {
      this.setState({
        activeDropdownItem: null,
        open: false,
      });
    };

    var openDropdown = () => {
      this.setState({
        activeDropdownItem: this._dropdownItems[0],
        open: true,
      });
    };

    var selectFacet = facet => {
      this._input.value = this._input.value + facet;

      closeDropdown();

      setTimeout(() => {
        this._input.focus();
      }, 0);
    };

    var onKeyPress = event => {
      const ENTER_KEY_CODE = 13;
      const UP_ARROW_KEY_CODE = 38;
      const DOWN_ARROW_KEY_CODE = 40;

      switch (event.keyCode) {
      case ENTER_KEY_CODE:
        event.preventDefault();
        if (this.state.activeDropdownItem) {
          selectFacet(this.state.activeDropdownItem.facet());
        }
        break;
      case UP_ARROW_KEY_CODE:
        this.setState({
          activeDropdownItem: prevItem(this._dropdownItems,
            this.state.activeDropdownItem),
        });
        break;
      case DOWN_ARROW_KEY_CODE:
        this.setState({
          activeDropdownItem: nextItem(this._dropdownItems,
            this.state.activeDropdownItem),
        });
        break;
      }
    };

    var handleClickOnItem = event => {
      selectFacet(event.controller.facet());
    };

    var handleClickOnDropdown = event => {
      // prevent clicking on a part of the dropdown menu itself that
      // isn't one of the suggestions from closing the menu
      event.preventDefault();
    };

    var handleFocusOutside = event => {
      if (!element.contains(event.target) ||
        !element.contains(event.relatedTarget)) {
        closeDropdown();
      }
    };

    var handleFocusOnInput = () => {
      if (this._input.value.trim().length > 0) {
        closeDropdown();
      } else {
        openDropdown();
      }
    };

    this.on('keypress', onKeyPress);

    this.on('search-bar-dropdown:focus', event => {
      this.setState({activeDropdownItem: event.controller});
    });
    this.on('search-bar-dropdown:select', handleClickOnItem);

    this._dropdown.addEventListener('mousedown', handleClickOnDropdown,
      true /*capture*/);
    this._input.addEventListener('blur', handleFocusOutside,
      true /*capture*/);
    this._input.addEventListener('input', handleFocusOnInput,
      true /*capture*/);
    this._input.addEventListener('focus', handleFocusOnInput,
      true /*capture*/);

    this.setState({
      activeDropdownItem: null,
      open: false,
    });
  }

  update(state) {
    setElementState(this._dropdown, {open: state.open});
    this._dropdownItems.forEach(item => {
      item.setState({active: item === state.activeDropdownItem});
    });
  }
}

module.exports = SearchBarController;
