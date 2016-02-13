/**
 * preact-directive provides a way to render a preact component tree
 * into an existing Angular application.
 *
 * The implementation uses preact, a very lightweight implementation of
 * the React APIs. This module should be easily adaptable to work
 * with similar frameworks, including the full version of React.
 */

import * as preact from 'preact';
import {h} from 'preact';

function componentName(Component) {
  return Component.displayName || Component.name;
}

/**
 * Displays details of an error.
 *
 * A component that can be displayed in place of a source component
 * if rendering results in an error.
 *
 * In development, this displays a very loud and obvious error.
 * Clicking the box displays the details of the error.
 */
class ErrorBox extends preact.Component {
  constructor(props) {
    super(props);
    this.state = {
      expanded: false,
    };
  }

  _toggleStacktrace() {
    this.setState({expanded: !this.state.expanded});
  }

  render() {
    // Render an error box to make the failed render very obvious.
    // This should be customized to report an error and display
    // something less dramatic in a production build
    var style = {
      backgroundColor: 'red',
      color: 'white',
      fontWeight: 'bold',
      padding: 5,
      marginTop: 10,
    };
    var stacktrace;
    if (this.state.expanded) {
      var stacktraceStyle = {
        backgroundColor: `rgba(255,255,255,0.3)`,
        padding: 10,
        maxHeight: 150,
        overflow: 'auto',
      };
      var messageStyle = { marginBottom: 5 };
      stacktrace = <div style={stacktraceStyle} onClick={e => e.stopPropagation()}>
        <p style={messageStyle}>{this.props.error.message}</p>
        {this.props.error.stack}
      </div>
    }
    var sadFaceStyle = {
      fontSize: 25,
      fontWeight: 'normal',
      margin: 5,
    };
    return <div style={style}
      onClick={() => this._toggleStacktrace()}
      title="Toggle error details"
      >
      Failed to render {componentName(this.props.Component)}
        <span style={sadFaceStyle}>😞</span>
      {stacktrace}
    </div>;
  }
}

/**
 * Creates an Angular directive which renders a preact component tree.
 *
 * This provides a way to render a subtree of preact components inside
 * a larger Angular application. The created directive will watch the
 * input attributes for changes using $scope.$watch() and re-render the
 * component tree when the inputs change.
 *
 * Usage:
 *
 *    angular.module('myApp', [])
 *      .directive('myButton', preactDirective(MyButton, {
 *        label: '=',
 *        onClick: '&',
 *      }))
 *
 * Then in your Angular templates:
 *
 *    <my-button on-click="onClickHandler()" label="'Click me'"></my-button>
 *
 * @param {preact.Component|Function} Component - The preact component
 *                                                constructor.
 * @param {Object} props - Object specifying the names and types of properties
 *                         passed from Angular to preact.
 *                         This takes the same format as the 'scope'
 *                         property of Angular directives.
 *
 *                         eg. { count: '=', onClick: '&' }
 */
module.exports = function directive(Component, props) {
  return function () {
    return {
      restrict: 'E',
      scope: props,
      link: function (scope, elem) {
        // The current input property values for the next render
        var propValues = {};
        // Set to true when a change in at least one of the input
        // properties has been detected in the current $digest cycle.
        var renderScheduled = false;

        // Update the rendered preact component when the inputs
        // change
        function render() {
          renderScheduled = false;
          var root = elem[0];

          // The third argument to preact.render() is the element to replace.
          // preact doesn't like this being an empty text node.
          var replacedElement;
          if (root.lastChild && root.lastChild.nodeType === Node.ELEMENT_NODE) {
            replacedElement = root.lastChild;
          }

          try {
            var reactElement = preact.h(Component, propValues);
            preact.render(reactElement, root, replacedElement);
          } catch (err) {
            // Render an error box to make the failed render very obvious.
            // This should be customized to report an error and display
            // something less dramatic in a production build
            console.error(`Error rendering ${componentName(Component)}:`, err);
            preact.render(<ErrorBox Component={Component} error={err}/>,
              root, replacedElement);
          }
        }

        // Watch the input properties to the component from
        // the Angular directive and re-render the preact component tree
        // when they change.
        //
        // We're watching each property with a separate $watch here,
        // but we could probably do better with a custom watch function.
        Object.keys(props).forEach(function (prop) {
          scope.$watch(prop, function (newValue) {
            propValues[prop] = newValue;
            if (!renderScheduled) {
              renderScheduled = true;
              // Re-render at the end of the $digest loop.
              // Using $applyAsync causes us to only re-render once, even
              // if several of the input properties change.
              //
              // Additional debouncing could also be done here to reduce
              // the frequency of updates.
              scope.$applyAsync(render);
            }
          });
        });
      }
    }
  };
}
