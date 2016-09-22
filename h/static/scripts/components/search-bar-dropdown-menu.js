'use strict';

var { h } = require('preact'); // eslint-disable-line no-unused-vars

function DropdownMenuItem(props) {
  var { term, label, onHover } = props;

  var classes = {
    'search-bar__dropdown-menu-item': true,
    'is-active': props.active,
  };

  var onClick = event => {
    event.preventDefault();
    props.onClick();
  };

  return <li class={classes} onMouseMove={onHover} onMouseDown={onClick}>
    <span class="search-bar__dropdown-menu-title">{term}</span>
    <span class="search-bar__dropdown-menu-explanation"> {label}</span>
  </li>;
}

function SearchBarDropdownMenu(props) {
  var { activeItem, items, open, onFocus, onSelect } = props;

  // Hide menu if not focused or no matching items
  if (!open || !items.length) {
    return null;
  }

  return <div class="search-bar__dropdown-menu-container is-open">
    <h4 class="search-bar__dropdown-menu-header">Narrow your search</h4>
    <ul class="search-bar__dropdown-menu">
      {items.map(item =>
        <DropdownMenuItem active={activeItem === item}
                          term={item.term}
                          label={item.label}
                          onHover={() => onFocus(item)}
                          onClick={() => onSelect(item)} />
      )}
    </ul>
  </div>;
}

module.exports = SearchBarDropdownMenu;
