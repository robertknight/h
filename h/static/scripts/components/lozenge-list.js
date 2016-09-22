'use strict';

var { h } = require('preact'); // eslint-disable-line no-unused-vars

function split(label) {
  var facetDelim = label.indexOf(':');
  if (facetDelim !== -1) {
    return [label.slice(0,facetDelim + 1), label.slice(facetDelim + 1)];
  } else {
    return [null, label];
  }
}

function Lozenge({label, onRemove}) {
  var [facet, labelText] = split(label);

  return <li class="lozenge-list__item">
    {facet ? <span class="lozenge-list__facet">{facet}</span> : null}
    <span class="lozenge-list__label">{labelText}</span>
    <a class="lozenge-list__remove-btn"
          title="Remove this query term"
          onClick={onRemove}>X</a>
  </li>;
}

function LozengeList({items, onRemove}) {
  return <ul class="lozenge-list">
    {items.map(item =>
      <Lozenge label={item} onRemove={() => onRemove(item)}/>
    )}
  </ul>;
}

module.exports = LozengeList;
