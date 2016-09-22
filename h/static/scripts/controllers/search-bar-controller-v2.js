'use strict';

var autocomplete = require('../util/autocomplete');
var Controller = require('../base/controller');
var render = require('../base/render');

var LozengeList = require('../components/lozenge-list');
var SearchBarDropdownMenu = require('../components/search-bar-dropdown-menu');

var facetItems = [
  {term: 'user:', label: 'search by username'},
  {term: 'tag:', label: 'search for annotations with a tag'},
  {term: 'url:', label: 'search for annotations with a url'},
  {term: 'group:', label: 'search for annotations with a group'},
];

var itemsByFacet = {
  tag: [
    {term: 'maths'},
    {term: 'english'},
    {term: 'biology'},
  ],
  user: [
    {term: 'robertknight'},
    {term: 'judell'},
    {term: 'dwhly'},
  ],
  url: [
    {term: 'example.com'},
    {term: 'localhost'},
    {term: 'hypothes.is'},
  ],
};

function suggestionsForQuery(query, terms) {
  return autocomplete.suggestionsForQuery(query, {
    facetItems,
    itemsByFacet,
    currentTerms: terms,
  });
}

class SearchBarController extends Controller {
  constructor(element) {
    super(element);

    var { searchBarInput, submittedQuery } = this.refs;
    searchBarInput.name = '';
    submittedQuery.name = 'q';

    searchBarInput.addEventListener('focus', () => this.setState({open: true}));
    searchBarInput.addEventListener('blur', () => this.setState({open: false}));

    this.on('input', this._updateSuggestions.bind(this));
    this.on('keydown', this._onKeyDown.bind(this));

    this.setState({
      activeItem: suggestionsForQuery(searchBarInput.value, [])[0],
      query: searchBarInput.value,
      terms: [],
    });
  }

  update(state) {
    render(this.refs.lozengeList, LozengeList, {
      items: this.state.terms,
      onRemove: item => this.setState({
        terms: this.state.terms.filter(term => term !== item),
      }),
    });
    render(this.refs.dropdownMenu, SearchBarDropdownMenu, {
      activeItem: state.activeItem,
      items: suggestionsForQuery(state.query, this.state.terms),
      onFocus: item => this.setState({activeItem: item}),
      onSelect: item => this._selectItem(item),
      open: state.open,
    });
  }

  _updateSuggestions() {
    var query = this.refs.searchBarInput.value;
    var activeItem = this.state.activeItem;
    var newSuggestions = suggestionsForQuery(query, this.state.terms);
    if (!newSuggestions.includes(activeItem)) {
      activeItem = newSuggestions[0];
    }
    this.setState({
      activeItem,
      query,
      open: true,
    });
  }

  _onKeyDown(event) {
    var items = suggestionsForQuery(this.state.query, this.state.terms);
    var idx = items.indexOf(this.state.activeItem);

    switch (event.key) {
    case 'ArrowDown':
      ++idx;
      if (idx >= items.length) {
        idx = 0;
      }
      this.setState({activeItem: items[idx]});
      break;
    case 'ArrowUp':
      --idx;
      if (idx < 0) {
        idx = items.length-1;
      }
      this.setState({activeItem: items[idx]});
      break;
    case 'Enter':
      event.preventDefault();
      if (this.state.activeItem || this._currentValue().length > 0) {
        this._selectItem(this.state.activeItem);
      } else {
        this._submit();
      }
      break;
    case 'Escape':
      this.setState({open: false});
    }
  }

  _submit() {
    this.refs.submittedQuery.value = this.state.terms.join(' ');
    this.refs.searchBarForm.submit();
  }

  _currentValue() {
    return this.refs.searchBarInput.value.trim();
  }

  _selectItem(item) {
    var isFacetCompletion = this._currentValue().indexOf(':') !== -1;

    if (item) {
      this.refs.searchBarInput.value = autocomplete.complete(this._currentValue(), item.term);
    }

    if (isFacetCompletion) {
      this.setState({terms: this.state.terms.concat(this._currentValue())});
      this.refs.searchBarInput.value = '';
    }

    this._updateSuggestions();
  }
}

module.exports = SearchBarController;
