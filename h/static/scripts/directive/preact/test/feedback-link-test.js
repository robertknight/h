'use strict';

import {h} from 'preact';

import FeedbackLink from '../feedback-link';

function find(tree, tag) {
  if (tree.type === tag) {
    return tree;
  } else {
    return tree.props.children.find(child => find(child, tag));
  }
}

describe('feedbackLink', () => {
  it('should include the username', () => {
    const link = <FeedbackLink auth={{username: 'jim'}} />;
    const anchor = find(link, 'a');
    assert.equal(anchor.props.href, 'foo');
  });
});
