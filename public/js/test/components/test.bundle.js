(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/*!
 * QUnit 1.23.1
 * https://qunitjs.com/
 *
 * Copyright jQuery Foundation and other contributors
 * Released under the MIT license
 * https://jquery.org/license
 *
 * Date: 2016-04-12T17:29Z
 */

( function( global ) {

var QUnit = {};

var Date = global.Date;
var now = Date.now || function() {
	return new Date().getTime();
};

var setTimeout = global.setTimeout;
var clearTimeout = global.clearTimeout;

// Store a local window from the global to allow direct references.
var window = global.window;

var defined = {
	document: window && window.document !== undefined,
	setTimeout: setTimeout !== undefined,
	sessionStorage: ( function() {
		var x = "qunit-test-string";
		try {
			sessionStorage.setItem( x, x );
			sessionStorage.removeItem( x );
			return true;
		} catch ( e ) {
			return false;
		}
	}() )
};

var fileName = ( sourceFromStacktrace( 0 ) || "" ).replace( /(:\d+)+\)?/, "" ).replace( /.+\//, "" );
var globalStartCalled = false;
var runStarted = false;

var toString = Object.prototype.toString,
	hasOwn = Object.prototype.hasOwnProperty;

// Returns a new Array with the elements that are in a but not in b
function diff( a, b ) {
	var i, j,
		result = a.slice();

	for ( i = 0; i < result.length; i++ ) {
		for ( j = 0; j < b.length; j++ ) {
			if ( result[ i ] === b[ j ] ) {
				result.splice( i, 1 );
				i--;
				break;
			}
		}
	}
	return result;
}

// From jquery.js
function inArray( elem, array ) {
	if ( array.indexOf ) {
		return array.indexOf( elem );
	}

	for ( var i = 0, length = array.length; i < length; i++ ) {
		if ( array[ i ] === elem ) {
			return i;
		}
	}

	return -1;
}

/**
 * Makes a clone of an object using only Array or Object as base,
 * and copies over the own enumerable properties.
 *
 * @param {Object} obj
 * @return {Object} New object with only the own properties (recursively).
 */
function objectValues ( obj ) {
	var key, val,
		vals = QUnit.is( "array", obj ) ? [] : {};
	for ( key in obj ) {
		if ( hasOwn.call( obj, key ) ) {
			val = obj[ key ];
			vals[ key ] = val === Object( val ) ? objectValues( val ) : val;
		}
	}
	return vals;
}

function extend( a, b, undefOnly ) {
	for ( var prop in b ) {
		if ( hasOwn.call( b, prop ) ) {

			// Avoid "Member not found" error in IE8 caused by messing with window.constructor
			// This block runs on every environment, so `global` is being used instead of `window`
			// to avoid errors on node.
			if ( prop !== "constructor" || a !== global ) {
				if ( b[ prop ] === undefined ) {
					delete a[ prop ];
				} else if ( !( undefOnly && typeof a[ prop ] !== "undefined" ) ) {
					a[ prop ] = b[ prop ];
				}
			}
		}
	}

	return a;
}

function objectType( obj ) {
	if ( typeof obj === "undefined" ) {
		return "undefined";
	}

	// Consider: typeof null === object
	if ( obj === null ) {
		return "null";
	}

	var match = toString.call( obj ).match( /^\[object\s(.*)\]$/ ),
		type = match && match[ 1 ];

	switch ( type ) {
		case "Number":
			if ( isNaN( obj ) ) {
				return "nan";
			}
			return "number";
		case "String":
		case "Boolean":
		case "Array":
		case "Set":
		case "Map":
		case "Date":
		case "RegExp":
		case "Function":
		case "Symbol":
			return type.toLowerCase();
	}
	if ( typeof obj === "object" ) {
		return "object";
	}
}

// Safe object type checking
function is( type, obj ) {
	return QUnit.objectType( obj ) === type;
}

// Doesn't support IE6 to IE9, it will return undefined on these browsers
// See also https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Error/Stack
function extractStacktrace( e, offset ) {
	offset = offset === undefined ? 4 : offset;

	var stack, include, i;

	if ( e.stack ) {
		stack = e.stack.split( "\n" );
		if ( /^error$/i.test( stack[ 0 ] ) ) {
			stack.shift();
		}
		if ( fileName ) {
			include = [];
			for ( i = offset; i < stack.length; i++ ) {
				if ( stack[ i ].indexOf( fileName ) !== -1 ) {
					break;
				}
				include.push( stack[ i ] );
			}
			if ( include.length ) {
				return include.join( "\n" );
			}
		}
		return stack[ offset ];

	// Support: Safari <=6 only
	} else if ( e.sourceURL ) {

		// Exclude useless self-reference for generated Error objects
		if ( /qunit.js$/.test( e.sourceURL ) ) {
			return;
		}

		// For actual exceptions, this is useful
		return e.sourceURL + ":" + e.line;
	}
}

function sourceFromStacktrace( offset ) {
	var error = new Error();

	// Support: Safari <=7 only, IE <=10 - 11 only
	// Not all browsers generate the `stack` property for `new Error()`, see also #636
	if ( !error.stack ) {
		try {
			throw error;
		} catch ( err ) {
			error = err;
		}
	}

	return extractStacktrace( error, offset );
}

/**
 * Config object: Maintain internal state
 * Later exposed as QUnit.config
 * `config` initialized at top of scope
 */
var config = {

	// The queue of tests to run
	queue: [],

	// Block until document ready
	blocking: true,

	// By default, run previously failed tests first
	// very useful in combination with "Hide passed tests" checked
	reorder: true,

	// By default, modify document.title when suite is done
	altertitle: true,

	// HTML Reporter: collapse every test except the first failing test
	// If false, all failing tests will be expanded
	collapse: true,

	// By default, scroll to top of the page when suite is done
	scrolltop: true,

	// Depth up-to which object will be dumped
	maxDepth: 5,

	// When enabled, all tests must call expect()
	requireExpects: false,

	// Placeholder for user-configurable form-exposed URL parameters
	urlConfig: [],

	// Set of all modules.
	modules: [],

	// Stack of nested modules
	moduleStack: [],

	// The first unnamed module
	currentModule: {
		name: "",
		tests: []
	},

	callbacks: {}
};

// Push a loose unnamed module to the modules collection
config.modules.push( config.currentModule );

var loggingCallbacks = {};

// Register logging callbacks
function registerLoggingCallbacks( obj ) {
	var i, l, key,
		callbackNames = [ "begin", "done", "log", "testStart", "testDone",
			"moduleStart", "moduleDone" ];

	function registerLoggingCallback( key ) {
		var loggingCallback = function( callback ) {
			if ( objectType( callback ) !== "function" ) {
				throw new Error(
					"QUnit logging methods require a callback function as their first parameters."
				);
			}

			config.callbacks[ key ].push( callback );
		};

		// DEPRECATED: This will be removed on QUnit 2.0.0+
		// Stores the registered functions allowing restoring
		// at verifyLoggingCallbacks() if modified
		loggingCallbacks[ key ] = loggingCallback;

		return loggingCallback;
	}

	for ( i = 0, l = callbackNames.length; i < l; i++ ) {
		key = callbackNames[ i ];

		// Initialize key collection of logging callback
		if ( objectType( config.callbacks[ key ] ) === "undefined" ) {
			config.callbacks[ key ] = [];
		}

		obj[ key ] = registerLoggingCallback( key );
	}
}

function runLoggingCallbacks( key, args ) {
	var i, l, callbacks;

	callbacks = config.callbacks[ key ];
	for ( i = 0, l = callbacks.length; i < l; i++ ) {
		callbacks[ i ]( args );
	}
}

// DEPRECATED: This will be removed on 2.0.0+
// This function verifies if the loggingCallbacks were modified by the user
// If so, it will restore it, assign the given callback and print a console warning
function verifyLoggingCallbacks() {
	var loggingCallback, userCallback;

	for ( loggingCallback in loggingCallbacks ) {
		if ( QUnit[ loggingCallback ] !== loggingCallbacks[ loggingCallback ] ) {

			userCallback = QUnit[ loggingCallback ];

			// Restore the callback function
			QUnit[ loggingCallback ] = loggingCallbacks[ loggingCallback ];

			// Assign the deprecated given callback
			QUnit[ loggingCallback ]( userCallback );

			if ( global.console && global.console.warn ) {
				global.console.warn(
					"QUnit." + loggingCallback + " was replaced with a new value.\n" +
					"Please, check out the documentation on how to apply logging callbacks.\n" +
					"Reference: https://api.qunitjs.com/category/callbacks/"
				);
			}
		}
	}
}

( function() {
	if ( !defined.document ) {
		return;
	}

	// `onErrorFnPrev` initialized at top of scope
	// Preserve other handlers
	var onErrorFnPrev = window.onerror;

	// Cover uncaught exceptions
	// Returning true will suppress the default browser handler,
	// returning false will let it run.
	window.onerror = function( error, filePath, linerNr ) {
		var ret = false;
		if ( onErrorFnPrev ) {
			ret = onErrorFnPrev( error, filePath, linerNr );
		}

		// Treat return value as window.onerror itself does,
		// Only do our handling if not suppressed.
		if ( ret !== true ) {
			if ( QUnit.config.current ) {
				if ( QUnit.config.current.ignoreGlobalErrors ) {
					return true;
				}
				QUnit.pushFailure( error, filePath + ":" + linerNr );
			} else {
				QUnit.test( "global failure", extend( function() {
					QUnit.pushFailure( error, filePath + ":" + linerNr );
				}, { validTest: true } ) );
			}
			return false;
		}

		return ret;
	};
}() );

// Figure out if we're running the tests from a server or not
QUnit.isLocal = !( defined.document && window.location.protocol !== "file:" );

// Expose the current QUnit version
QUnit.version = "1.23.1";

extend( QUnit, {

	// Call on start of module test to prepend name to all tests
	module: function( name, testEnvironment, executeNow ) {
		var module, moduleFns;
		var currentModule = config.currentModule;

		if ( arguments.length === 2 ) {
			if ( objectType( testEnvironment ) === "function" ) {
				executeNow = testEnvironment;
				testEnvironment = undefined;
			}
		}

		// DEPRECATED: handles setup/teardown functions,
		// beforeEach and afterEach should be used instead
		if ( testEnvironment && testEnvironment.setup ) {
			testEnvironment.beforeEach = testEnvironment.setup;
			delete testEnvironment.setup;
		}
		if ( testEnvironment && testEnvironment.teardown ) {
			testEnvironment.afterEach = testEnvironment.teardown;
			delete testEnvironment.teardown;
		}

		module = createModule();

		moduleFns = {
			beforeEach: setHook( module, "beforeEach" ),
			afterEach: setHook( module, "afterEach" )
		};

		if ( objectType( executeNow ) === "function" ) {
			config.moduleStack.push( module );
			setCurrentModule( module );
			executeNow.call( module.testEnvironment, moduleFns );
			config.moduleStack.pop();
			module = module.parentModule || currentModule;
		}

		setCurrentModule( module );

		function createModule() {
			var parentModule = config.moduleStack.length ?
				config.moduleStack.slice( -1 )[ 0 ] : null;
			var moduleName = parentModule !== null ?
				[ parentModule.name, name ].join( " > " ) : name;
			var module = {
				name: moduleName,
				parentModule: parentModule,
				tests: [],
				moduleId: generateHash( moduleName )
			};

			var env = {};
			if ( parentModule ) {
				extend( env, parentModule.testEnvironment );
				delete env.beforeEach;
				delete env.afterEach;
			}
			extend( env, testEnvironment );
			module.testEnvironment = env;

			config.modules.push( module );
			return module;
		}

		function setCurrentModule( module ) {
			config.currentModule = module;
		}

	},

	// DEPRECATED: QUnit.asyncTest() will be removed in QUnit 2.0.
	asyncTest: asyncTest,

	test: test,

	skip: skip,

	only: only,

	// DEPRECATED: The functionality of QUnit.start() will be altered in QUnit 2.0.
	// In QUnit 2.0, invoking it will ONLY affect the `QUnit.config.autostart` blocking behavior.
	start: function( count ) {
		var globalStartAlreadyCalled = globalStartCalled;

		if ( !config.current ) {
			globalStartCalled = true;

			if ( runStarted ) {
				throw new Error( "Called start() outside of a test context while already started" );
			} else if ( globalStartAlreadyCalled || count > 1 ) {
				throw new Error( "Called start() outside of a test context too many times" );
			} else if ( config.autostart ) {
				throw new Error( "Called start() outside of a test context when " +
					"QUnit.config.autostart was true" );
			} else if ( !config.pageLoaded ) {

				// The page isn't completely loaded yet, so bail out and let `QUnit.load` handle it
				config.autostart = true;
				return;
			}
		} else {

			// If a test is running, adjust its semaphore
			config.current.semaphore -= count || 1;

			// If semaphore is non-numeric, throw error
			if ( isNaN( config.current.semaphore ) ) {
				config.current.semaphore = 0;

				QUnit.pushFailure(
					"Called start() with a non-numeric decrement.",
					sourceFromStacktrace( 2 )
				);
				return;
			}

			// Don't start until equal number of stop-calls
			if ( config.current.semaphore > 0 ) {
				return;
			}

			// Throw an Error if start is called more often than stop
			if ( config.current.semaphore < 0 ) {
				config.current.semaphore = 0;

				QUnit.pushFailure(
					"Called start() while already started (test's semaphore was 0 already)",
					sourceFromStacktrace( 2 )
				);
				return;
			}
		}

		resumeProcessing();
	},

	// DEPRECATED: QUnit.stop() will be removed in QUnit 2.0.
	stop: function( count ) {

		// If there isn't a test running, don't allow QUnit.stop() to be called
		if ( !config.current ) {
			throw new Error( "Called stop() outside of a test context" );
		}

		// If a test is running, adjust its semaphore
		config.current.semaphore += count || 1;

		pauseProcessing();
	},

	config: config,

	is: is,

	objectType: objectType,

	extend: extend,

	load: function() {
		config.pageLoaded = true;

		// Initialize the configuration options
		extend( config, {
			stats: { all: 0, bad: 0 },
			moduleStats: { all: 0, bad: 0 },
			started: 0,
			updateRate: 1000,
			autostart: true,
			filter: ""
		}, true );

		config.blocking = false;

		if ( config.autostart ) {
			resumeProcessing();
		}
	},

	stack: function( offset ) {
		offset = ( offset || 0 ) + 2;
		return sourceFromStacktrace( offset );
	}
} );

registerLoggingCallbacks( QUnit );

function begin() {
	var i, l,
		modulesLog = [];

	// If the test run hasn't officially begun yet
	if ( !config.started ) {

		// Record the time of the test run's beginning
		config.started = now();

		verifyLoggingCallbacks();

		// Delete the loose unnamed module if unused.
		if ( config.modules[ 0 ].name === "" && config.modules[ 0 ].tests.length === 0 ) {
			config.modules.shift();
		}

		// Avoid unnecessary information by not logging modules' test environments
		for ( i = 0, l = config.modules.length; i < l; i++ ) {
			modulesLog.push( {
				name: config.modules[ i ].name,
				tests: config.modules[ i ].tests
			} );
		}

		// The test run is officially beginning now
		runLoggingCallbacks( "begin", {
			totalTests: Test.count,
			modules: modulesLog
		} );
	}

	config.blocking = false;
	process( true );
}

function process( last ) {
	function next() {
		process( last );
	}
	var start = now();
	config.depth = ( config.depth || 0 ) + 1;

	while ( config.queue.length && !config.blocking ) {
		if ( !defined.setTimeout || config.updateRate <= 0 ||
				( ( now() - start ) < config.updateRate ) ) {
			if ( config.current ) {

				// Reset async tracking for each phase of the Test lifecycle
				config.current.usedAsync = false;
			}
			config.queue.shift()();
		} else {
			setTimeout( next, 13 );
			break;
		}
	}
	config.depth--;
	if ( last && !config.blocking && !config.queue.length && config.depth === 0 ) {
		done();
	}
}

function pauseProcessing() {
	config.blocking = true;

	if ( config.testTimeout && defined.setTimeout ) {
		clearTimeout( config.timeout );
		config.timeout = setTimeout( function() {
			if ( config.current ) {
				config.current.semaphore = 0;
				QUnit.pushFailure( "Test timed out", sourceFromStacktrace( 2 ) );
			} else {
				throw new Error( "Test timed out" );
			}
			resumeProcessing();
		}, config.testTimeout );
	}
}

function resumeProcessing() {
	runStarted = true;

	// A slight delay to allow this iteration of the event loop to finish (more assertions, etc.)
	if ( defined.setTimeout ) {
		setTimeout( function() {
			if ( config.current && config.current.semaphore > 0 ) {
				return;
			}
			if ( config.timeout ) {
				clearTimeout( config.timeout );
			}

			begin();
		}, 13 );
	} else {
		begin();
	}
}

function done() {
	var runtime, passed;

	config.autorun = true;

	// Log the last module results
	if ( config.previousModule ) {
		runLoggingCallbacks( "moduleDone", {
			name: config.previousModule.name,
			tests: config.previousModule.tests,
			failed: config.moduleStats.bad,
			passed: config.moduleStats.all - config.moduleStats.bad,
			total: config.moduleStats.all,
			runtime: now() - config.moduleStats.started
		} );
	}
	delete config.previousModule;

	runtime = now() - config.started;
	passed = config.stats.all - config.stats.bad;

	runLoggingCallbacks( "done", {
		failed: config.stats.bad,
		passed: passed,
		total: config.stats.all,
		runtime: runtime
	} );
}

function setHook( module, hookName ) {
	if ( module.testEnvironment === undefined ) {
		module.testEnvironment = {};
	}

	return function( callback ) {
		module.testEnvironment[ hookName ] = callback;
	};
}

var focused = false;
var priorityCount = 0;
var unitSampler;

function Test( settings ) {
	var i, l;

	++Test.count;

	extend( this, settings );
	this.assertions = [];
	this.semaphore = 0;
	this.usedAsync = false;
	this.module = config.currentModule;
	this.stack = sourceFromStacktrace( 3 );

	// Register unique strings
	for ( i = 0, l = this.module.tests; i < l.length; i++ ) {
		if ( this.module.tests[ i ].name === this.testName ) {
			this.testName += " ";
		}
	}

	this.testId = generateHash( this.module.name, this.testName );

	this.module.tests.push( {
		name: this.testName,
		testId: this.testId
	} );

	if ( settings.skip ) {

		// Skipped tests will fully ignore any sent callback
		this.callback = function() {};
		this.async = false;
		this.expected = 0;
	} else {
		this.assert = new Assert( this );
	}
}

Test.count = 0;

Test.prototype = {
	before: function() {
		if (

			// Emit moduleStart when we're switching from one module to another
			this.module !== config.previousModule ||

				// They could be equal (both undefined) but if the previousModule property doesn't
				// yet exist it means this is the first test in a suite that isn't wrapped in a
				// module, in which case we'll just emit a moduleStart event for 'undefined'.
				// Without this, reporters can get testStart before moduleStart  which is a problem.
				!hasOwn.call( config, "previousModule" )
		) {
			if ( hasOwn.call( config, "previousModule" ) ) {
				runLoggingCallbacks( "moduleDone", {
					name: config.previousModule.name,
					tests: config.previousModule.tests,
					failed: config.moduleStats.bad,
					passed: config.moduleStats.all - config.moduleStats.bad,
					total: config.moduleStats.all,
					runtime: now() - config.moduleStats.started
				} );
			}
			config.previousModule = this.module;
			config.moduleStats = { all: 0, bad: 0, started: now() };
			runLoggingCallbacks( "moduleStart", {
				name: this.module.name,
				tests: this.module.tests
			} );
		}

		config.current = this;

		if ( this.module.testEnvironment ) {
			delete this.module.testEnvironment.beforeEach;
			delete this.module.testEnvironment.afterEach;
		}
		this.testEnvironment = extend( {}, this.module.testEnvironment );

		this.started = now();
		runLoggingCallbacks( "testStart", {
			name: this.testName,
			module: this.module.name,
			testId: this.testId
		} );

		if ( !config.pollution ) {
			saveGlobal();
		}
	},

	run: function() {
		var promise;

		config.current = this;

		if ( this.async ) {
			QUnit.stop();
		}

		this.callbackStarted = now();

		if ( config.notrycatch ) {
			runTest( this );
			return;
		}

		try {
			runTest( this );
		} catch ( e ) {
			this.pushFailure( "Died on test #" + ( this.assertions.length + 1 ) + " " +
				this.stack + ": " + ( e.message || e ), extractStacktrace( e, 0 ) );

			// Else next test will carry the responsibility
			saveGlobal();

			// Restart the tests if they're blocking
			if ( config.blocking ) {
				QUnit.start();
			}
		}

		function runTest( test ) {
			promise = test.callback.call( test.testEnvironment, test.assert );
			test.resolvePromise( promise );
		}
	},

	after: function() {
		checkPollution();
	},

	queueHook: function( hook, hookName ) {
		var promise,
			test = this;
		return function runHook() {
			config.current = test;
			if ( config.notrycatch ) {
				callHook();
				return;
			}
			try {
				callHook();
			} catch ( error ) {
				test.pushFailure( hookName + " failed on " + test.testName + ": " +
				( error.message || error ), extractStacktrace( error, 0 ) );
			}

			function callHook() {
				promise = hook.call( test.testEnvironment, test.assert );
				test.resolvePromise( promise, hookName );
			}
		};
	},

	// Currently only used for module level hooks, can be used to add global level ones
	hooks: function( handler ) {
		var hooks = [];

		function processHooks( test, module ) {
			if ( module.parentModule ) {
				processHooks( test, module.parentModule );
			}
			if ( module.testEnvironment &&
				QUnit.objectType( module.testEnvironment[ handler ] ) === "function" ) {
				hooks.push( test.queueHook( module.testEnvironment[ handler ], handler ) );
			}
		}

		// Hooks are ignored on skipped tests
		if ( !this.skip ) {
			processHooks( this, this.module );
		}
		return hooks;
	},

	finish: function() {
		config.current = this;
		if ( config.requireExpects && this.expected === null ) {
			this.pushFailure( "Expected number of assertions to be defined, but expect() was " +
				"not called.", this.stack );
		} else if ( this.expected !== null && this.expected !== this.assertions.length ) {
			this.pushFailure( "Expected " + this.expected + " assertions, but " +
				this.assertions.length + " were run", this.stack );
		} else if ( this.expected === null && !this.assertions.length ) {
			this.pushFailure( "Expected at least one assertion, but none were run - call " +
				"expect(0) to accept zero assertions.", this.stack );
		}

		var i,
			bad = 0;

		this.runtime = now() - this.started;
		config.stats.all += this.assertions.length;
		config.moduleStats.all += this.assertions.length;

		for ( i = 0; i < this.assertions.length; i++ ) {
			if ( !this.assertions[ i ].result ) {
				bad++;
				config.stats.bad++;
				config.moduleStats.bad++;
			}
		}

		runLoggingCallbacks( "testDone", {
			name: this.testName,
			module: this.module.name,
			skipped: !!this.skip,
			failed: bad,
			passed: this.assertions.length - bad,
			total: this.assertions.length,
			runtime: this.runtime,

			// HTML Reporter use
			assertions: this.assertions,
			testId: this.testId,

			// Source of Test
			source: this.stack,

			// DEPRECATED: this property will be removed in 2.0.0, use runtime instead
			duration: this.runtime
		} );

		// QUnit.reset() is deprecated and will be replaced for a new
		// fixture reset function on QUnit 2.0/2.1.
		// It's still called here for backwards compatibility handling
		QUnit.reset();

		config.current = undefined;
	},

	queue: function() {
		var priority,
			test = this;

		if ( !this.valid() ) {
			return;
		}

		function run() {

			// Each of these can by async
			synchronize( [
				function() {
					test.before();
				},

				test.hooks( "beforeEach" ),
				function() {
					test.run();
				},

				test.hooks( "afterEach" ).reverse(),

				function() {
					test.after();
				},
				function() {
					test.finish();
				}
			] );
		}

		// Prioritize previously failed tests, detected from sessionStorage
		priority = QUnit.config.reorder && defined.sessionStorage &&
				+sessionStorage.getItem( "qunit-test-" + this.module.name + "-" + this.testName );

		return synchronize( run, priority, config.seed );
	},

	pushResult: function( resultInfo ) {

		// Destructure of resultInfo = { result, actual, expected, message, negative }
		var source,
			details = {
				module: this.module.name,
				name: this.testName,
				result: resultInfo.result,
				message: resultInfo.message,
				actual: resultInfo.actual,
				expected: resultInfo.expected,
				testId: this.testId,
				negative: resultInfo.negative || false,
				runtime: now() - this.started
			};

		if ( !resultInfo.result ) {
			source = sourceFromStacktrace();

			if ( source ) {
				details.source = source;
			}
		}

		runLoggingCallbacks( "log", details );

		this.assertions.push( {
			result: !!resultInfo.result,
			message: resultInfo.message
		} );
	},

	pushFailure: function( message, source, actual ) {
		if ( !( this instanceof Test ) ) {
			throw new Error( "pushFailure() assertion outside test context, was " +
				sourceFromStacktrace( 2 ) );
		}

		var details = {
				module: this.module.name,
				name: this.testName,
				result: false,
				message: message || "error",
				actual: actual || null,
				testId: this.testId,
				runtime: now() - this.started
			};

		if ( source ) {
			details.source = source;
		}

		runLoggingCallbacks( "log", details );

		this.assertions.push( {
			result: false,
			message: message
		} );
	},

	resolvePromise: function( promise, phase ) {
		var then, message,
			test = this;
		if ( promise != null ) {
			then = promise.then;
			if ( QUnit.objectType( then ) === "function" ) {
				QUnit.stop();
				then.call(
					promise,
					function() { QUnit.start(); },
					function( error ) {
						message = "Promise rejected " +
							( !phase ? "during" : phase.replace( /Each$/, "" ) ) +
							" " + test.testName + ": " + ( error.message || error );
						test.pushFailure( message, extractStacktrace( error, 0 ) );

						// Else next test will carry the responsibility
						saveGlobal();

						// Unblock
						QUnit.start();
					}
				);
			}
		}
	},

	valid: function() {
		var filter = config.filter,
			regexFilter = /^(!?)\/([\w\W]*)\/(i?$)/.exec( filter ),
			module = config.module && config.module.toLowerCase(),
			fullName = ( this.module.name + ": " + this.testName );

		function moduleChainNameMatch( testModule ) {
			var testModuleName = testModule.name ? testModule.name.toLowerCase() : null;
			if ( testModuleName === module ) {
				return true;
			} else if ( testModule.parentModule ) {
				return moduleChainNameMatch( testModule.parentModule );
			} else {
				return false;
			}
		}

		function moduleChainIdMatch( testModule ) {
			return inArray( testModule.moduleId, config.moduleId ) > -1 ||
				testModule.parentModule && moduleChainIdMatch( testModule.parentModule );
		}

		// Internally-generated tests are always valid
		if ( this.callback && this.callback.validTest ) {
			return true;
		}

		if ( config.moduleId && config.moduleId.length > 0 &&
			!moduleChainIdMatch( this.module ) ) {

			return false;
		}

		if ( config.testId && config.testId.length > 0 &&
			inArray( this.testId, config.testId ) < 0 ) {

			return false;
		}

		if ( module && !moduleChainNameMatch( this.module ) ) {
			return false;
		}

		if ( !filter ) {
			return true;
		}

		return regexFilter ?
			this.regexFilter( !!regexFilter[ 1 ], regexFilter[ 2 ], regexFilter[ 3 ], fullName ) :
			this.stringFilter( filter, fullName );
	},

	regexFilter: function( exclude, pattern, flags, fullName ) {
		var regex = new RegExp( pattern, flags );
		var match = regex.test( fullName );

		return match !== exclude;
	},

	stringFilter: function( filter, fullName ) {
		filter = filter.toLowerCase();
		fullName = fullName.toLowerCase();

		var include = filter.charAt( 0 ) !== "!";
		if ( !include ) {
			filter = filter.slice( 1 );
		}

		// If the filter matches, we need to honour include
		if ( fullName.indexOf( filter ) !== -1 ) {
			return include;
		}

		// Otherwise, do the opposite
		return !include;
	}
};

// Resets the test setup. Useful for tests that modify the DOM.
/*
DEPRECATED: Use multiple tests instead of resetting inside a test.
Use testStart or testDone for custom cleanup.
This method will throw an error in 2.0, and will be removed in 2.1
*/
QUnit.reset = function() {

	// Return on non-browser environments
	// This is necessary to not break on node tests
	if ( !defined.document ) {
		return;
	}

	var fixture = defined.document && document.getElementById &&
			document.getElementById( "qunit-fixture" );

	if ( fixture ) {
		fixture.innerHTML = config.fixture;
	}
};

QUnit.pushFailure = function() {
	if ( !QUnit.config.current ) {
		throw new Error( "pushFailure() assertion outside test context, in " +
			sourceFromStacktrace( 2 ) );
	}

	// Gets current test obj
	var currentTest = QUnit.config.current;

	return currentTest.pushFailure.apply( currentTest, arguments );
};

// Based on Java's String.hashCode, a simple but not
// rigorously collision resistant hashing function
function generateHash( module, testName ) {
	var hex,
		i = 0,
		hash = 0,
		str = module + "\x1C" + testName,
		len = str.length;

	for ( ; i < len; i++ ) {
		hash  = ( ( hash << 5 ) - hash ) + str.charCodeAt( i );
		hash |= 0;
	}

	// Convert the possibly negative integer hash code into an 8 character hex string, which isn't
	// strictly necessary but increases user understanding that the id is a SHA-like hash
	hex = ( 0x100000000 + hash ).toString( 16 );
	if ( hex.length < 8 ) {
		hex = "0000000" + hex;
	}

	return hex.slice( -8 );
}

function synchronize( callback, priority, seed ) {
	var last = !priority,
		index;

	if ( QUnit.objectType( callback ) === "array" ) {
		while ( callback.length ) {
			synchronize( callback.shift() );
		}
		return;
	}

	if ( priority ) {
		config.queue.splice( priorityCount++, 0, callback );
	} else if ( seed ) {
		if ( !unitSampler ) {
			unitSampler = unitSamplerGenerator( seed );
		}

		// Insert into a random position after all priority items
		index = Math.floor( unitSampler() * ( config.queue.length - priorityCount + 1 ) );
		config.queue.splice( priorityCount + index, 0, callback );
	} else {
		config.queue.push( callback );
	}

	if ( config.autorun && !config.blocking ) {
		process( last );
	}
}

function unitSamplerGenerator( seed ) {

	// 32-bit xorshift, requires only a nonzero seed
	// http://excamera.com/sphinx/article-xorshift.html
	var sample = parseInt( generateHash( seed ), 16 ) || -1;
	return function() {
		sample ^= sample << 13;
		sample ^= sample >>> 17;
		sample ^= sample << 5;

		// ECMAScript has no unsigned number type
		if ( sample < 0 ) {
			sample += 0x100000000;
		}

		return sample / 0x100000000;
	};
}

function saveGlobal() {
	config.pollution = [];

	if ( config.noglobals ) {
		for ( var key in global ) {
			if ( hasOwn.call( global, key ) ) {

				// In Opera sometimes DOM element ids show up here, ignore them
				if ( /^qunit-test-output/.test( key ) ) {
					continue;
				}
				config.pollution.push( key );
			}
		}
	}
}

function checkPollution() {
	var newGlobals,
		deletedGlobals,
		old = config.pollution;

	saveGlobal();

	newGlobals = diff( config.pollution, old );
	if ( newGlobals.length > 0 ) {
		QUnit.pushFailure( "Introduced global variable(s): " + newGlobals.join( ", " ) );
	}

	deletedGlobals = diff( old, config.pollution );
	if ( deletedGlobals.length > 0 ) {
		QUnit.pushFailure( "Deleted global variable(s): " + deletedGlobals.join( ", " ) );
	}
}

// Will be exposed as QUnit.asyncTest
function asyncTest( testName, expected, callback ) {
	if ( arguments.length === 2 ) {
		callback = expected;
		expected = null;
	}

	QUnit.test( testName, expected, callback, true );
}

// Will be exposed as QUnit.test
function test( testName, expected, callback, async ) {
	if ( focused )  { return; }

	var newTest;

	if ( arguments.length === 2 ) {
		callback = expected;
		expected = null;
	}

	newTest = new Test( {
		testName: testName,
		expected: expected,
		async: async,
		callback: callback
	} );

	newTest.queue();
}

// Will be exposed as QUnit.skip
function skip( testName ) {
	if ( focused )  { return; }

	var test = new Test( {
		testName: testName,
		skip: true
	} );

	test.queue();
}

// Will be exposed as QUnit.only
function only( testName, expected, callback, async ) {
	var newTest;

	if ( focused )  { return; }

	QUnit.config.queue.length = 0;
	focused = true;

	if ( arguments.length === 2 ) {
		callback = expected;
		expected = null;
	}

	newTest = new Test( {
		testName: testName,
		expected: expected,
		async: async,
		callback: callback
	} );

	newTest.queue();
}

function Assert( testContext ) {
	this.test = testContext;
}

// Assert helpers
QUnit.assert = Assert.prototype = {

	// Specify the number of expected assertions to guarantee that failed test
	// (no assertions are run at all) don't slip through.
	expect: function( asserts ) {
		if ( arguments.length === 1 ) {
			this.test.expected = asserts;
		} else {
			return this.test.expected;
		}
	},

	// Increment this Test's semaphore counter, then return a function that
	// decrements that counter a maximum of once.
	async: function( count ) {
		var test = this.test,
			popped = false,
			acceptCallCount = count;

		if ( typeof acceptCallCount === "undefined" ) {
			acceptCallCount = 1;
		}

		test.semaphore += 1;
		test.usedAsync = true;
		pauseProcessing();

		return function done() {

			if ( popped ) {
				test.pushFailure( "Too many calls to the `assert.async` callback",
					sourceFromStacktrace( 2 ) );
				return;
			}
			acceptCallCount -= 1;
			if ( acceptCallCount > 0 ) {
				return;
			}

			test.semaphore -= 1;
			popped = true;
			resumeProcessing();
		};
	},

	// Exports test.push() to the user API
	// Alias of pushResult.
	push: function( result, actual, expected, message, negative ) {
		var currentAssert = this instanceof Assert ? this : QUnit.config.current.assert;
		return currentAssert.pushResult( {
			result: result,
			actual: actual,
			expected: expected,
			message: message,
			negative: negative
		} );
	},

	pushResult: function( resultInfo ) {

		// Destructure of resultInfo = { result, actual, expected, message, negative }
		var assert = this,
			currentTest = ( assert instanceof Assert && assert.test ) || QUnit.config.current;

		// Backwards compatibility fix.
		// Allows the direct use of global exported assertions and QUnit.assert.*
		// Although, it's use is not recommended as it can leak assertions
		// to other tests from async tests, because we only get a reference to the current test,
		// not exactly the test where assertion were intended to be called.
		if ( !currentTest ) {
			throw new Error( "assertion outside test context, in " + sourceFromStacktrace( 2 ) );
		}

		if ( currentTest.usedAsync === true && currentTest.semaphore === 0 ) {
			currentTest.pushFailure( "Assertion after the final `assert.async` was resolved",
				sourceFromStacktrace( 2 ) );

			// Allow this assertion to continue running anyway...
		}

		if ( !( assert instanceof Assert ) ) {
			assert = currentTest.assert;
		}

		return assert.test.pushResult( resultInfo );
	},

	ok: function( result, message ) {
		message = message || ( result ? "okay" : "failed, expected argument to be truthy, was: " +
			QUnit.dump.parse( result ) );
		this.pushResult( {
			result: !!result,
			actual: result,
			expected: true,
			message: message
		} );
	},

	notOk: function( result, message ) {
		message = message || ( !result ? "okay" : "failed, expected argument to be falsy, was: " +
			QUnit.dump.parse( result ) );
		this.pushResult( {
			result: !result,
			actual: result,
			expected: false,
			message: message
		} );
	},

	equal: function( actual, expected, message ) {
		/*jshint eqeqeq:false */
		this.pushResult( {
			result: expected == actual,
			actual: actual,
			expected: expected,
			message: message
		} );
	},

	notEqual: function( actual, expected, message ) {
		/*jshint eqeqeq:false */
		this.pushResult( {
			result: expected != actual,
			actual: actual,
			expected: expected,
			message: message,
			negative: true
		} );
	},

	propEqual: function( actual, expected, message ) {
		actual = objectValues( actual );
		expected = objectValues( expected );
		this.pushResult( {
			result: QUnit.equiv( actual, expected ),
			actual: actual,
			expected: expected,
			message: message
		} );
	},

	notPropEqual: function( actual, expected, message ) {
		actual = objectValues( actual );
		expected = objectValues( expected );
		this.pushResult( {
			result: !QUnit.equiv( actual, expected ),
			actual: actual,
			expected: expected,
			message: message,
			negative: true
		} );
	},

	deepEqual: function( actual, expected, message ) {
		this.pushResult( {
			result: QUnit.equiv( actual, expected ),
			actual: actual,
			expected: expected,
			message: message
		} );
	},

	notDeepEqual: function( actual, expected, message ) {
		this.pushResult( {
			result: !QUnit.equiv( actual, expected ),
			actual: actual,
			expected: expected,
			message: message,
			negative: true
		} );
	},

	strictEqual: function( actual, expected, message ) {
		this.pushResult( {
			result: expected === actual,
			actual: actual,
			expected: expected,
			message: message
		} );
	},

	notStrictEqual: function( actual, expected, message ) {
		this.pushResult( {
			result: expected !== actual,
			actual: actual,
			expected: expected,
			message: message,
			negative: true
		} );
	},

	"throws": function( block, expected, message ) {
		var actual, expectedType,
			expectedOutput = expected,
			ok = false,
			currentTest = ( this instanceof Assert && this.test ) || QUnit.config.current;

		// 'expected' is optional unless doing string comparison
		if ( message == null && typeof expected === "string" ) {
			message = expected;
			expected = null;
		}

		currentTest.ignoreGlobalErrors = true;
		try {
			block.call( currentTest.testEnvironment );
		} catch ( e ) {
			actual = e;
		}
		currentTest.ignoreGlobalErrors = false;

		if ( actual ) {
			expectedType = QUnit.objectType( expected );

			// We don't want to validate thrown error
			if ( !expected ) {
				ok = true;
				expectedOutput = null;

			// Expected is a regexp
			} else if ( expectedType === "regexp" ) {
				ok = expected.test( errorString( actual ) );

			// Expected is a string
			} else if ( expectedType === "string" ) {
				ok = expected === errorString( actual );

			// Expected is a constructor, maybe an Error constructor
			} else if ( expectedType === "function" && actual instanceof expected ) {
				ok = true;

			// Expected is an Error object
			} else if ( expectedType === "object" ) {
				ok = actual instanceof expected.constructor &&
					actual.name === expected.name &&
					actual.message === expected.message;

			// Expected is a validation function which returns true if validation passed
			} else if ( expectedType === "function" && expected.call( {}, actual ) === true ) {
				expectedOutput = null;
				ok = true;
			}
		}

		currentTest.assert.pushResult( {
			result: ok,
			actual: actual,
			expected: expectedOutput,
			message: message
		} );
	}
};

// Provide an alternative to assert.throws(), for environments that consider throws a reserved word
// Known to us are: Closure Compiler, Narwhal
( function() {
	/*jshint sub:true */
	Assert.prototype.raises = Assert.prototype [ "throws" ]; //jscs:ignore requireDotNotation
}() );

function errorString( error ) {
	var name, message,
		resultErrorString = error.toString();
	if ( resultErrorString.substring( 0, 7 ) === "[object" ) {
		name = error.name ? error.name.toString() : "Error";
		message = error.message ? error.message.toString() : "";
		if ( name && message ) {
			return name + ": " + message;
		} else if ( name ) {
			return name;
		} else if ( message ) {
			return message;
		} else {
			return "Error";
		}
	} else {
		return resultErrorString;
	}
}

// Test for equality any JavaScript type.
// Author: Philippe Rathé <prathe@gmail.com>
QUnit.equiv = ( function() {

	// Stack to decide between skip/abort functions
	var callers = [];

	// Stack to avoiding loops from circular referencing
	var parents = [];
	var parentsB = [];

	var getProto = Object.getPrototypeOf || function( obj ) {

		/*jshint proto: true */
		return obj.__proto__;
	};

	function useStrictEquality( b, a ) {

		// To catch short annotation VS 'new' annotation of a declaration. e.g.:
		// `var i = 1;`
		// `var j = new Number(1);`
		if ( typeof a === "object" ) {
			a = a.valueOf();
		}
		if ( typeof b === "object" ) {
			b = b.valueOf();
		}

		return a === b;
	}

	function compareConstructors( a, b ) {
		var protoA = getProto( a );
		var protoB = getProto( b );

		// Comparing constructors is more strict than using `instanceof`
		if ( a.constructor === b.constructor ) {
			return true;
		}

		// Ref #851
		// If the obj prototype descends from a null constructor, treat it
		// as a null prototype.
		if ( protoA && protoA.constructor === null ) {
			protoA = null;
		}
		if ( protoB && protoB.constructor === null ) {
			protoB = null;
		}

		// Allow objects with no prototype to be equivalent to
		// objects with Object as their constructor.
		if ( ( protoA === null && protoB === Object.prototype ) ||
				( protoB === null && protoA === Object.prototype ) ) {
			return true;
		}

		return false;
	}

	function getRegExpFlags( regexp ) {
		return "flags" in regexp ? regexp.flags : regexp.toString().match( /[gimuy]*$/ )[ 0 ];
	}

	var callbacks = {
		"string": useStrictEquality,
		"boolean": useStrictEquality,
		"number": useStrictEquality,
		"null": useStrictEquality,
		"undefined": useStrictEquality,
		"symbol": useStrictEquality,
		"date": useStrictEquality,

		"nan": function() {
			return true;
		},

		"regexp": function( b, a ) {
			return a.source === b.source &&

				// Include flags in the comparison
				getRegExpFlags( a ) === getRegExpFlags( b );
		},

		// - skip when the property is a method of an instance (OOP)
		// - abort otherwise,
		// initial === would have catch identical references anyway
		"function": function() {
			var caller = callers[ callers.length - 1 ];
			return caller !== Object && typeof caller !== "undefined";
		},

		"array": function( b, a ) {
			var i, j, len, loop, aCircular, bCircular;

			len = a.length;
			if ( len !== b.length ) {

				// Safe and faster
				return false;
			}

			// Track reference to avoid circular references
			parents.push( a );
			parentsB.push( b );
			for ( i = 0; i < len; i++ ) {
				loop = false;
				for ( j = 0; j < parents.length; j++ ) {
					aCircular = parents[ j ] === a[ i ];
					bCircular = parentsB[ j ] === b[ i ];
					if ( aCircular || bCircular ) {
						if ( a[ i ] === b[ i ] || aCircular && bCircular ) {
							loop = true;
						} else {
							parents.pop();
							parentsB.pop();
							return false;
						}
					}
				}
				if ( !loop && !innerEquiv( a[ i ], b[ i ] ) ) {
					parents.pop();
					parentsB.pop();
					return false;
				}
			}
			parents.pop();
			parentsB.pop();
			return true;
		},

		"set": function( b, a ) {
			var innerEq,
				outerEq = true;

			if ( a.size !== b.size ) {
				return false;
			}

			a.forEach( function( aVal ) {
				innerEq = false;

				b.forEach( function( bVal ) {
					if ( innerEquiv( bVal, aVal ) ) {
						innerEq = true;
					}
				} );

				if ( !innerEq ) {
					outerEq = false;
				}
			} );

			return outerEq;
		},

		"map": function( b, a ) {
			var innerEq,
				outerEq = true;

			if ( a.size !== b.size ) {
				return false;
			}

			a.forEach( function( aVal, aKey ) {
				innerEq = false;

				b.forEach( function( bVal, bKey ) {
					if ( innerEquiv( [ bVal, bKey ], [ aVal, aKey ] ) ) {
						innerEq = true;
					}
				} );

				if ( !innerEq ) {
					outerEq = false;
				}
			} );

			return outerEq;
		},

		"object": function( b, a ) {
			var i, j, loop, aCircular, bCircular;

			// Default to true
			var eq = true;
			var aProperties = [];
			var bProperties = [];

			if ( compareConstructors( a, b ) === false ) {
				return false;
			}

			// Stack constructor before traversing properties
			callers.push( a.constructor );

			// Track reference to avoid circular references
			parents.push( a );
			parentsB.push( b );

			// Be strict: don't ensure hasOwnProperty and go deep
			for ( i in a ) {
				loop = false;
				for ( j = 0; j < parents.length; j++ ) {
					aCircular = parents[ j ] === a[ i ];
					bCircular = parentsB[ j ] === b[ i ];
					if ( aCircular || bCircular ) {
						if ( a[ i ] === b[ i ] || aCircular && bCircular ) {
							loop = true;
						} else {
							eq = false;
							break;
						}
					}
				}
				aProperties.push( i );
				if ( !loop && !innerEquiv( a[ i ], b[ i ] ) ) {
					eq = false;
					break;
				}
			}

			parents.pop();
			parentsB.pop();

			// Unstack, we are done
			callers.pop();

			for ( i in b ) {

				// Collect b's properties
				bProperties.push( i );
			}

			// Ensures identical properties name
			return eq && innerEquiv( aProperties.sort(), bProperties.sort() );
		}
	};

	function typeEquiv( a, b ) {
		var type = QUnit.objectType( a );
		return QUnit.objectType( b ) === type && callbacks[ type ]( b, a );
	}

	// The real equiv function
	function innerEquiv( a, b ) {

		// We're done when there's nothing more to compare
		if ( arguments.length < 2 ) {
			return true;
		}

		// Require type-specific equality
		return ( a === b || typeEquiv( a, b ) ) &&

			// ...across all consecutive argument pairs
			( arguments.length === 2 || innerEquiv.apply( this, [].slice.call( arguments, 1 ) ) );
	}

	return innerEquiv;
}() );

// Based on jsDump by Ariel Flesler
// http://flesler.blogspot.com/2008/05/jsdump-pretty-dump-of-any-javascript.html
QUnit.dump = ( function() {
	function quote( str ) {
		return "\"" + str.toString().replace( /\\/g, "\\\\" ).replace( /"/g, "\\\"" ) + "\"";
	}
	function literal( o ) {
		return o + "";
	}
	function join( pre, arr, post ) {
		var s = dump.separator(),
			base = dump.indent(),
			inner = dump.indent( 1 );
		if ( arr.join ) {
			arr = arr.join( "," + s + inner );
		}
		if ( !arr ) {
			return pre + post;
		}
		return [ pre, inner + arr, base + post ].join( s );
	}
	function array( arr, stack ) {
		var i = arr.length,
			ret = new Array( i );

		if ( dump.maxDepth && dump.depth > dump.maxDepth ) {
			return "[object Array]";
		}

		this.up();
		while ( i-- ) {
			ret[ i ] = this.parse( arr[ i ], undefined, stack );
		}
		this.down();
		return join( "[", ret, "]" );
	}

	var reName = /^function (\w+)/,
		dump = {

			// The objType is used mostly internally, you can fix a (custom) type in advance
			parse: function( obj, objType, stack ) {
				stack = stack || [];
				var res, parser, parserType,
					inStack = inArray( obj, stack );

				if ( inStack !== -1 ) {
					return "recursion(" + ( inStack - stack.length ) + ")";
				}

				objType = objType || this.typeOf( obj  );
				parser = this.parsers[ objType ];
				parserType = typeof parser;

				if ( parserType === "function" ) {
					stack.push( obj );
					res = parser.call( this, obj, stack );
					stack.pop();
					return res;
				}
				return ( parserType === "string" ) ? parser : this.parsers.error;
			},
			typeOf: function( obj ) {
				var type;
				if ( obj === null ) {
					type = "null";
				} else if ( typeof obj === "undefined" ) {
					type = "undefined";
				} else if ( QUnit.is( "regexp", obj ) ) {
					type = "regexp";
				} else if ( QUnit.is( "date", obj ) ) {
					type = "date";
				} else if ( QUnit.is( "function", obj ) ) {
					type = "function";
				} else if ( obj.setInterval !== undefined &&
						obj.document !== undefined &&
						obj.nodeType === undefined ) {
					type = "window";
				} else if ( obj.nodeType === 9 ) {
					type = "document";
				} else if ( obj.nodeType ) {
					type = "node";
				} else if (

					// Native arrays
					toString.call( obj ) === "[object Array]" ||

					// NodeList objects
					( typeof obj.length === "number" && obj.item !== undefined &&
					( obj.length ? obj.item( 0 ) === obj[ 0 ] : ( obj.item( 0 ) === null &&
					obj[ 0 ] === undefined ) ) )
				) {
					type = "array";
				} else if ( obj.constructor === Error.prototype.constructor ) {
					type = "error";
				} else {
					type = typeof obj;
				}
				return type;
			},

			separator: function() {
				return this.multiline ? this.HTML ? "<br />" : "\n" : this.HTML ? "&#160;" : " ";
			},

			// Extra can be a number, shortcut for increasing-calling-decreasing
			indent: function( extra ) {
				if ( !this.multiline ) {
					return "";
				}
				var chr = this.indentChar;
				if ( this.HTML ) {
					chr = chr.replace( /\t/g, "   " ).replace( / /g, "&#160;" );
				}
				return new Array( this.depth + ( extra || 0 ) ).join( chr );
			},
			up: function( a ) {
				this.depth += a || 1;
			},
			down: function( a ) {
				this.depth -= a || 1;
			},
			setParser: function( name, parser ) {
				this.parsers[ name ] = parser;
			},

			// The next 3 are exposed so you can use them
			quote: quote,
			literal: literal,
			join: join,
			depth: 1,
			maxDepth: QUnit.config.maxDepth,

			// This is the list of parsers, to modify them, use dump.setParser
			parsers: {
				window: "[Window]",
				document: "[Document]",
				error: function( error ) {
					return "Error(\"" + error.message + "\")";
				},
				unknown: "[Unknown]",
				"null": "null",
				"undefined": "undefined",
				"function": function( fn ) {
					var ret = "function",

						// Functions never have name in IE
						name = "name" in fn ? fn.name : ( reName.exec( fn ) || [] )[ 1 ];

					if ( name ) {
						ret += " " + name;
					}
					ret += "(";

					ret = [ ret, dump.parse( fn, "functionArgs" ), "){" ].join( "" );
					return join( ret, dump.parse( fn, "functionCode" ), "}" );
				},
				array: array,
				nodelist: array,
				"arguments": array,
				object: function( map, stack ) {
					var keys, key, val, i, nonEnumerableProperties,
						ret = [];

					if ( dump.maxDepth && dump.depth > dump.maxDepth ) {
						return "[object Object]";
					}

					dump.up();
					keys = [];
					for ( key in map ) {
						keys.push( key );
					}

					// Some properties are not always enumerable on Error objects.
					nonEnumerableProperties = [ "message", "name" ];
					for ( i in nonEnumerableProperties ) {
						key = nonEnumerableProperties[ i ];
						if ( key in map && inArray( key, keys ) < 0 ) {
							keys.push( key );
						}
					}
					keys.sort();
					for ( i = 0; i < keys.length; i++ ) {
						key = keys[ i ];
						val = map[ key ];
						ret.push( dump.parse( key, "key" ) + ": " +
							dump.parse( val, undefined, stack ) );
					}
					dump.down();
					return join( "{", ret, "}" );
				},
				node: function( node ) {
					var len, i, val,
						open = dump.HTML ? "&lt;" : "<",
						close = dump.HTML ? "&gt;" : ">",
						tag = node.nodeName.toLowerCase(),
						ret = open + tag,
						attrs = node.attributes;

					if ( attrs ) {
						for ( i = 0, len = attrs.length; i < len; i++ ) {
							val = attrs[ i ].nodeValue;

							// IE6 includes all attributes in .attributes, even ones not explicitly
							// set. Those have values like undefined, null, 0, false, "" or
							// "inherit".
							if ( val && val !== "inherit" ) {
								ret += " " + attrs[ i ].nodeName + "=" +
									dump.parse( val, "attribute" );
							}
						}
					}
					ret += close;

					// Show content of TextNode or CDATASection
					if ( node.nodeType === 3 || node.nodeType === 4 ) {
						ret += node.nodeValue;
					}

					return ret + open + "/" + tag + close;
				},

				// Function calls it internally, it's the arguments part of the function
				functionArgs: function( fn ) {
					var args,
						l = fn.length;

					if ( !l ) {
						return "";
					}

					args = new Array( l );
					while ( l-- ) {

						// 97 is 'a'
						args[ l ] = String.fromCharCode( 97 + l );
					}
					return " " + args.join( ", " ) + " ";
				},

				// Object calls it internally, the key part of an item in a map
				key: quote,

				// Function calls it internally, it's the content of the function
				functionCode: "[code]",

				// Node calls it internally, it's a html attribute value
				attribute: quote,
				string: quote,
				date: quote,
				regexp: literal,
				number: literal,
				"boolean": literal
			},

			// If true, entities are escaped ( <, >, \t, space and \n )
			HTML: false,

			// Indentation unit
			indentChar: "  ",

			// If true, items in a collection, are separated by a \n, else just a space.
			multiline: true
		};

	return dump;
}() );

// Back compat
QUnit.jsDump = QUnit.dump;

// Deprecated
// Extend assert methods to QUnit for Backwards compatibility
( function() {
	var i,
		assertions = Assert.prototype;

	function applyCurrent( current ) {
		return function() {
			var assert = new Assert( QUnit.config.current );
			current.apply( assert, arguments );
		};
	}

	for ( i in assertions ) {
		QUnit[ i ] = applyCurrent( assertions[ i ] );
	}
}() );

// For browser, export only select globals
if ( defined.document ) {

	( function() {
		var i, l,
			keys = [
				"test",
				"module",
				"expect",
				"asyncTest",
				"start",
				"stop",
				"ok",
				"notOk",
				"equal",
				"notEqual",
				"propEqual",
				"notPropEqual",
				"deepEqual",
				"notDeepEqual",
				"strictEqual",
				"notStrictEqual",
				"throws",
				"raises"
			];

		for ( i = 0, l = keys.length; i < l; i++ ) {
			window[ keys[ i ] ] = QUnit[ keys[ i ] ];
		}
	}() );

	window.QUnit = QUnit;
}

// For nodejs
if ( typeof module !== "undefined" && module && module.exports ) {
	module.exports = QUnit;

	// For consistency with CommonJS environments' exports
	module.exports.QUnit = QUnit;
}

// For CommonJS with exports, but without module.exports, like Rhino
if ( typeof exports !== "undefined" && exports ) {
	exports.QUnit = QUnit;
}

if ( typeof define === "function" && define.amd ) {
	define( function() {
		return QUnit;
	} );
	QUnit.config.autostart = false;
}

// Get a reference to the global object, like window in browsers
}( ( function() {
	return this;
}() ) ) );

( function() {

// Only interact with URLs via window.location
var location = typeof window !== "undefined" && window.location;
if ( !location ) {
	return;
}

var urlParams = getUrlParams();

QUnit.urlParams = urlParams;

// Match module/test by inclusion in an array
QUnit.config.moduleId = [].concat( urlParams.moduleId || [] );
QUnit.config.testId = [].concat( urlParams.testId || [] );

// Exact case-insensitive match of the module name
QUnit.config.module = urlParams.module;

// Regular expression or case-insenstive substring match against "moduleName: testName"
QUnit.config.filter = urlParams.filter;

// Test order randomization
if ( urlParams.seed === true ) {

	// Generate a random seed if the option is specified without a value
	QUnit.config.seed = Math.random().toString( 36 ).slice( 2 );
} else if ( urlParams.seed ) {
	QUnit.config.seed = urlParams.seed;
}

// Add URL-parameter-mapped config values with UI form rendering data
QUnit.config.urlConfig.push(
	{
		id: "hidepassed",
		label: "Hide passed tests",
		tooltip: "Only show tests and assertions that fail. Stored as query-strings."
	},
	{
		id: "noglobals",
		label: "Check for Globals",
		tooltip: "Enabling this will test if any test introduces new properties on the " +
			"global object (`window` in Browsers). Stored as query-strings."
	},
	{
		id: "notrycatch",
		label: "No try-catch",
		tooltip: "Enabling this will run tests outside of a try-catch block. Makes debugging " +
			"exceptions in IE reasonable. Stored as query-strings."
	}
);

QUnit.begin( function() {
	var i, option,
		urlConfig = QUnit.config.urlConfig;

	for ( i = 0; i < urlConfig.length; i++ ) {

		// Options can be either strings or objects with nonempty "id" properties
		option = QUnit.config.urlConfig[ i ];
		if ( typeof option !== "string" ) {
			option = option.id;
		}

		if ( QUnit.config[ option ] === undefined ) {
			QUnit.config[ option ] = urlParams[ option ];
		}
	}
} );

function getUrlParams() {
	var i, param, name, value;
	var urlParams = {};
	var params = location.search.slice( 1 ).split( "&" );
	var length = params.length;

	for ( i = 0; i < length; i++ ) {
		if ( params[ i ] ) {
			param = params[ i ].split( "=" );
			name = decodeURIComponent( param[ 0 ] );

			// Allow just a key to turn on a flag, e.g., test.html?noglobals
			value = param.length === 1 ||
				decodeURIComponent( param.slice( 1 ).join( "=" ) ) ;
			if ( urlParams[ name ] ) {
				urlParams[ name ] = [].concat( urlParams[ name ], value );
			} else {
				urlParams[ name ] = value;
			}
		}
	}

	return urlParams;
}

// Don't load the HTML Reporter on non-browser environments
if ( typeof window === "undefined" || !window.document ) {
	return;
}

// Deprecated QUnit.init - Ref #530
// Re-initialize the configuration options
QUnit.init = function() {
	var config = QUnit.config;

	config.stats = { all: 0, bad: 0 };
	config.moduleStats = { all: 0, bad: 0 };
	config.started = 0;
	config.updateRate = 1000;
	config.blocking = false;
	config.autostart = true;
	config.autorun = false;
	config.filter = "";
	config.queue = [];

	appendInterface();
};

var config = QUnit.config,
	document = window.document,
	collapseNext = false,
	hasOwn = Object.prototype.hasOwnProperty,
	unfilteredUrl = setUrl( { filter: undefined, module: undefined,
		moduleId: undefined, testId: undefined } ),
	defined = {
		sessionStorage: ( function() {
			var x = "qunit-test-string";
			try {
				sessionStorage.setItem( x, x );
				sessionStorage.removeItem( x );
				return true;
			} catch ( e ) {
				return false;
			}
		}() )
	},
	modulesList = [];

/**
* Escape text for attribute or text content.
*/
function escapeText( s ) {
	if ( !s ) {
		return "";
	}
	s = s + "";

	// Both single quotes and double quotes (for attributes)
	return s.replace( /['"<>&]/g, function( s ) {
		switch ( s ) {
		case "'":
			return "&#039;";
		case "\"":
			return "&quot;";
		case "<":
			return "&lt;";
		case ">":
			return "&gt;";
		case "&":
			return "&amp;";
		}
	} );
}

/**
 * @param {HTMLElement} elem
 * @param {string} type
 * @param {Function} fn
 */
function addEvent( elem, type, fn ) {
	if ( elem.addEventListener ) {

		// Standards-based browsers
		elem.addEventListener( type, fn, false );
	} else if ( elem.attachEvent ) {

		// Support: IE <9
		elem.attachEvent( "on" + type, function() {
			var event = window.event;
			if ( !event.target ) {
				event.target = event.srcElement || document;
			}

			fn.call( elem, event );
		} );
	}
}

/**
 * @param {Array|NodeList} elems
 * @param {string} type
 * @param {Function} fn
 */
function addEvents( elems, type, fn ) {
	var i = elems.length;
	while ( i-- ) {
		addEvent( elems[ i ], type, fn );
	}
}

function hasClass( elem, name ) {
	return ( " " + elem.className + " " ).indexOf( " " + name + " " ) >= 0;
}

function addClass( elem, name ) {
	if ( !hasClass( elem, name ) ) {
		elem.className += ( elem.className ? " " : "" ) + name;
	}
}

function toggleClass( elem, name, force ) {
	if ( force || typeof force === "undefined" && !hasClass( elem, name ) ) {
		addClass( elem, name );
	} else {
		removeClass( elem, name );
	}
}

function removeClass( elem, name ) {
	var set = " " + elem.className + " ";

	// Class name may appear multiple times
	while ( set.indexOf( " " + name + " " ) >= 0 ) {
		set = set.replace( " " + name + " ", " " );
	}

	// Trim for prettiness
	elem.className = typeof set.trim === "function" ? set.trim() : set.replace( /^\s+|\s+$/g, "" );
}

function id( name ) {
	return document.getElementById && document.getElementById( name );
}

function getUrlConfigHtml() {
	var i, j, val,
		escaped, escapedTooltip,
		selection = false,
		urlConfig = config.urlConfig,
		urlConfigHtml = "";

	for ( i = 0; i < urlConfig.length; i++ ) {

		// Options can be either strings or objects with nonempty "id" properties
		val = config.urlConfig[ i ];
		if ( typeof val === "string" ) {
			val = {
				id: val,
				label: val
			};
		}

		escaped = escapeText( val.id );
		escapedTooltip = escapeText( val.tooltip );

		if ( !val.value || typeof val.value === "string" ) {
			urlConfigHtml += "<input id='qunit-urlconfig-" + escaped +
				"' name='" + escaped + "' type='checkbox'" +
				( val.value ? " value='" + escapeText( val.value ) + "'" : "" ) +
				( config[ val.id ] ? " checked='checked'" : "" ) +
				" title='" + escapedTooltip + "' /><label for='qunit-urlconfig-" + escaped +
				"' title='" + escapedTooltip + "'>" + val.label + "</label>";
		} else {
			urlConfigHtml += "<label for='qunit-urlconfig-" + escaped +
				"' title='" + escapedTooltip + "'>" + val.label +
				": </label><select id='qunit-urlconfig-" + escaped +
				"' name='" + escaped + "' title='" + escapedTooltip + "'><option></option>";

			if ( QUnit.is( "array", val.value ) ) {
				for ( j = 0; j < val.value.length; j++ ) {
					escaped = escapeText( val.value[ j ] );
					urlConfigHtml += "<option value='" + escaped + "'" +
						( config[ val.id ] === val.value[ j ] ?
							( selection = true ) && " selected='selected'" : "" ) +
						">" + escaped + "</option>";
				}
			} else {
				for ( j in val.value ) {
					if ( hasOwn.call( val.value, j ) ) {
						urlConfigHtml += "<option value='" + escapeText( j ) + "'" +
							( config[ val.id ] === j ?
								( selection = true ) && " selected='selected'" : "" ) +
							">" + escapeText( val.value[ j ] ) + "</option>";
					}
				}
			}
			if ( config[ val.id ] && !selection ) {
				escaped = escapeText( config[ val.id ] );
				urlConfigHtml += "<option value='" + escaped +
					"' selected='selected' disabled='disabled'>" + escaped + "</option>";
			}
			urlConfigHtml += "</select>";
		}
	}

	return urlConfigHtml;
}

// Handle "click" events on toolbar checkboxes and "change" for select menus.
// Updates the URL with the new state of `config.urlConfig` values.
function toolbarChanged() {
	var updatedUrl, value, tests,
		field = this,
		params = {};

	// Detect if field is a select menu or a checkbox
	if ( "selectedIndex" in field ) {
		value = field.options[ field.selectedIndex ].value || undefined;
	} else {
		value = field.checked ? ( field.defaultValue || true ) : undefined;
	}

	params[ field.name ] = value;
	updatedUrl = setUrl( params );

	// Check if we can apply the change without a page refresh
	if ( "hidepassed" === field.name && "replaceState" in window.history ) {
		QUnit.urlParams[ field.name ] = value;
		config[ field.name ] = value || false;
		tests = id( "qunit-tests" );
		if ( tests ) {
			toggleClass( tests, "hidepass", value || false );
		}
		window.history.replaceState( null, "", updatedUrl );
	} else {
		window.location = updatedUrl;
	}
}

function setUrl( params ) {
	var key, arrValue, i,
		querystring = "?",
		location = window.location;

	params = QUnit.extend( QUnit.extend( {}, QUnit.urlParams ), params );

	for ( key in params ) {

		// Skip inherited or undefined properties
		if ( hasOwn.call( params, key ) && params[ key ] !== undefined ) {

			// Output a parameter for each value of this key (but usually just one)
			arrValue = [].concat( params[ key ] );
			for ( i = 0; i < arrValue.length; i++ ) {
				querystring += encodeURIComponent( key );
				if ( arrValue[ i ] !== true ) {
					querystring += "=" + encodeURIComponent( arrValue[ i ] );
				}
				querystring += "&";
			}
		}
	}
	return location.protocol + "//" + location.host +
		location.pathname + querystring.slice( 0, -1 );
}

function applyUrlParams() {
	var selectedModule,
		modulesList = id( "qunit-modulefilter" ),
		filter = id( "qunit-filter-input" ).value;

	selectedModule = modulesList ?
		decodeURIComponent( modulesList.options[ modulesList.selectedIndex ].value ) :
		undefined;

	window.location = setUrl( {
		module: ( selectedModule === "" ) ? undefined : selectedModule,
		filter: ( filter === "" ) ? undefined : filter,

		// Remove moduleId and testId filters
		moduleId: undefined,
		testId: undefined
	} );
}

function toolbarUrlConfigContainer() {
	var urlConfigContainer = document.createElement( "span" );

	urlConfigContainer.innerHTML = getUrlConfigHtml();
	addClass( urlConfigContainer, "qunit-url-config" );

	// For oldIE support:
	// * Add handlers to the individual elements instead of the container
	// * Use "click" instead of "change" for checkboxes
	addEvents( urlConfigContainer.getElementsByTagName( "input" ), "click", toolbarChanged );
	addEvents( urlConfigContainer.getElementsByTagName( "select" ), "change", toolbarChanged );

	return urlConfigContainer;
}

function toolbarLooseFilter() {
	var filter = document.createElement( "form" ),
		label = document.createElement( "label" ),
		input = document.createElement( "input" ),
		button = document.createElement( "button" );

	addClass( filter, "qunit-filter" );

	label.innerHTML = "Filter: ";

	input.type = "text";
	input.value = config.filter || "";
	input.name = "filter";
	input.id = "qunit-filter-input";

	button.innerHTML = "Go";

	label.appendChild( input );

	filter.appendChild( label );
	filter.appendChild( button );
	addEvent( filter, "submit", function( ev ) {
		applyUrlParams();

		if ( ev && ev.preventDefault ) {
			ev.preventDefault();
		}

		return false;
	} );

	return filter;
}

function toolbarModuleFilterHtml() {
	var i,
		moduleFilterHtml = "";

	if ( !modulesList.length ) {
		return false;
	}

	moduleFilterHtml += "<label for='qunit-modulefilter'>Module: </label>" +
		"<select id='qunit-modulefilter' name='modulefilter'><option value='' " +
		( QUnit.urlParams.module === undefined ? "selected='selected'" : "" ) +
		">< All Modules ></option>";

	for ( i = 0; i < modulesList.length; i++ ) {
		moduleFilterHtml += "<option value='" +
			escapeText( encodeURIComponent( modulesList[ i ] ) ) + "' " +
			( QUnit.urlParams.module === modulesList[ i ] ? "selected='selected'" : "" ) +
			">" + escapeText( modulesList[ i ] ) + "</option>";
	}
	moduleFilterHtml += "</select>";

	return moduleFilterHtml;
}

function toolbarModuleFilter() {
	var toolbar = id( "qunit-testrunner-toolbar" ),
		moduleFilter = document.createElement( "span" ),
		moduleFilterHtml = toolbarModuleFilterHtml();

	if ( !toolbar || !moduleFilterHtml ) {
		return false;
	}

	moduleFilter.setAttribute( "id", "qunit-modulefilter-container" );
	moduleFilter.innerHTML = moduleFilterHtml;

	addEvent( moduleFilter.lastChild, "change", applyUrlParams );

	toolbar.appendChild( moduleFilter );
}

function appendToolbar() {
	var toolbar = id( "qunit-testrunner-toolbar" );

	if ( toolbar ) {
		toolbar.appendChild( toolbarUrlConfigContainer() );
		toolbar.appendChild( toolbarLooseFilter() );
		toolbarModuleFilter();
	}
}

function appendHeader() {
	var header = id( "qunit-header" );

	if ( header ) {
		header.innerHTML = "<a href='" + escapeText( unfilteredUrl ) + "'>" + header.innerHTML +
			"</a> ";
	}
}

function appendBanner() {
	var banner = id( "qunit-banner" );

	if ( banner ) {
		banner.className = "";
	}
}

function appendTestResults() {
	var tests = id( "qunit-tests" ),
		result = id( "qunit-testresult" );

	if ( result ) {
		result.parentNode.removeChild( result );
	}

	if ( tests ) {
		tests.innerHTML = "";
		result = document.createElement( "p" );
		result.id = "qunit-testresult";
		result.className = "result";
		tests.parentNode.insertBefore( result, tests );
		result.innerHTML = "Running...<br />&#160;";
	}
}

function storeFixture() {
	var fixture = id( "qunit-fixture" );
	if ( fixture ) {
		config.fixture = fixture.innerHTML;
	}
}

function appendFilteredTest() {
	var testId = QUnit.config.testId;
	if ( !testId || testId.length <= 0 ) {
		return "";
	}
	return "<div id='qunit-filteredTest'>Rerunning selected tests: " +
		escapeText( testId.join( ", " ) ) +
		" <a id='qunit-clearFilter' href='" +
		escapeText( unfilteredUrl ) +
		"'>Run all tests</a></div>";
}

function appendUserAgent() {
	var userAgent = id( "qunit-userAgent" );

	if ( userAgent ) {
		userAgent.innerHTML = "";
		userAgent.appendChild(
			document.createTextNode(
				"QUnit " + QUnit.version + "; " + navigator.userAgent
			)
		);
	}
}

function appendInterface() {
	var qunit = id( "qunit" );

	if ( qunit ) {
		qunit.innerHTML =
			"<h1 id='qunit-header'>" + escapeText( document.title ) + "</h1>" +
			"<h2 id='qunit-banner'></h2>" +
			"<div id='qunit-testrunner-toolbar'></div>" +
			appendFilteredTest() +
			"<h2 id='qunit-userAgent'></h2>" +
			"<ol id='qunit-tests'></ol>";
	}

	appendHeader();
	appendBanner();
	appendTestResults();
	appendUserAgent();
	appendToolbar();
}

function appendTestsList( modules ) {
	var i, l, x, z, test, moduleObj;

	for ( i = 0, l = modules.length; i < l; i++ ) {
		moduleObj = modules[ i ];

		for ( x = 0, z = moduleObj.tests.length; x < z; x++ ) {
			test = moduleObj.tests[ x ];

			appendTest( test.name, test.testId, moduleObj.name );
		}
	}
}

function appendTest( name, testId, moduleName ) {
	var title, rerunTrigger, testBlock, assertList,
		tests = id( "qunit-tests" );

	if ( !tests ) {
		return;
	}

	title = document.createElement( "strong" );
	title.innerHTML = getNameHtml( name, moduleName );

	rerunTrigger = document.createElement( "a" );
	rerunTrigger.innerHTML = "Rerun";
	rerunTrigger.href = setUrl( { testId: testId } );

	testBlock = document.createElement( "li" );
	testBlock.appendChild( title );
	testBlock.appendChild( rerunTrigger );
	testBlock.id = "qunit-test-output-" + testId;

	assertList = document.createElement( "ol" );
	assertList.className = "qunit-assert-list";

	testBlock.appendChild( assertList );

	tests.appendChild( testBlock );
}

// HTML Reporter initialization and load
QUnit.begin( function( details ) {
	var i, moduleObj, tests;

	// Sort modules by name for the picker
	for ( i = 0; i < details.modules.length; i++ ) {
		moduleObj = details.modules[ i ];
		if ( moduleObj.name ) {
			modulesList.push( moduleObj.name );
		}
	}
	modulesList.sort( function( a, b ) {
		return a.localeCompare( b );
	} );

	// Capture fixture HTML from the page
	storeFixture();

	// Initialize QUnit elements
	appendInterface();
	appendTestsList( details.modules );
	tests = id( "qunit-tests" );
	if ( tests && config.hidepassed ) {
		addClass( tests, "hidepass" );
	}
} );

QUnit.done( function( details ) {
	var i, key,
		banner = id( "qunit-banner" ),
		tests = id( "qunit-tests" ),
		html = [
			"Tests completed in ",
			details.runtime,
			" milliseconds.<br />",
			"<span class='passed'>",
			details.passed,
			"</span> assertions of <span class='total'>",
			details.total,
			"</span> passed, <span class='failed'>",
			details.failed,
			"</span> failed."
		].join( "" );

	if ( banner ) {
		banner.className = details.failed ? "qunit-fail" : "qunit-pass";
	}

	if ( tests ) {
		id( "qunit-testresult" ).innerHTML = html;
	}

	if ( config.altertitle && document.title ) {

		// Show ✖ for good, ✔ for bad suite result in title
		// use escape sequences in case file gets loaded with non-utf-8-charset
		document.title = [
			( details.failed ? "\u2716" : "\u2714" ),
			document.title.replace( /^[\u2714\u2716] /i, "" )
		].join( " " );
	}

	// Clear own sessionStorage items if all tests passed
	if ( config.reorder && defined.sessionStorage && details.failed === 0 ) {
		for ( i = 0; i < sessionStorage.length; i++ ) {
			key = sessionStorage.key( i++ );
			if ( key.indexOf( "qunit-test-" ) === 0 ) {
				sessionStorage.removeItem( key );
			}
		}
	}

	// Scroll back to top to show results
	if ( config.scrolltop && window.scrollTo ) {
		window.scrollTo( 0, 0 );
	}
} );

function getNameHtml( name, module ) {
	var nameHtml = "";

	if ( module ) {
		nameHtml = "<span class='module-name'>" + escapeText( module ) + "</span>: ";
	}

	nameHtml += "<span class='test-name'>" + escapeText( name ) + "</span>";

	return nameHtml;
}

QUnit.testStart( function( details ) {
	var running, testBlock, bad;

	testBlock = id( "qunit-test-output-" + details.testId );
	if ( testBlock ) {
		testBlock.className = "running";
	} else {

		// Report later registered tests
		appendTest( details.name, details.testId, details.module );
	}

	running = id( "qunit-testresult" );
	if ( running ) {
		bad = QUnit.config.reorder && defined.sessionStorage &&
			+sessionStorage.getItem( "qunit-test-" + details.module + "-" + details.name );

		running.innerHTML = ( bad ?
			"Rerunning previously failed test: <br />" :
			"Running: <br />" ) +
			getNameHtml( details.name, details.module );
	}

} );

function stripHtml( string ) {

	// Strip tags, html entity and whitespaces
	return string.replace( /<\/?[^>]+(>|$)/g, "" ).replace( /\&quot;/g, "" ).replace( /\s+/g, "" );
}

QUnit.log( function( details ) {
	var assertList, assertLi,
		message, expected, actual, diff,
		showDiff = false,
		testItem = id( "qunit-test-output-" + details.testId );

	if ( !testItem ) {
		return;
	}

	message = escapeText( details.message ) || ( details.result ? "okay" : "failed" );
	message = "<span class='test-message'>" + message + "</span>";
	message += "<span class='runtime'>@ " + details.runtime + " ms</span>";

	// The pushFailure doesn't provide details.expected
	// when it calls, it's implicit to also not show expected and diff stuff
	// Also, we need to check details.expected existence, as it can exist and be undefined
	if ( !details.result && hasOwn.call( details, "expected" ) ) {
		if ( details.negative ) {
			expected = "NOT " + QUnit.dump.parse( details.expected );
		} else {
			expected = QUnit.dump.parse( details.expected );
		}

		actual = QUnit.dump.parse( details.actual );
		message += "<table><tr class='test-expected'><th>Expected: </th><td><pre>" +
			escapeText( expected ) +
			"</pre></td></tr>";

		if ( actual !== expected ) {

			message += "<tr class='test-actual'><th>Result: </th><td><pre>" +
				escapeText( actual ) + "</pre></td></tr>";

			// Don't show diff if actual or expected are booleans
			if ( !( /^(true|false)$/.test( actual ) ) &&
					!( /^(true|false)$/.test( expected ) ) ) {
				diff = QUnit.diff( expected, actual );
				showDiff = stripHtml( diff ).length !==
					stripHtml( expected ).length +
					stripHtml( actual ).length;
			}

			// Don't show diff if expected and actual are totally different
			if ( showDiff ) {
				message += "<tr class='test-diff'><th>Diff: </th><td><pre>" +
					diff + "</pre></td></tr>";
			}
		} else if ( expected.indexOf( "[object Array]" ) !== -1 ||
				expected.indexOf( "[object Object]" ) !== -1 ) {
			message += "<tr class='test-message'><th>Message: </th><td>" +
				"Diff suppressed as the depth of object is more than current max depth (" +
				QUnit.config.maxDepth + ").<p>Hint: Use <code>QUnit.dump.maxDepth</code> to " +
				" run with a higher max depth or <a href='" +
				escapeText( setUrl( { maxDepth: -1 } ) ) + "'>" +
				"Rerun</a> without max depth.</p></td></tr>";
		} else {
			message += "<tr class='test-message'><th>Message: </th><td>" +
				"Diff suppressed as the expected and actual results have an equivalent" +
				" serialization</td></tr>";
		}

		if ( details.source ) {
			message += "<tr class='test-source'><th>Source: </th><td><pre>" +
				escapeText( details.source ) + "</pre></td></tr>";
		}

		message += "</table>";

	// This occurs when pushFailure is set and we have an extracted stack trace
	} else if ( !details.result && details.source ) {
		message += "<table>" +
			"<tr class='test-source'><th>Source: </th><td><pre>" +
			escapeText( details.source ) + "</pre></td></tr>" +
			"</table>";
	}

	assertList = testItem.getElementsByTagName( "ol" )[ 0 ];

	assertLi = document.createElement( "li" );
	assertLi.className = details.result ? "pass" : "fail";
	assertLi.innerHTML = message;
	assertList.appendChild( assertLi );
} );

QUnit.testDone( function( details ) {
	var testTitle, time, testItem, assertList,
		good, bad, testCounts, skipped, sourceName,
		tests = id( "qunit-tests" );

	if ( !tests ) {
		return;
	}

	testItem = id( "qunit-test-output-" + details.testId );

	assertList = testItem.getElementsByTagName( "ol" )[ 0 ];

	good = details.passed;
	bad = details.failed;

	// Store result when possible
	if ( config.reorder && defined.sessionStorage ) {
		if ( bad ) {
			sessionStorage.setItem( "qunit-test-" + details.module + "-" + details.name, bad );
		} else {
			sessionStorage.removeItem( "qunit-test-" + details.module + "-" + details.name );
		}
	}

	if ( bad === 0 ) {

		// Collapse the passing tests
		addClass( assertList, "qunit-collapsed" );
	} else if ( bad && config.collapse && !collapseNext ) {

		// Skip collapsing the first failing test
		collapseNext = true;
	} else {

		// Collapse remaining tests
		addClass( assertList, "qunit-collapsed" );
	}

	// The testItem.firstChild is the test name
	testTitle = testItem.firstChild;

	testCounts = bad ?
		"<b class='failed'>" + bad + "</b>, " + "<b class='passed'>" + good + "</b>, " :
		"";

	testTitle.innerHTML += " <b class='counts'>(" + testCounts +
		details.assertions.length + ")</b>";

	if ( details.skipped ) {
		testItem.className = "skipped";
		skipped = document.createElement( "em" );
		skipped.className = "qunit-skipped-label";
		skipped.innerHTML = "skipped";
		testItem.insertBefore( skipped, testTitle );
	} else {
		addEvent( testTitle, "click", function() {
			toggleClass( assertList, "qunit-collapsed" );
		} );

		testItem.className = bad ? "fail" : "pass";

		time = document.createElement( "span" );
		time.className = "runtime";
		time.innerHTML = details.runtime + " ms";
		testItem.insertBefore( time, assertList );
	}

	// Show the source of the test when showing assertions
	if ( details.source ) {
		sourceName = document.createElement( "p" );
		sourceName.innerHTML = "<strong>Source: </strong>" + details.source;
		addClass( sourceName, "qunit-source" );
		if ( bad === 0 ) {
			addClass( sourceName, "qunit-collapsed" );
		}
		addEvent( testTitle, "click", function() {
			toggleClass( sourceName, "qunit-collapsed" );
		} );
		testItem.appendChild( sourceName );
	}
} );

// Avoid readyState issue with phantomjs
// Ref: #818
var notPhantom = ( function( p ) {
	return !( p && p.version && p.version.major > 0 );
} )( window.phantom );

if ( notPhantom && document.readyState === "complete" ) {
	QUnit.load();
} else {
	addEvent( window, "load", QUnit.load );
}

/*
 * This file is a modified version of google-diff-match-patch's JavaScript implementation
 * (https://code.google.com/p/google-diff-match-patch/source/browse/trunk/javascript/diff_match_patch_uncompressed.js),
 * modifications are licensed as more fully set forth in LICENSE.txt.
 *
 * The original source of google-diff-match-patch is attributable and licensed as follows:
 *
 * Copyright 2006 Google Inc.
 * https://code.google.com/p/google-diff-match-patch/
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * More Info:
 *  https://code.google.com/p/google-diff-match-patch/
 *
 * Usage: QUnit.diff(expected, actual)
 *
 */
QUnit.diff = ( function() {
	function DiffMatchPatch() {
	}

	//  DIFF FUNCTIONS

	/**
	 * The data structure representing a diff is an array of tuples:
	 * [[DIFF_DELETE, 'Hello'], [DIFF_INSERT, 'Goodbye'], [DIFF_EQUAL, ' world.']]
	 * which means: delete 'Hello', add 'Goodbye' and keep ' world.'
	 */
	var DIFF_DELETE = -1,
		DIFF_INSERT = 1,
		DIFF_EQUAL = 0;

	/**
	 * Find the differences between two texts.  Simplifies the problem by stripping
	 * any common prefix or suffix off the texts before diffing.
	 * @param {string} text1 Old string to be diffed.
	 * @param {string} text2 New string to be diffed.
	 * @param {boolean=} optChecklines Optional speedup flag. If present and false,
	 *     then don't run a line-level diff first to identify the changed areas.
	 *     Defaults to true, which does a faster, slightly less optimal diff.
	 * @return {!Array.<!DiffMatchPatch.Diff>} Array of diff tuples.
	 */
	DiffMatchPatch.prototype.DiffMain = function( text1, text2, optChecklines ) {
		var deadline, checklines, commonlength,
			commonprefix, commonsuffix, diffs;

		// The diff must be complete in up to 1 second.
		deadline = ( new Date() ).getTime() + 1000;

		// Check for null inputs.
		if ( text1 === null || text2 === null ) {
			throw new Error( "Null input. (DiffMain)" );
		}

		// Check for equality (speedup).
		if ( text1 === text2 ) {
			if ( text1 ) {
				return [
					[ DIFF_EQUAL, text1 ]
				];
			}
			return [];
		}

		if ( typeof optChecklines === "undefined" ) {
			optChecklines = true;
		}

		checklines = optChecklines;

		// Trim off common prefix (speedup).
		commonlength = this.diffCommonPrefix( text1, text2 );
		commonprefix = text1.substring( 0, commonlength );
		text1 = text1.substring( commonlength );
		text2 = text2.substring( commonlength );

		// Trim off common suffix (speedup).
		commonlength = this.diffCommonSuffix( text1, text2 );
		commonsuffix = text1.substring( text1.length - commonlength );
		text1 = text1.substring( 0, text1.length - commonlength );
		text2 = text2.substring( 0, text2.length - commonlength );

		// Compute the diff on the middle block.
		diffs = this.diffCompute( text1, text2, checklines, deadline );

		// Restore the prefix and suffix.
		if ( commonprefix ) {
			diffs.unshift( [ DIFF_EQUAL, commonprefix ] );
		}
		if ( commonsuffix ) {
			diffs.push( [ DIFF_EQUAL, commonsuffix ] );
		}
		this.diffCleanupMerge( diffs );
		return diffs;
	};

	/**
	 * Reduce the number of edits by eliminating operationally trivial equalities.
	 * @param {!Array.<!DiffMatchPatch.Diff>} diffs Array of diff tuples.
	 */
	DiffMatchPatch.prototype.diffCleanupEfficiency = function( diffs ) {
		var changes, equalities, equalitiesLength, lastequality,
			pointer, preIns, preDel, postIns, postDel;
		changes = false;
		equalities = []; // Stack of indices where equalities are found.
		equalitiesLength = 0; // Keeping our own length var is faster in JS.
		/** @type {?string} */
		lastequality = null;

		// Always equal to diffs[equalities[equalitiesLength - 1]][1]
		pointer = 0; // Index of current position.

		// Is there an insertion operation before the last equality.
		preIns = false;

		// Is there a deletion operation before the last equality.
		preDel = false;

		// Is there an insertion operation after the last equality.
		postIns = false;

		// Is there a deletion operation after the last equality.
		postDel = false;
		while ( pointer < diffs.length ) {

			// Equality found.
			if ( diffs[ pointer ][ 0 ] === DIFF_EQUAL ) {
				if ( diffs[ pointer ][ 1 ].length < 4 && ( postIns || postDel ) ) {

					// Candidate found.
					equalities[ equalitiesLength++ ] = pointer;
					preIns = postIns;
					preDel = postDel;
					lastequality = diffs[ pointer ][ 1 ];
				} else {

					// Not a candidate, and can never become one.
					equalitiesLength = 0;
					lastequality = null;
				}
				postIns = postDel = false;

			// An insertion or deletion.
			} else {

				if ( diffs[ pointer ][ 0 ] === DIFF_DELETE ) {
					postDel = true;
				} else {
					postIns = true;
				}

				/*
				 * Five types to be split:
				 * <ins>A</ins><del>B</del>XY<ins>C</ins><del>D</del>
				 * <ins>A</ins>X<ins>C</ins><del>D</del>
				 * <ins>A</ins><del>B</del>X<ins>C</ins>
				 * <ins>A</del>X<ins>C</ins><del>D</del>
				 * <ins>A</ins><del>B</del>X<del>C</del>
				 */
				if ( lastequality && ( ( preIns && preDel && postIns && postDel ) ||
						( ( lastequality.length < 2 ) &&
						( preIns + preDel + postIns + postDel ) === 3 ) ) ) {

					// Duplicate record.
					diffs.splice(
						equalities[ equalitiesLength - 1 ],
						0,
						[ DIFF_DELETE, lastequality ]
					);

					// Change second copy to insert.
					diffs[ equalities[ equalitiesLength - 1 ] + 1 ][ 0 ] = DIFF_INSERT;
					equalitiesLength--; // Throw away the equality we just deleted;
					lastequality = null;
					if ( preIns && preDel ) {

						// No changes made which could affect previous entry, keep going.
						postIns = postDel = true;
						equalitiesLength = 0;
					} else {
						equalitiesLength--; // Throw away the previous equality.
						pointer = equalitiesLength > 0 ? equalities[ equalitiesLength - 1 ] : -1;
						postIns = postDel = false;
					}
					changes = true;
				}
			}
			pointer++;
		}

		if ( changes ) {
			this.diffCleanupMerge( diffs );
		}
	};

	/**
	 * Convert a diff array into a pretty HTML report.
	 * @param {!Array.<!DiffMatchPatch.Diff>} diffs Array of diff tuples.
	 * @param {integer} string to be beautified.
	 * @return {string} HTML representation.
	 */
	DiffMatchPatch.prototype.diffPrettyHtml = function( diffs ) {
		var op, data, x,
			html = [];
		for ( x = 0; x < diffs.length; x++ ) {
			op = diffs[ x ][ 0 ]; // Operation (insert, delete, equal)
			data = diffs[ x ][ 1 ]; // Text of change.
			switch ( op ) {
			case DIFF_INSERT:
				html[ x ] = "<ins>" + escapeText( data ) + "</ins>";
				break;
			case DIFF_DELETE:
				html[ x ] = "<del>" + escapeText( data ) + "</del>";
				break;
			case DIFF_EQUAL:
				html[ x ] = "<span>" + escapeText( data ) + "</span>";
				break;
			}
		}
		return html.join( "" );
	};

	/**
	 * Determine the common prefix of two strings.
	 * @param {string} text1 First string.
	 * @param {string} text2 Second string.
	 * @return {number} The number of characters common to the start of each
	 *     string.
	 */
	DiffMatchPatch.prototype.diffCommonPrefix = function( text1, text2 ) {
		var pointermid, pointermax, pointermin, pointerstart;

		// Quick check for common null cases.
		if ( !text1 || !text2 || text1.charAt( 0 ) !== text2.charAt( 0 ) ) {
			return 0;
		}

		// Binary search.
		// Performance analysis: https://neil.fraser.name/news/2007/10/09/
		pointermin = 0;
		pointermax = Math.min( text1.length, text2.length );
		pointermid = pointermax;
		pointerstart = 0;
		while ( pointermin < pointermid ) {
			if ( text1.substring( pointerstart, pointermid ) ===
					text2.substring( pointerstart, pointermid ) ) {
				pointermin = pointermid;
				pointerstart = pointermin;
			} else {
				pointermax = pointermid;
			}
			pointermid = Math.floor( ( pointermax - pointermin ) / 2 + pointermin );
		}
		return pointermid;
	};

	/**
	 * Determine the common suffix of two strings.
	 * @param {string} text1 First string.
	 * @param {string} text2 Second string.
	 * @return {number} The number of characters common to the end of each string.
	 */
	DiffMatchPatch.prototype.diffCommonSuffix = function( text1, text2 ) {
		var pointermid, pointermax, pointermin, pointerend;

		// Quick check for common null cases.
		if ( !text1 ||
				!text2 ||
				text1.charAt( text1.length - 1 ) !== text2.charAt( text2.length - 1 ) ) {
			return 0;
		}

		// Binary search.
		// Performance analysis: https://neil.fraser.name/news/2007/10/09/
		pointermin = 0;
		pointermax = Math.min( text1.length, text2.length );
		pointermid = pointermax;
		pointerend = 0;
		while ( pointermin < pointermid ) {
			if ( text1.substring( text1.length - pointermid, text1.length - pointerend ) ===
					text2.substring( text2.length - pointermid, text2.length - pointerend ) ) {
				pointermin = pointermid;
				pointerend = pointermin;
			} else {
				pointermax = pointermid;
			}
			pointermid = Math.floor( ( pointermax - pointermin ) / 2 + pointermin );
		}
		return pointermid;
	};

	/**
	 * Find the differences between two texts.  Assumes that the texts do not
	 * have any common prefix or suffix.
	 * @param {string} text1 Old string to be diffed.
	 * @param {string} text2 New string to be diffed.
	 * @param {boolean} checklines Speedup flag.  If false, then don't run a
	 *     line-level diff first to identify the changed areas.
	 *     If true, then run a faster, slightly less optimal diff.
	 * @param {number} deadline Time when the diff should be complete by.
	 * @return {!Array.<!DiffMatchPatch.Diff>} Array of diff tuples.
	 * @private
	 */
	DiffMatchPatch.prototype.diffCompute = function( text1, text2, checklines, deadline ) {
		var diffs, longtext, shorttext, i, hm,
			text1A, text2A, text1B, text2B,
			midCommon, diffsA, diffsB;

		if ( !text1 ) {

			// Just add some text (speedup).
			return [
				[ DIFF_INSERT, text2 ]
			];
		}

		if ( !text2 ) {

			// Just delete some text (speedup).
			return [
				[ DIFF_DELETE, text1 ]
			];
		}

		longtext = text1.length > text2.length ? text1 : text2;
		shorttext = text1.length > text2.length ? text2 : text1;
		i = longtext.indexOf( shorttext );
		if ( i !== -1 ) {

			// Shorter text is inside the longer text (speedup).
			diffs = [
				[ DIFF_INSERT, longtext.substring( 0, i ) ],
				[ DIFF_EQUAL, shorttext ],
				[ DIFF_INSERT, longtext.substring( i + shorttext.length ) ]
			];

			// Swap insertions for deletions if diff is reversed.
			if ( text1.length > text2.length ) {
				diffs[ 0 ][ 0 ] = diffs[ 2 ][ 0 ] = DIFF_DELETE;
			}
			return diffs;
		}

		if ( shorttext.length === 1 ) {

			// Single character string.
			// After the previous speedup, the character can't be an equality.
			return [
				[ DIFF_DELETE, text1 ],
				[ DIFF_INSERT, text2 ]
			];
		}

		// Check to see if the problem can be split in two.
		hm = this.diffHalfMatch( text1, text2 );
		if ( hm ) {

			// A half-match was found, sort out the return data.
			text1A = hm[ 0 ];
			text1B = hm[ 1 ];
			text2A = hm[ 2 ];
			text2B = hm[ 3 ];
			midCommon = hm[ 4 ];

			// Send both pairs off for separate processing.
			diffsA = this.DiffMain( text1A, text2A, checklines, deadline );
			diffsB = this.DiffMain( text1B, text2B, checklines, deadline );

			// Merge the results.
			return diffsA.concat( [
				[ DIFF_EQUAL, midCommon ]
			], diffsB );
		}

		if ( checklines && text1.length > 100 && text2.length > 100 ) {
			return this.diffLineMode( text1, text2, deadline );
		}

		return this.diffBisect( text1, text2, deadline );
	};

	/**
	 * Do the two texts share a substring which is at least half the length of the
	 * longer text?
	 * This speedup can produce non-minimal diffs.
	 * @param {string} text1 First string.
	 * @param {string} text2 Second string.
	 * @return {Array.<string>} Five element Array, containing the prefix of
	 *     text1, the suffix of text1, the prefix of text2, the suffix of
	 *     text2 and the common middle.  Or null if there was no match.
	 * @private
	 */
	DiffMatchPatch.prototype.diffHalfMatch = function( text1, text2 ) {
		var longtext, shorttext, dmp,
			text1A, text2B, text2A, text1B, midCommon,
			hm1, hm2, hm;

		longtext = text1.length > text2.length ? text1 : text2;
		shorttext = text1.length > text2.length ? text2 : text1;
		if ( longtext.length < 4 || shorttext.length * 2 < longtext.length ) {
			return null; // Pointless.
		}
		dmp = this; // 'this' becomes 'window' in a closure.

		/**
		 * Does a substring of shorttext exist within longtext such that the substring
		 * is at least half the length of longtext?
		 * Closure, but does not reference any external variables.
		 * @param {string} longtext Longer string.
		 * @param {string} shorttext Shorter string.
		 * @param {number} i Start index of quarter length substring within longtext.
		 * @return {Array.<string>} Five element Array, containing the prefix of
		 *     longtext, the suffix of longtext, the prefix of shorttext, the suffix
		 *     of shorttext and the common middle.  Or null if there was no match.
		 * @private
		 */
		function diffHalfMatchI( longtext, shorttext, i ) {
			var seed, j, bestCommon, prefixLength, suffixLength,
				bestLongtextA, bestLongtextB, bestShorttextA, bestShorttextB;

			// Start with a 1/4 length substring at position i as a seed.
			seed = longtext.substring( i, i + Math.floor( longtext.length / 4 ) );
			j = -1;
			bestCommon = "";
			while ( ( j = shorttext.indexOf( seed, j + 1 ) ) !== -1 ) {
				prefixLength = dmp.diffCommonPrefix( longtext.substring( i ),
					shorttext.substring( j ) );
				suffixLength = dmp.diffCommonSuffix( longtext.substring( 0, i ),
					shorttext.substring( 0, j ) );
				if ( bestCommon.length < suffixLength + prefixLength ) {
					bestCommon = shorttext.substring( j - suffixLength, j ) +
						shorttext.substring( j, j + prefixLength );
					bestLongtextA = longtext.substring( 0, i - suffixLength );
					bestLongtextB = longtext.substring( i + prefixLength );
					bestShorttextA = shorttext.substring( 0, j - suffixLength );
					bestShorttextB = shorttext.substring( j + prefixLength );
				}
			}
			if ( bestCommon.length * 2 >= longtext.length ) {
				return [ bestLongtextA, bestLongtextB,
					bestShorttextA, bestShorttextB, bestCommon
				];
			} else {
				return null;
			}
		}

		// First check if the second quarter is the seed for a half-match.
		hm1 = diffHalfMatchI( longtext, shorttext,
			Math.ceil( longtext.length / 4 ) );

		// Check again based on the third quarter.
		hm2 = diffHalfMatchI( longtext, shorttext,
			Math.ceil( longtext.length / 2 ) );
		if ( !hm1 && !hm2 ) {
			return null;
		} else if ( !hm2 ) {
			hm = hm1;
		} else if ( !hm1 ) {
			hm = hm2;
		} else {

			// Both matched.  Select the longest.
			hm = hm1[ 4 ].length > hm2[ 4 ].length ? hm1 : hm2;
		}

		// A half-match was found, sort out the return data.
		text1A, text1B, text2A, text2B;
		if ( text1.length > text2.length ) {
			text1A = hm[ 0 ];
			text1B = hm[ 1 ];
			text2A = hm[ 2 ];
			text2B = hm[ 3 ];
		} else {
			text2A = hm[ 0 ];
			text2B = hm[ 1 ];
			text1A = hm[ 2 ];
			text1B = hm[ 3 ];
		}
		midCommon = hm[ 4 ];
		return [ text1A, text1B, text2A, text2B, midCommon ];
	};

	/**
	 * Do a quick line-level diff on both strings, then rediff the parts for
	 * greater accuracy.
	 * This speedup can produce non-minimal diffs.
	 * @param {string} text1 Old string to be diffed.
	 * @param {string} text2 New string to be diffed.
	 * @param {number} deadline Time when the diff should be complete by.
	 * @return {!Array.<!DiffMatchPatch.Diff>} Array of diff tuples.
	 * @private
	 */
	DiffMatchPatch.prototype.diffLineMode = function( text1, text2, deadline ) {
		var a, diffs, linearray, pointer, countInsert,
			countDelete, textInsert, textDelete, j;

		// Scan the text on a line-by-line basis first.
		a = this.diffLinesToChars( text1, text2 );
		text1 = a.chars1;
		text2 = a.chars2;
		linearray = a.lineArray;

		diffs = this.DiffMain( text1, text2, false, deadline );

		// Convert the diff back to original text.
		this.diffCharsToLines( diffs, linearray );

		// Eliminate freak matches (e.g. blank lines)
		this.diffCleanupSemantic( diffs );

		// Rediff any replacement blocks, this time character-by-character.
		// Add a dummy entry at the end.
		diffs.push( [ DIFF_EQUAL, "" ] );
		pointer = 0;
		countDelete = 0;
		countInsert = 0;
		textDelete = "";
		textInsert = "";
		while ( pointer < diffs.length ) {
			switch ( diffs[ pointer ][ 0 ] ) {
			case DIFF_INSERT:
				countInsert++;
				textInsert += diffs[ pointer ][ 1 ];
				break;
			case DIFF_DELETE:
				countDelete++;
				textDelete += diffs[ pointer ][ 1 ];
				break;
			case DIFF_EQUAL:

				// Upon reaching an equality, check for prior redundancies.
				if ( countDelete >= 1 && countInsert >= 1 ) {

					// Delete the offending records and add the merged ones.
					diffs.splice( pointer - countDelete - countInsert,
						countDelete + countInsert );
					pointer = pointer - countDelete - countInsert;
					a = this.DiffMain( textDelete, textInsert, false, deadline );
					for ( j = a.length - 1; j >= 0; j-- ) {
						diffs.splice( pointer, 0, a[ j ] );
					}
					pointer = pointer + a.length;
				}
				countInsert = 0;
				countDelete = 0;
				textDelete = "";
				textInsert = "";
				break;
			}
			pointer++;
		}
		diffs.pop(); // Remove the dummy entry at the end.

		return diffs;
	};

	/**
	 * Find the 'middle snake' of a diff, split the problem in two
	 * and return the recursively constructed diff.
	 * See Myers 1986 paper: An O(ND) Difference Algorithm and Its Variations.
	 * @param {string} text1 Old string to be diffed.
	 * @param {string} text2 New string to be diffed.
	 * @param {number} deadline Time at which to bail if not yet complete.
	 * @return {!Array.<!DiffMatchPatch.Diff>} Array of diff tuples.
	 * @private
	 */
	DiffMatchPatch.prototype.diffBisect = function( text1, text2, deadline ) {
		var text1Length, text2Length, maxD, vOffset, vLength,
			v1, v2, x, delta, front, k1start, k1end, k2start,
			k2end, k2Offset, k1Offset, x1, x2, y1, y2, d, k1, k2;

		// Cache the text lengths to prevent multiple calls.
		text1Length = text1.length;
		text2Length = text2.length;
		maxD = Math.ceil( ( text1Length + text2Length ) / 2 );
		vOffset = maxD;
		vLength = 2 * maxD;
		v1 = new Array( vLength );
		v2 = new Array( vLength );

		// Setting all elements to -1 is faster in Chrome & Firefox than mixing
		// integers and undefined.
		for ( x = 0; x < vLength; x++ ) {
			v1[ x ] = -1;
			v2[ x ] = -1;
		}
		v1[ vOffset + 1 ] = 0;
		v2[ vOffset + 1 ] = 0;
		delta = text1Length - text2Length;

		// If the total number of characters is odd, then the front path will collide
		// with the reverse path.
		front = ( delta % 2 !== 0 );

		// Offsets for start and end of k loop.
		// Prevents mapping of space beyond the grid.
		k1start = 0;
		k1end = 0;
		k2start = 0;
		k2end = 0;
		for ( d = 0; d < maxD; d++ ) {

			// Bail out if deadline is reached.
			if ( ( new Date() ).getTime() > deadline ) {
				break;
			}

			// Walk the front path one step.
			for ( k1 = -d + k1start; k1 <= d - k1end; k1 += 2 ) {
				k1Offset = vOffset + k1;
				if ( k1 === -d || ( k1 !== d && v1[ k1Offset - 1 ] < v1[ k1Offset + 1 ] ) ) {
					x1 = v1[ k1Offset + 1 ];
				} else {
					x1 = v1[ k1Offset - 1 ] + 1;
				}
				y1 = x1 - k1;
				while ( x1 < text1Length && y1 < text2Length &&
					text1.charAt( x1 ) === text2.charAt( y1 ) ) {
					x1++;
					y1++;
				}
				v1[ k1Offset ] = x1;
				if ( x1 > text1Length ) {

					// Ran off the right of the graph.
					k1end += 2;
				} else if ( y1 > text2Length ) {

					// Ran off the bottom of the graph.
					k1start += 2;
				} else if ( front ) {
					k2Offset = vOffset + delta - k1;
					if ( k2Offset >= 0 && k2Offset < vLength && v2[ k2Offset ] !== -1 ) {

						// Mirror x2 onto top-left coordinate system.
						x2 = text1Length - v2[ k2Offset ];
						if ( x1 >= x2 ) {

							// Overlap detected.
							return this.diffBisectSplit( text1, text2, x1, y1, deadline );
						}
					}
				}
			}

			// Walk the reverse path one step.
			for ( k2 = -d + k2start; k2 <= d - k2end; k2 += 2 ) {
				k2Offset = vOffset + k2;
				if ( k2 === -d || ( k2 !== d && v2[ k2Offset - 1 ] < v2[ k2Offset + 1 ] ) ) {
					x2 = v2[ k2Offset + 1 ];
				} else {
					x2 = v2[ k2Offset - 1 ] + 1;
				}
				y2 = x2 - k2;
				while ( x2 < text1Length && y2 < text2Length &&
					text1.charAt( text1Length - x2 - 1 ) ===
					text2.charAt( text2Length - y2 - 1 ) ) {
					x2++;
					y2++;
				}
				v2[ k2Offset ] = x2;
				if ( x2 > text1Length ) {

					// Ran off the left of the graph.
					k2end += 2;
				} else if ( y2 > text2Length ) {

					// Ran off the top of the graph.
					k2start += 2;
				} else if ( !front ) {
					k1Offset = vOffset + delta - k2;
					if ( k1Offset >= 0 && k1Offset < vLength && v1[ k1Offset ] !== -1 ) {
						x1 = v1[ k1Offset ];
						y1 = vOffset + x1 - k1Offset;

						// Mirror x2 onto top-left coordinate system.
						x2 = text1Length - x2;
						if ( x1 >= x2 ) {

							// Overlap detected.
							return this.diffBisectSplit( text1, text2, x1, y1, deadline );
						}
					}
				}
			}
		}

		// Diff took too long and hit the deadline or
		// number of diffs equals number of characters, no commonality at all.
		return [
			[ DIFF_DELETE, text1 ],
			[ DIFF_INSERT, text2 ]
		];
	};

	/**
	 * Given the location of the 'middle snake', split the diff in two parts
	 * and recurse.
	 * @param {string} text1 Old string to be diffed.
	 * @param {string} text2 New string to be diffed.
	 * @param {number} x Index of split point in text1.
	 * @param {number} y Index of split point in text2.
	 * @param {number} deadline Time at which to bail if not yet complete.
	 * @return {!Array.<!DiffMatchPatch.Diff>} Array of diff tuples.
	 * @private
	 */
	DiffMatchPatch.prototype.diffBisectSplit = function( text1, text2, x, y, deadline ) {
		var text1a, text1b, text2a, text2b, diffs, diffsb;
		text1a = text1.substring( 0, x );
		text2a = text2.substring( 0, y );
		text1b = text1.substring( x );
		text2b = text2.substring( y );

		// Compute both diffs serially.
		diffs = this.DiffMain( text1a, text2a, false, deadline );
		diffsb = this.DiffMain( text1b, text2b, false, deadline );

		return diffs.concat( diffsb );
	};

	/**
	 * Reduce the number of edits by eliminating semantically trivial equalities.
	 * @param {!Array.<!DiffMatchPatch.Diff>} diffs Array of diff tuples.
	 */
	DiffMatchPatch.prototype.diffCleanupSemantic = function( diffs ) {
		var changes, equalities, equalitiesLength, lastequality,
			pointer, lengthInsertions2, lengthDeletions2, lengthInsertions1,
			lengthDeletions1, deletion, insertion, overlapLength1, overlapLength2;
		changes = false;
		equalities = []; // Stack of indices where equalities are found.
		equalitiesLength = 0; // Keeping our own length var is faster in JS.
		/** @type {?string} */
		lastequality = null;

		// Always equal to diffs[equalities[equalitiesLength - 1]][1]
		pointer = 0; // Index of current position.

		// Number of characters that changed prior to the equality.
		lengthInsertions1 = 0;
		lengthDeletions1 = 0;

		// Number of characters that changed after the equality.
		lengthInsertions2 = 0;
		lengthDeletions2 = 0;
		while ( pointer < diffs.length ) {
			if ( diffs[ pointer ][ 0 ] === DIFF_EQUAL ) { // Equality found.
				equalities[ equalitiesLength++ ] = pointer;
				lengthInsertions1 = lengthInsertions2;
				lengthDeletions1 = lengthDeletions2;
				lengthInsertions2 = 0;
				lengthDeletions2 = 0;
				lastequality = diffs[ pointer ][ 1 ];
			} else { // An insertion or deletion.
				if ( diffs[ pointer ][ 0 ] === DIFF_INSERT ) {
					lengthInsertions2 += diffs[ pointer ][ 1 ].length;
				} else {
					lengthDeletions2 += diffs[ pointer ][ 1 ].length;
				}

				// Eliminate an equality that is smaller or equal to the edits on both
				// sides of it.
				if ( lastequality && ( lastequality.length <=
						Math.max( lengthInsertions1, lengthDeletions1 ) ) &&
						( lastequality.length <= Math.max( lengthInsertions2,
							lengthDeletions2 ) ) ) {

					// Duplicate record.
					diffs.splice(
						equalities[ equalitiesLength - 1 ],
						0,
						[ DIFF_DELETE, lastequality ]
					);

					// Change second copy to insert.
					diffs[ equalities[ equalitiesLength - 1 ] + 1 ][ 0 ] = DIFF_INSERT;

					// Throw away the equality we just deleted.
					equalitiesLength--;

					// Throw away the previous equality (it needs to be reevaluated).
					equalitiesLength--;
					pointer = equalitiesLength > 0 ? equalities[ equalitiesLength - 1 ] : -1;

					// Reset the counters.
					lengthInsertions1 = 0;
					lengthDeletions1 = 0;
					lengthInsertions2 = 0;
					lengthDeletions2 = 0;
					lastequality = null;
					changes = true;
				}
			}
			pointer++;
		}

		// Normalize the diff.
		if ( changes ) {
			this.diffCleanupMerge( diffs );
		}

		// Find any overlaps between deletions and insertions.
		// e.g: <del>abcxxx</del><ins>xxxdef</ins>
		//   -> <del>abc</del>xxx<ins>def</ins>
		// e.g: <del>xxxabc</del><ins>defxxx</ins>
		//   -> <ins>def</ins>xxx<del>abc</del>
		// Only extract an overlap if it is as big as the edit ahead or behind it.
		pointer = 1;
		while ( pointer < diffs.length ) {
			if ( diffs[ pointer - 1 ][ 0 ] === DIFF_DELETE &&
					diffs[ pointer ][ 0 ] === DIFF_INSERT ) {
				deletion = diffs[ pointer - 1 ][ 1 ];
				insertion = diffs[ pointer ][ 1 ];
				overlapLength1 = this.diffCommonOverlap( deletion, insertion );
				overlapLength2 = this.diffCommonOverlap( insertion, deletion );
				if ( overlapLength1 >= overlapLength2 ) {
					if ( overlapLength1 >= deletion.length / 2 ||
							overlapLength1 >= insertion.length / 2 ) {

						// Overlap found.  Insert an equality and trim the surrounding edits.
						diffs.splice(
							pointer,
							0,
							[ DIFF_EQUAL, insertion.substring( 0, overlapLength1 ) ]
						);
						diffs[ pointer - 1 ][ 1 ] =
							deletion.substring( 0, deletion.length - overlapLength1 );
						diffs[ pointer + 1 ][ 1 ] = insertion.substring( overlapLength1 );
						pointer++;
					}
				} else {
					if ( overlapLength2 >= deletion.length / 2 ||
							overlapLength2 >= insertion.length / 2 ) {

						// Reverse overlap found.
						// Insert an equality and swap and trim the surrounding edits.
						diffs.splice(
							pointer,
							0,
							[ DIFF_EQUAL, deletion.substring( 0, overlapLength2 ) ]
						);

						diffs[ pointer - 1 ][ 0 ] = DIFF_INSERT;
						diffs[ pointer - 1 ][ 1 ] =
							insertion.substring( 0, insertion.length - overlapLength2 );
						diffs[ pointer + 1 ][ 0 ] = DIFF_DELETE;
						diffs[ pointer + 1 ][ 1 ] =
							deletion.substring( overlapLength2 );
						pointer++;
					}
				}
				pointer++;
			}
			pointer++;
		}
	};

	/**
	 * Determine if the suffix of one string is the prefix of another.
	 * @param {string} text1 First string.
	 * @param {string} text2 Second string.
	 * @return {number} The number of characters common to the end of the first
	 *     string and the start of the second string.
	 * @private
	 */
	DiffMatchPatch.prototype.diffCommonOverlap = function( text1, text2 ) {
		var text1Length, text2Length, textLength,
			best, length, pattern, found;

		// Cache the text lengths to prevent multiple calls.
		text1Length = text1.length;
		text2Length = text2.length;

		// Eliminate the null case.
		if ( text1Length === 0 || text2Length === 0 ) {
			return 0;
		}

		// Truncate the longer string.
		if ( text1Length > text2Length ) {
			text1 = text1.substring( text1Length - text2Length );
		} else if ( text1Length < text2Length ) {
			text2 = text2.substring( 0, text1Length );
		}
		textLength = Math.min( text1Length, text2Length );

		// Quick check for the worst case.
		if ( text1 === text2 ) {
			return textLength;
		}

		// Start by looking for a single character match
		// and increase length until no match is found.
		// Performance analysis: https://neil.fraser.name/news/2010/11/04/
		best = 0;
		length = 1;
		while ( true ) {
			pattern = text1.substring( textLength - length );
			found = text2.indexOf( pattern );
			if ( found === -1 ) {
				return best;
			}
			length += found;
			if ( found === 0 || text1.substring( textLength - length ) ===
					text2.substring( 0, length ) ) {
				best = length;
				length++;
			}
		}
	};

	/**
	 * Split two texts into an array of strings.  Reduce the texts to a string of
	 * hashes where each Unicode character represents one line.
	 * @param {string} text1 First string.
	 * @param {string} text2 Second string.
	 * @return {{chars1: string, chars2: string, lineArray: !Array.<string>}}
	 *     An object containing the encoded text1, the encoded text2 and
	 *     the array of unique strings.
	 *     The zeroth element of the array of unique strings is intentionally blank.
	 * @private
	 */
	DiffMatchPatch.prototype.diffLinesToChars = function( text1, text2 ) {
		var lineArray, lineHash, chars1, chars2;
		lineArray = []; // E.g. lineArray[4] === 'Hello\n'
		lineHash = {};  // E.g. lineHash['Hello\n'] === 4

		// '\x00' is a valid character, but various debuggers don't like it.
		// So we'll insert a junk entry to avoid generating a null character.
		lineArray[ 0 ] = "";

		/**
		 * Split a text into an array of strings.  Reduce the texts to a string of
		 * hashes where each Unicode character represents one line.
		 * Modifies linearray and linehash through being a closure.
		 * @param {string} text String to encode.
		 * @return {string} Encoded string.
		 * @private
		 */
		function diffLinesToCharsMunge( text ) {
			var chars, lineStart, lineEnd, lineArrayLength, line;
			chars = "";

			// Walk the text, pulling out a substring for each line.
			// text.split('\n') would would temporarily double our memory footprint.
			// Modifying text would create many large strings to garbage collect.
			lineStart = 0;
			lineEnd = -1;

			// Keeping our own length variable is faster than looking it up.
			lineArrayLength = lineArray.length;
			while ( lineEnd < text.length - 1 ) {
				lineEnd = text.indexOf( "\n", lineStart );
				if ( lineEnd === -1 ) {
					lineEnd = text.length - 1;
				}
				line = text.substring( lineStart, lineEnd + 1 );
				lineStart = lineEnd + 1;

				if ( lineHash.hasOwnProperty ? lineHash.hasOwnProperty( line ) :
							( lineHash[ line ] !== undefined ) ) {
					chars += String.fromCharCode( lineHash[ line ] );
				} else {
					chars += String.fromCharCode( lineArrayLength );
					lineHash[ line ] = lineArrayLength;
					lineArray[ lineArrayLength++ ] = line;
				}
			}
			return chars;
		}

		chars1 = diffLinesToCharsMunge( text1 );
		chars2 = diffLinesToCharsMunge( text2 );
		return {
			chars1: chars1,
			chars2: chars2,
			lineArray: lineArray
		};
	};

	/**
	 * Rehydrate the text in a diff from a string of line hashes to real lines of
	 * text.
	 * @param {!Array.<!DiffMatchPatch.Diff>} diffs Array of diff tuples.
	 * @param {!Array.<string>} lineArray Array of unique strings.
	 * @private
	 */
	DiffMatchPatch.prototype.diffCharsToLines = function( diffs, lineArray ) {
		var x, chars, text, y;
		for ( x = 0; x < diffs.length; x++ ) {
			chars = diffs[ x ][ 1 ];
			text = [];
			for ( y = 0; y < chars.length; y++ ) {
				text[ y ] = lineArray[ chars.charCodeAt( y ) ];
			}
			diffs[ x ][ 1 ] = text.join( "" );
		}
	};

	/**
	 * Reorder and merge like edit sections.  Merge equalities.
	 * Any edit section can move as long as it doesn't cross an equality.
	 * @param {!Array.<!DiffMatchPatch.Diff>} diffs Array of diff tuples.
	 */
	DiffMatchPatch.prototype.diffCleanupMerge = function( diffs ) {
		var pointer, countDelete, countInsert, textInsert, textDelete,
			commonlength, changes, diffPointer, position;
		diffs.push( [ DIFF_EQUAL, "" ] ); // Add a dummy entry at the end.
		pointer = 0;
		countDelete = 0;
		countInsert = 0;
		textDelete = "";
		textInsert = "";
		commonlength;
		while ( pointer < diffs.length ) {
			switch ( diffs[ pointer ][ 0 ] ) {
			case DIFF_INSERT:
				countInsert++;
				textInsert += diffs[ pointer ][ 1 ];
				pointer++;
				break;
			case DIFF_DELETE:
				countDelete++;
				textDelete += diffs[ pointer ][ 1 ];
				pointer++;
				break;
			case DIFF_EQUAL:

				// Upon reaching an equality, check for prior redundancies.
				if ( countDelete + countInsert > 1 ) {
					if ( countDelete !== 0 && countInsert !== 0 ) {

						// Factor out any common prefixes.
						commonlength = this.diffCommonPrefix( textInsert, textDelete );
						if ( commonlength !== 0 ) {
							if ( ( pointer - countDelete - countInsert ) > 0 &&
									diffs[ pointer - countDelete - countInsert - 1 ][ 0 ] ===
									DIFF_EQUAL ) {
								diffs[ pointer - countDelete - countInsert - 1 ][ 1 ] +=
									textInsert.substring( 0, commonlength );
							} else {
								diffs.splice( 0, 0, [ DIFF_EQUAL,
									textInsert.substring( 0, commonlength )
								] );
								pointer++;
							}
							textInsert = textInsert.substring( commonlength );
							textDelete = textDelete.substring( commonlength );
						}

						// Factor out any common suffixies.
						commonlength = this.diffCommonSuffix( textInsert, textDelete );
						if ( commonlength !== 0 ) {
							diffs[ pointer ][ 1 ] = textInsert.substring( textInsert.length -
									commonlength ) + diffs[ pointer ][ 1 ];
							textInsert = textInsert.substring( 0, textInsert.length -
								commonlength );
							textDelete = textDelete.substring( 0, textDelete.length -
								commonlength );
						}
					}

					// Delete the offending records and add the merged ones.
					if ( countDelete === 0 ) {
						diffs.splice( pointer - countInsert,
							countDelete + countInsert, [ DIFF_INSERT, textInsert ] );
					} else if ( countInsert === 0 ) {
						diffs.splice( pointer - countDelete,
							countDelete + countInsert, [ DIFF_DELETE, textDelete ] );
					} else {
						diffs.splice(
							pointer - countDelete - countInsert,
							countDelete + countInsert,
							[ DIFF_DELETE, textDelete ], [ DIFF_INSERT, textInsert ]
						);
					}
					pointer = pointer - countDelete - countInsert +
						( countDelete ? 1 : 0 ) + ( countInsert ? 1 : 0 ) + 1;
				} else if ( pointer !== 0 && diffs[ pointer - 1 ][ 0 ] === DIFF_EQUAL ) {

					// Merge this equality with the previous one.
					diffs[ pointer - 1 ][ 1 ] += diffs[ pointer ][ 1 ];
					diffs.splice( pointer, 1 );
				} else {
					pointer++;
				}
				countInsert = 0;
				countDelete = 0;
				textDelete = "";
				textInsert = "";
				break;
			}
		}
		if ( diffs[ diffs.length - 1 ][ 1 ] === "" ) {
			diffs.pop(); // Remove the dummy entry at the end.
		}

		// Second pass: look for single edits surrounded on both sides by equalities
		// which can be shifted sideways to eliminate an equality.
		// e.g: A<ins>BA</ins>C -> <ins>AB</ins>AC
		changes = false;
		pointer = 1;

		// Intentionally ignore the first and last element (don't need checking).
		while ( pointer < diffs.length - 1 ) {
			if ( diffs[ pointer - 1 ][ 0 ] === DIFF_EQUAL &&
					diffs[ pointer + 1 ][ 0 ] === DIFF_EQUAL ) {

				diffPointer = diffs[ pointer ][ 1 ];
				position = diffPointer.substring(
					diffPointer.length - diffs[ pointer - 1 ][ 1 ].length
				);

				// This is a single edit surrounded by equalities.
				if ( position === diffs[ pointer - 1 ][ 1 ] ) {

					// Shift the edit over the previous equality.
					diffs[ pointer ][ 1 ] = diffs[ pointer - 1 ][ 1 ] +
						diffs[ pointer ][ 1 ].substring( 0, diffs[ pointer ][ 1 ].length -
							diffs[ pointer - 1 ][ 1 ].length );
					diffs[ pointer + 1 ][ 1 ] =
						diffs[ pointer - 1 ][ 1 ] + diffs[ pointer + 1 ][ 1 ];
					diffs.splice( pointer - 1, 1 );
					changes = true;
				} else if ( diffPointer.substring( 0, diffs[ pointer + 1 ][ 1 ].length ) ===
						diffs[ pointer + 1 ][ 1 ] ) {

					// Shift the edit over the next equality.
					diffs[ pointer - 1 ][ 1 ] += diffs[ pointer + 1 ][ 1 ];
					diffs[ pointer ][ 1 ] =
						diffs[ pointer ][ 1 ].substring( diffs[ pointer + 1 ][ 1 ].length ) +
						diffs[ pointer + 1 ][ 1 ];
					diffs.splice( pointer + 1, 1 );
					changes = true;
				}
			}
			pointer++;
		}

		// If shifts were made, the diff needs reordering and another shift sweep.
		if ( changes ) {
			this.diffCleanupMerge( diffs );
		}
	};

	return function( o, n ) {
		var diff, output, text;
		diff = new DiffMatchPatch();
		output = diff.DiffMain( o, n );
		diff.diffCleanupEfficiency( output );
		text = diff.diffPrettyHtml( output );

		return text;
	};
}() );

}() );

},{}],2:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
var searchComponent = function searchComponent() {

    return {
        template: function template() {
            return '\n                <form>\n                    <label for="search">What did you eat today ?</label>\n                    <div>\n                        <input type="text" name="search" placeholder="Tacos, coffee, bannana, ..." />\n                        <input type="button" value="Search" />\n                    </div>\n                </form>';
        },
        init: function init() {
            var root = document.createElement('div');
            root.classList.add('root');
            root.innerHTML = this.template();

            this.fragment = document.createDocumentFragment();
            this.fragment.appendChild(root);

            var button = this.fragment.querySelector('input[type=button]');
            var searchField = this.fragment.querySelector('input[name=search]');
            searchField.style.borderColor = 'red';
            button.addEventListener('click', function (e) {

                window.console.log(e, searchField.value);
            });
            return this;
        },
        render: function render(container) {
            if (this.fragment && container instanceof HTMLElement) {
                container.appendChild(this.fragment.querySelector('.root > *'));
            }
            return this;
        }
    };
};

exports.default = searchComponent;

},{}],3:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _qunitjs = require('qunitjs');

var _qunitjs2 = _interopRequireDefault(_qunitjs);

var _search = require('../../src/components/search.js');

var _search2 = _interopRequireDefault(_search);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_qunitjs2.default.module('API');

_qunitjs2.default.test('factory', function (assert) {
    assert.equal(typeof _search2.default === 'undefined' ? 'undefined' : _typeof(_search2.default), 'function', 'The component module expose a function');
    assert.equal(_typeof((0, _search2.default)()), 'object', 'The component factory creates an object');
    assert.notDeepEqual((0, _search2.default)(), (0, _search2.default)(), 'The component factory creates new objects');
});

_qunitjs2.default.test('component', function (assert) {
    var component = (0, _search2.default)();
    assert.equal(_typeof(component.init), 'function', 'The component exposes an init method');
    assert.equal(_typeof(component.render), 'function', 'The component exposes a render method');
    assert.ok(true, 'Useful Test');
});

},{"../../src/components/search.js":2,"qunitjs":1}]},{},[3])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvcXVuaXRqcy9xdW5pdC9xdW5pdC5qcyIsInB1YmxpYy9qcy9zcmMvY29tcG9uZW50cy9zZWFyY2guanMiLCJwdWJsaWMvanMvdGVzdC9jb21wb25lbnRzL3Rlc3QuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7Ozs7QUM5dUlBLElBQU0sa0JBQWtCLFNBQVMsZUFBVCxHQUEyQjs7QUFFL0MsV0FBTztBQUNILGdCQURHLHNCQUNPO0FBQ047QUFRSCxTQVZFO0FBWUgsWUFaRyxrQkFZRztBQUNGLGdCQUFNLE9BQU8sU0FBUyxhQUFULENBQXVCLEtBQXZCLENBQWI7QUFDQSxpQkFBSyxTQUFMLENBQWUsR0FBZixDQUFtQixNQUFuQjtBQUNBLGlCQUFLLFNBQUwsR0FBaUIsS0FBSyxRQUFMLEVBQWpCOztBQUVBLGlCQUFLLFFBQUwsR0FBZ0IsU0FBUyxzQkFBVCxFQUFoQjtBQUNBLGlCQUFLLFFBQUwsQ0FBYyxXQUFkLENBQTBCLElBQTFCOztBQUVBLGdCQUFNLFNBQVMsS0FBSyxRQUFMLENBQWMsYUFBZCxDQUE0QixvQkFBNUIsQ0FBZjtBQUNBLGdCQUFNLGNBQWMsS0FBSyxRQUFMLENBQWMsYUFBZCxDQUE0QixvQkFBNUIsQ0FBcEI7QUFDQSx3QkFBWSxLQUFaLENBQWtCLFdBQWxCLEdBQWdDLEtBQWhDO0FBQ0EsbUJBQU8sZ0JBQVAsQ0FBd0IsT0FBeEIsRUFBaUMsYUFBSzs7QUFFbEMsdUJBQU8sT0FBUCxDQUFlLEdBQWYsQ0FBbUIsQ0FBbkIsRUFBc0IsWUFBWSxLQUFsQztBQUNILGFBSEQ7QUFJQSxtQkFBTyxJQUFQO0FBQ0gsU0E1QkU7QUE4QkgsY0E5Qkcsa0JBOEJJLFNBOUJKLEVBOEJjO0FBQ2IsZ0JBQUcsS0FBSyxRQUFMLElBQWlCLHFCQUFxQixXQUF6QyxFQUFxRDtBQUNqRCwwQkFBVSxXQUFWLENBQXNCLEtBQUssUUFBTCxDQUFjLGFBQWQsQ0FBNEIsV0FBNUIsQ0FBdEI7QUFDSDtBQUNELG1CQUFPLElBQVA7QUFDSDtBQW5DRSxLQUFQO0FBcUNILENBdkNEOztrQkF5Q2UsZTs7Ozs7OztBQ3pDZjs7OztBQUNBOzs7Ozs7QUFFQSxrQkFBTSxNQUFOLENBQWEsS0FBYjs7QUFFQSxrQkFBTSxJQUFOLENBQVcsU0FBWCxFQUFzQixrQkFBVTtBQUM1QixXQUFPLEtBQVAsb0ZBQXNDLFVBQXRDLEVBQWtELHdDQUFsRDtBQUNBLFdBQU8sS0FBUCxTQUFxQix1QkFBckIsR0FBd0MsUUFBeEMsRUFBa0QseUNBQWxEO0FBQ0EsV0FBTyxZQUFQLENBQW9CLHVCQUFwQixFQUF1Qyx1QkFBdkMsRUFBMEQsMkNBQTFEO0FBQ0gsQ0FKRDs7QUFNQSxrQkFBTSxJQUFOLENBQVcsV0FBWCxFQUF3QixrQkFBVTtBQUM5QixRQUFJLFlBQVksdUJBQWhCO0FBQ0EsV0FBTyxLQUFQLFNBQXFCLFVBQVUsSUFBL0IsR0FBcUMsVUFBckMsRUFBaUQsc0NBQWpEO0FBQ0MsV0FBTyxLQUFQLFNBQXFCLFVBQVUsTUFBL0IsR0FBdUMsVUFBdkMsRUFBbUQsdUNBQW5EO0FBQ0EsV0FBTyxFQUFQLENBQVUsSUFBVixFQUFnQixhQUFoQjtBQUVKLENBTkQiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLyohXG4gKiBRVW5pdCAxLjIzLjFcbiAqIGh0dHBzOi8vcXVuaXRqcy5jb20vXG4gKlxuICogQ29weXJpZ2h0IGpRdWVyeSBGb3VuZGF0aW9uIGFuZCBvdGhlciBjb250cmlidXRvcnNcbiAqIFJlbGVhc2VkIHVuZGVyIHRoZSBNSVQgbGljZW5zZVxuICogaHR0cHM6Ly9qcXVlcnkub3JnL2xpY2Vuc2VcbiAqXG4gKiBEYXRlOiAyMDE2LTA0LTEyVDE3OjI5WlxuICovXG5cbiggZnVuY3Rpb24oIGdsb2JhbCApIHtcblxudmFyIFFVbml0ID0ge307XG5cbnZhciBEYXRlID0gZ2xvYmFsLkRhdGU7XG52YXIgbm93ID0gRGF0ZS5ub3cgfHwgZnVuY3Rpb24oKSB7XG5cdHJldHVybiBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbn07XG5cbnZhciBzZXRUaW1lb3V0ID0gZ2xvYmFsLnNldFRpbWVvdXQ7XG52YXIgY2xlYXJUaW1lb3V0ID0gZ2xvYmFsLmNsZWFyVGltZW91dDtcblxuLy8gU3RvcmUgYSBsb2NhbCB3aW5kb3cgZnJvbSB0aGUgZ2xvYmFsIHRvIGFsbG93IGRpcmVjdCByZWZlcmVuY2VzLlxudmFyIHdpbmRvdyA9IGdsb2JhbC53aW5kb3c7XG5cbnZhciBkZWZpbmVkID0ge1xuXHRkb2N1bWVudDogd2luZG93ICYmIHdpbmRvdy5kb2N1bWVudCAhPT0gdW5kZWZpbmVkLFxuXHRzZXRUaW1lb3V0OiBzZXRUaW1lb3V0ICE9PSB1bmRlZmluZWQsXG5cdHNlc3Npb25TdG9yYWdlOiAoIGZ1bmN0aW9uKCkge1xuXHRcdHZhciB4ID0gXCJxdW5pdC10ZXN0LXN0cmluZ1wiO1xuXHRcdHRyeSB7XG5cdFx0XHRzZXNzaW9uU3RvcmFnZS5zZXRJdGVtKCB4LCB4ICk7XG5cdFx0XHRzZXNzaW9uU3RvcmFnZS5yZW1vdmVJdGVtKCB4ICk7XG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9IGNhdGNoICggZSApIHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cdH0oKSApXG59O1xuXG52YXIgZmlsZU5hbWUgPSAoIHNvdXJjZUZyb21TdGFja3RyYWNlKCAwICkgfHwgXCJcIiApLnJlcGxhY2UoIC8oOlxcZCspK1xcKT8vLCBcIlwiICkucmVwbGFjZSggLy4rXFwvLywgXCJcIiApO1xudmFyIGdsb2JhbFN0YXJ0Q2FsbGVkID0gZmFsc2U7XG52YXIgcnVuU3RhcnRlZCA9IGZhbHNlO1xuXG52YXIgdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLFxuXHRoYXNPd24gPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5O1xuXG4vLyBSZXR1cm5zIGEgbmV3IEFycmF5IHdpdGggdGhlIGVsZW1lbnRzIHRoYXQgYXJlIGluIGEgYnV0IG5vdCBpbiBiXG5mdW5jdGlvbiBkaWZmKCBhLCBiICkge1xuXHR2YXIgaSwgaixcblx0XHRyZXN1bHQgPSBhLnNsaWNlKCk7XG5cblx0Zm9yICggaSA9IDA7IGkgPCByZXN1bHQubGVuZ3RoOyBpKysgKSB7XG5cdFx0Zm9yICggaiA9IDA7IGogPCBiLmxlbmd0aDsgaisrICkge1xuXHRcdFx0aWYgKCByZXN1bHRbIGkgXSA9PT0gYlsgaiBdICkge1xuXHRcdFx0XHRyZXN1bHQuc3BsaWNlKCBpLCAxICk7XG5cdFx0XHRcdGktLTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cdHJldHVybiByZXN1bHQ7XG59XG5cbi8vIEZyb20ganF1ZXJ5LmpzXG5mdW5jdGlvbiBpbkFycmF5KCBlbGVtLCBhcnJheSApIHtcblx0aWYgKCBhcnJheS5pbmRleE9mICkge1xuXHRcdHJldHVybiBhcnJheS5pbmRleE9mKCBlbGVtICk7XG5cdH1cblxuXHRmb3IgKCB2YXIgaSA9IDAsIGxlbmd0aCA9IGFycmF5Lmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrICkge1xuXHRcdGlmICggYXJyYXlbIGkgXSA9PT0gZWxlbSApIHtcblx0XHRcdHJldHVybiBpO1xuXHRcdH1cblx0fVxuXG5cdHJldHVybiAtMTtcbn1cblxuLyoqXG4gKiBNYWtlcyBhIGNsb25lIG9mIGFuIG9iamVjdCB1c2luZyBvbmx5IEFycmF5IG9yIE9iamVjdCBhcyBiYXNlLFxuICogYW5kIGNvcGllcyBvdmVyIHRoZSBvd24gZW51bWVyYWJsZSBwcm9wZXJ0aWVzLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmpcbiAqIEByZXR1cm4ge09iamVjdH0gTmV3IG9iamVjdCB3aXRoIG9ubHkgdGhlIG93biBwcm9wZXJ0aWVzIChyZWN1cnNpdmVseSkuXG4gKi9cbmZ1bmN0aW9uIG9iamVjdFZhbHVlcyAoIG9iaiApIHtcblx0dmFyIGtleSwgdmFsLFxuXHRcdHZhbHMgPSBRVW5pdC5pcyggXCJhcnJheVwiLCBvYmogKSA/IFtdIDoge307XG5cdGZvciAoIGtleSBpbiBvYmogKSB7XG5cdFx0aWYgKCBoYXNPd24uY2FsbCggb2JqLCBrZXkgKSApIHtcblx0XHRcdHZhbCA9IG9ialsga2V5IF07XG5cdFx0XHR2YWxzWyBrZXkgXSA9IHZhbCA9PT0gT2JqZWN0KCB2YWwgKSA/IG9iamVjdFZhbHVlcyggdmFsICkgOiB2YWw7XG5cdFx0fVxuXHR9XG5cdHJldHVybiB2YWxzO1xufVxuXG5mdW5jdGlvbiBleHRlbmQoIGEsIGIsIHVuZGVmT25seSApIHtcblx0Zm9yICggdmFyIHByb3AgaW4gYiApIHtcblx0XHRpZiAoIGhhc093bi5jYWxsKCBiLCBwcm9wICkgKSB7XG5cblx0XHRcdC8vIEF2b2lkIFwiTWVtYmVyIG5vdCBmb3VuZFwiIGVycm9yIGluIElFOCBjYXVzZWQgYnkgbWVzc2luZyB3aXRoIHdpbmRvdy5jb25zdHJ1Y3RvclxuXHRcdFx0Ly8gVGhpcyBibG9jayBydW5zIG9uIGV2ZXJ5IGVudmlyb25tZW50LCBzbyBgZ2xvYmFsYCBpcyBiZWluZyB1c2VkIGluc3RlYWQgb2YgYHdpbmRvd2Bcblx0XHRcdC8vIHRvIGF2b2lkIGVycm9ycyBvbiBub2RlLlxuXHRcdFx0aWYgKCBwcm9wICE9PSBcImNvbnN0cnVjdG9yXCIgfHwgYSAhPT0gZ2xvYmFsICkge1xuXHRcdFx0XHRpZiAoIGJbIHByb3AgXSA9PT0gdW5kZWZpbmVkICkge1xuXHRcdFx0XHRcdGRlbGV0ZSBhWyBwcm9wIF07XG5cdFx0XHRcdH0gZWxzZSBpZiAoICEoIHVuZGVmT25seSAmJiB0eXBlb2YgYVsgcHJvcCBdICE9PSBcInVuZGVmaW5lZFwiICkgKSB7XG5cdFx0XHRcdFx0YVsgcHJvcCBdID0gYlsgcHJvcCBdO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIGE7XG59XG5cbmZ1bmN0aW9uIG9iamVjdFR5cGUoIG9iaiApIHtcblx0aWYgKCB0eXBlb2Ygb2JqID09PSBcInVuZGVmaW5lZFwiICkge1xuXHRcdHJldHVybiBcInVuZGVmaW5lZFwiO1xuXHR9XG5cblx0Ly8gQ29uc2lkZXI6IHR5cGVvZiBudWxsID09PSBvYmplY3Rcblx0aWYgKCBvYmogPT09IG51bGwgKSB7XG5cdFx0cmV0dXJuIFwibnVsbFwiO1xuXHR9XG5cblx0dmFyIG1hdGNoID0gdG9TdHJpbmcuY2FsbCggb2JqICkubWF0Y2goIC9eXFxbb2JqZWN0XFxzKC4qKVxcXSQvICksXG5cdFx0dHlwZSA9IG1hdGNoICYmIG1hdGNoWyAxIF07XG5cblx0c3dpdGNoICggdHlwZSApIHtcblx0XHRjYXNlIFwiTnVtYmVyXCI6XG5cdFx0XHRpZiAoIGlzTmFOKCBvYmogKSApIHtcblx0XHRcdFx0cmV0dXJuIFwibmFuXCI7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gXCJudW1iZXJcIjtcblx0XHRjYXNlIFwiU3RyaW5nXCI6XG5cdFx0Y2FzZSBcIkJvb2xlYW5cIjpcblx0XHRjYXNlIFwiQXJyYXlcIjpcblx0XHRjYXNlIFwiU2V0XCI6XG5cdFx0Y2FzZSBcIk1hcFwiOlxuXHRcdGNhc2UgXCJEYXRlXCI6XG5cdFx0Y2FzZSBcIlJlZ0V4cFwiOlxuXHRcdGNhc2UgXCJGdW5jdGlvblwiOlxuXHRcdGNhc2UgXCJTeW1ib2xcIjpcblx0XHRcdHJldHVybiB0eXBlLnRvTG93ZXJDYXNlKCk7XG5cdH1cblx0aWYgKCB0eXBlb2Ygb2JqID09PSBcIm9iamVjdFwiICkge1xuXHRcdHJldHVybiBcIm9iamVjdFwiO1xuXHR9XG59XG5cbi8vIFNhZmUgb2JqZWN0IHR5cGUgY2hlY2tpbmdcbmZ1bmN0aW9uIGlzKCB0eXBlLCBvYmogKSB7XG5cdHJldHVybiBRVW5pdC5vYmplY3RUeXBlKCBvYmogKSA9PT0gdHlwZTtcbn1cblxuLy8gRG9lc24ndCBzdXBwb3J0IElFNiB0byBJRTksIGl0IHdpbGwgcmV0dXJuIHVuZGVmaW5lZCBvbiB0aGVzZSBicm93c2Vyc1xuLy8gU2VlIGFsc28gaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4vSmF2YVNjcmlwdC9SZWZlcmVuY2UvR2xvYmFsX09iamVjdHMvRXJyb3IvU3RhY2tcbmZ1bmN0aW9uIGV4dHJhY3RTdGFja3RyYWNlKCBlLCBvZmZzZXQgKSB7XG5cdG9mZnNldCA9IG9mZnNldCA9PT0gdW5kZWZpbmVkID8gNCA6IG9mZnNldDtcblxuXHR2YXIgc3RhY2ssIGluY2x1ZGUsIGk7XG5cblx0aWYgKCBlLnN0YWNrICkge1xuXHRcdHN0YWNrID0gZS5zdGFjay5zcGxpdCggXCJcXG5cIiApO1xuXHRcdGlmICggL15lcnJvciQvaS50ZXN0KCBzdGFja1sgMCBdICkgKSB7XG5cdFx0XHRzdGFjay5zaGlmdCgpO1xuXHRcdH1cblx0XHRpZiAoIGZpbGVOYW1lICkge1xuXHRcdFx0aW5jbHVkZSA9IFtdO1xuXHRcdFx0Zm9yICggaSA9IG9mZnNldDsgaSA8IHN0YWNrLmxlbmd0aDsgaSsrICkge1xuXHRcdFx0XHRpZiAoIHN0YWNrWyBpIF0uaW5kZXhPZiggZmlsZU5hbWUgKSAhPT0gLTEgKSB7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdH1cblx0XHRcdFx0aW5jbHVkZS5wdXNoKCBzdGFja1sgaSBdICk7XG5cdFx0XHR9XG5cdFx0XHRpZiAoIGluY2x1ZGUubGVuZ3RoICkge1xuXHRcdFx0XHRyZXR1cm4gaW5jbHVkZS5qb2luKCBcIlxcblwiICk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiBzdGFja1sgb2Zmc2V0IF07XG5cblx0Ly8gU3VwcG9ydDogU2FmYXJpIDw9NiBvbmx5XG5cdH0gZWxzZSBpZiAoIGUuc291cmNlVVJMICkge1xuXG5cdFx0Ly8gRXhjbHVkZSB1c2VsZXNzIHNlbGYtcmVmZXJlbmNlIGZvciBnZW5lcmF0ZWQgRXJyb3Igb2JqZWN0c1xuXHRcdGlmICggL3F1bml0LmpzJC8udGVzdCggZS5zb3VyY2VVUkwgKSApIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHQvLyBGb3IgYWN0dWFsIGV4Y2VwdGlvbnMsIHRoaXMgaXMgdXNlZnVsXG5cdFx0cmV0dXJuIGUuc291cmNlVVJMICsgXCI6XCIgKyBlLmxpbmU7XG5cdH1cbn1cblxuZnVuY3Rpb24gc291cmNlRnJvbVN0YWNrdHJhY2UoIG9mZnNldCApIHtcblx0dmFyIGVycm9yID0gbmV3IEVycm9yKCk7XG5cblx0Ly8gU3VwcG9ydDogU2FmYXJpIDw9NyBvbmx5LCBJRSA8PTEwIC0gMTEgb25seVxuXHQvLyBOb3QgYWxsIGJyb3dzZXJzIGdlbmVyYXRlIHRoZSBgc3RhY2tgIHByb3BlcnR5IGZvciBgbmV3IEVycm9yKClgLCBzZWUgYWxzbyAjNjM2XG5cdGlmICggIWVycm9yLnN0YWNrICkge1xuXHRcdHRyeSB7XG5cdFx0XHR0aHJvdyBlcnJvcjtcblx0XHR9IGNhdGNoICggZXJyICkge1xuXHRcdFx0ZXJyb3IgPSBlcnI7XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIGV4dHJhY3RTdGFja3RyYWNlKCBlcnJvciwgb2Zmc2V0ICk7XG59XG5cbi8qKlxuICogQ29uZmlnIG9iamVjdDogTWFpbnRhaW4gaW50ZXJuYWwgc3RhdGVcbiAqIExhdGVyIGV4cG9zZWQgYXMgUVVuaXQuY29uZmlnXG4gKiBgY29uZmlnYCBpbml0aWFsaXplZCBhdCB0b3Agb2Ygc2NvcGVcbiAqL1xudmFyIGNvbmZpZyA9IHtcblxuXHQvLyBUaGUgcXVldWUgb2YgdGVzdHMgdG8gcnVuXG5cdHF1ZXVlOiBbXSxcblxuXHQvLyBCbG9jayB1bnRpbCBkb2N1bWVudCByZWFkeVxuXHRibG9ja2luZzogdHJ1ZSxcblxuXHQvLyBCeSBkZWZhdWx0LCBydW4gcHJldmlvdXNseSBmYWlsZWQgdGVzdHMgZmlyc3Rcblx0Ly8gdmVyeSB1c2VmdWwgaW4gY29tYmluYXRpb24gd2l0aCBcIkhpZGUgcGFzc2VkIHRlc3RzXCIgY2hlY2tlZFxuXHRyZW9yZGVyOiB0cnVlLFxuXG5cdC8vIEJ5IGRlZmF1bHQsIG1vZGlmeSBkb2N1bWVudC50aXRsZSB3aGVuIHN1aXRlIGlzIGRvbmVcblx0YWx0ZXJ0aXRsZTogdHJ1ZSxcblxuXHQvLyBIVE1MIFJlcG9ydGVyOiBjb2xsYXBzZSBldmVyeSB0ZXN0IGV4Y2VwdCB0aGUgZmlyc3QgZmFpbGluZyB0ZXN0XG5cdC8vIElmIGZhbHNlLCBhbGwgZmFpbGluZyB0ZXN0cyB3aWxsIGJlIGV4cGFuZGVkXG5cdGNvbGxhcHNlOiB0cnVlLFxuXG5cdC8vIEJ5IGRlZmF1bHQsIHNjcm9sbCB0byB0b3Agb2YgdGhlIHBhZ2Ugd2hlbiBzdWl0ZSBpcyBkb25lXG5cdHNjcm9sbHRvcDogdHJ1ZSxcblxuXHQvLyBEZXB0aCB1cC10byB3aGljaCBvYmplY3Qgd2lsbCBiZSBkdW1wZWRcblx0bWF4RGVwdGg6IDUsXG5cblx0Ly8gV2hlbiBlbmFibGVkLCBhbGwgdGVzdHMgbXVzdCBjYWxsIGV4cGVjdCgpXG5cdHJlcXVpcmVFeHBlY3RzOiBmYWxzZSxcblxuXHQvLyBQbGFjZWhvbGRlciBmb3IgdXNlci1jb25maWd1cmFibGUgZm9ybS1leHBvc2VkIFVSTCBwYXJhbWV0ZXJzXG5cdHVybENvbmZpZzogW10sXG5cblx0Ly8gU2V0IG9mIGFsbCBtb2R1bGVzLlxuXHRtb2R1bGVzOiBbXSxcblxuXHQvLyBTdGFjayBvZiBuZXN0ZWQgbW9kdWxlc1xuXHRtb2R1bGVTdGFjazogW10sXG5cblx0Ly8gVGhlIGZpcnN0IHVubmFtZWQgbW9kdWxlXG5cdGN1cnJlbnRNb2R1bGU6IHtcblx0XHRuYW1lOiBcIlwiLFxuXHRcdHRlc3RzOiBbXVxuXHR9LFxuXG5cdGNhbGxiYWNrczoge31cbn07XG5cbi8vIFB1c2ggYSBsb29zZSB1bm5hbWVkIG1vZHVsZSB0byB0aGUgbW9kdWxlcyBjb2xsZWN0aW9uXG5jb25maWcubW9kdWxlcy5wdXNoKCBjb25maWcuY3VycmVudE1vZHVsZSApO1xuXG52YXIgbG9nZ2luZ0NhbGxiYWNrcyA9IHt9O1xuXG4vLyBSZWdpc3RlciBsb2dnaW5nIGNhbGxiYWNrc1xuZnVuY3Rpb24gcmVnaXN0ZXJMb2dnaW5nQ2FsbGJhY2tzKCBvYmogKSB7XG5cdHZhciBpLCBsLCBrZXksXG5cdFx0Y2FsbGJhY2tOYW1lcyA9IFsgXCJiZWdpblwiLCBcImRvbmVcIiwgXCJsb2dcIiwgXCJ0ZXN0U3RhcnRcIiwgXCJ0ZXN0RG9uZVwiLFxuXHRcdFx0XCJtb2R1bGVTdGFydFwiLCBcIm1vZHVsZURvbmVcIiBdO1xuXG5cdGZ1bmN0aW9uIHJlZ2lzdGVyTG9nZ2luZ0NhbGxiYWNrKCBrZXkgKSB7XG5cdFx0dmFyIGxvZ2dpbmdDYWxsYmFjayA9IGZ1bmN0aW9uKCBjYWxsYmFjayApIHtcblx0XHRcdGlmICggb2JqZWN0VHlwZSggY2FsbGJhY2sgKSAhPT0gXCJmdW5jdGlvblwiICkge1xuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXG5cdFx0XHRcdFx0XCJRVW5pdCBsb2dnaW5nIG1ldGhvZHMgcmVxdWlyZSBhIGNhbGxiYWNrIGZ1bmN0aW9uIGFzIHRoZWlyIGZpcnN0IHBhcmFtZXRlcnMuXCJcblx0XHRcdFx0KTtcblx0XHRcdH1cblxuXHRcdFx0Y29uZmlnLmNhbGxiYWNrc1sga2V5IF0ucHVzaCggY2FsbGJhY2sgKTtcblx0XHR9O1xuXG5cdFx0Ly8gREVQUkVDQVRFRDogVGhpcyB3aWxsIGJlIHJlbW92ZWQgb24gUVVuaXQgMi4wLjArXG5cdFx0Ly8gU3RvcmVzIHRoZSByZWdpc3RlcmVkIGZ1bmN0aW9ucyBhbGxvd2luZyByZXN0b3Jpbmdcblx0XHQvLyBhdCB2ZXJpZnlMb2dnaW5nQ2FsbGJhY2tzKCkgaWYgbW9kaWZpZWRcblx0XHRsb2dnaW5nQ2FsbGJhY2tzWyBrZXkgXSA9IGxvZ2dpbmdDYWxsYmFjaztcblxuXHRcdHJldHVybiBsb2dnaW5nQ2FsbGJhY2s7XG5cdH1cblxuXHRmb3IgKCBpID0gMCwgbCA9IGNhbGxiYWNrTmFtZXMubGVuZ3RoOyBpIDwgbDsgaSsrICkge1xuXHRcdGtleSA9IGNhbGxiYWNrTmFtZXNbIGkgXTtcblxuXHRcdC8vIEluaXRpYWxpemUga2V5IGNvbGxlY3Rpb24gb2YgbG9nZ2luZyBjYWxsYmFja1xuXHRcdGlmICggb2JqZWN0VHlwZSggY29uZmlnLmNhbGxiYWNrc1sga2V5IF0gKSA9PT0gXCJ1bmRlZmluZWRcIiApIHtcblx0XHRcdGNvbmZpZy5jYWxsYmFja3NbIGtleSBdID0gW107XG5cdFx0fVxuXG5cdFx0b2JqWyBrZXkgXSA9IHJlZ2lzdGVyTG9nZ2luZ0NhbGxiYWNrKCBrZXkgKTtcblx0fVxufVxuXG5mdW5jdGlvbiBydW5Mb2dnaW5nQ2FsbGJhY2tzKCBrZXksIGFyZ3MgKSB7XG5cdHZhciBpLCBsLCBjYWxsYmFja3M7XG5cblx0Y2FsbGJhY2tzID0gY29uZmlnLmNhbGxiYWNrc1sga2V5IF07XG5cdGZvciAoIGkgPSAwLCBsID0gY2FsbGJhY2tzLmxlbmd0aDsgaSA8IGw7IGkrKyApIHtcblx0XHRjYWxsYmFja3NbIGkgXSggYXJncyApO1xuXHR9XG59XG5cbi8vIERFUFJFQ0FURUQ6IFRoaXMgd2lsbCBiZSByZW1vdmVkIG9uIDIuMC4wK1xuLy8gVGhpcyBmdW5jdGlvbiB2ZXJpZmllcyBpZiB0aGUgbG9nZ2luZ0NhbGxiYWNrcyB3ZXJlIG1vZGlmaWVkIGJ5IHRoZSB1c2VyXG4vLyBJZiBzbywgaXQgd2lsbCByZXN0b3JlIGl0LCBhc3NpZ24gdGhlIGdpdmVuIGNhbGxiYWNrIGFuZCBwcmludCBhIGNvbnNvbGUgd2FybmluZ1xuZnVuY3Rpb24gdmVyaWZ5TG9nZ2luZ0NhbGxiYWNrcygpIHtcblx0dmFyIGxvZ2dpbmdDYWxsYmFjaywgdXNlckNhbGxiYWNrO1xuXG5cdGZvciAoIGxvZ2dpbmdDYWxsYmFjayBpbiBsb2dnaW5nQ2FsbGJhY2tzICkge1xuXHRcdGlmICggUVVuaXRbIGxvZ2dpbmdDYWxsYmFjayBdICE9PSBsb2dnaW5nQ2FsbGJhY2tzWyBsb2dnaW5nQ2FsbGJhY2sgXSApIHtcblxuXHRcdFx0dXNlckNhbGxiYWNrID0gUVVuaXRbIGxvZ2dpbmdDYWxsYmFjayBdO1xuXG5cdFx0XHQvLyBSZXN0b3JlIHRoZSBjYWxsYmFjayBmdW5jdGlvblxuXHRcdFx0UVVuaXRbIGxvZ2dpbmdDYWxsYmFjayBdID0gbG9nZ2luZ0NhbGxiYWNrc1sgbG9nZ2luZ0NhbGxiYWNrIF07XG5cblx0XHRcdC8vIEFzc2lnbiB0aGUgZGVwcmVjYXRlZCBnaXZlbiBjYWxsYmFja1xuXHRcdFx0UVVuaXRbIGxvZ2dpbmdDYWxsYmFjayBdKCB1c2VyQ2FsbGJhY2sgKTtcblxuXHRcdFx0aWYgKCBnbG9iYWwuY29uc29sZSAmJiBnbG9iYWwuY29uc29sZS53YXJuICkge1xuXHRcdFx0XHRnbG9iYWwuY29uc29sZS53YXJuKFxuXHRcdFx0XHRcdFwiUVVuaXQuXCIgKyBsb2dnaW5nQ2FsbGJhY2sgKyBcIiB3YXMgcmVwbGFjZWQgd2l0aCBhIG5ldyB2YWx1ZS5cXG5cIiArXG5cdFx0XHRcdFx0XCJQbGVhc2UsIGNoZWNrIG91dCB0aGUgZG9jdW1lbnRhdGlvbiBvbiBob3cgdG8gYXBwbHkgbG9nZ2luZyBjYWxsYmFja3MuXFxuXCIgK1xuXHRcdFx0XHRcdFwiUmVmZXJlbmNlOiBodHRwczovL2FwaS5xdW5pdGpzLmNvbS9jYXRlZ29yeS9jYWxsYmFja3MvXCJcblx0XHRcdFx0KTtcblx0XHRcdH1cblx0XHR9XG5cdH1cbn1cblxuKCBmdW5jdGlvbigpIHtcblx0aWYgKCAhZGVmaW5lZC5kb2N1bWVudCApIHtcblx0XHRyZXR1cm47XG5cdH1cblxuXHQvLyBgb25FcnJvckZuUHJldmAgaW5pdGlhbGl6ZWQgYXQgdG9wIG9mIHNjb3BlXG5cdC8vIFByZXNlcnZlIG90aGVyIGhhbmRsZXJzXG5cdHZhciBvbkVycm9yRm5QcmV2ID0gd2luZG93Lm9uZXJyb3I7XG5cblx0Ly8gQ292ZXIgdW5jYXVnaHQgZXhjZXB0aW9uc1xuXHQvLyBSZXR1cm5pbmcgdHJ1ZSB3aWxsIHN1cHByZXNzIHRoZSBkZWZhdWx0IGJyb3dzZXIgaGFuZGxlcixcblx0Ly8gcmV0dXJuaW5nIGZhbHNlIHdpbGwgbGV0IGl0IHJ1bi5cblx0d2luZG93Lm9uZXJyb3IgPSBmdW5jdGlvbiggZXJyb3IsIGZpbGVQYXRoLCBsaW5lck5yICkge1xuXHRcdHZhciByZXQgPSBmYWxzZTtcblx0XHRpZiAoIG9uRXJyb3JGblByZXYgKSB7XG5cdFx0XHRyZXQgPSBvbkVycm9yRm5QcmV2KCBlcnJvciwgZmlsZVBhdGgsIGxpbmVyTnIgKTtcblx0XHR9XG5cblx0XHQvLyBUcmVhdCByZXR1cm4gdmFsdWUgYXMgd2luZG93Lm9uZXJyb3IgaXRzZWxmIGRvZXMsXG5cdFx0Ly8gT25seSBkbyBvdXIgaGFuZGxpbmcgaWYgbm90IHN1cHByZXNzZWQuXG5cdFx0aWYgKCByZXQgIT09IHRydWUgKSB7XG5cdFx0XHRpZiAoIFFVbml0LmNvbmZpZy5jdXJyZW50ICkge1xuXHRcdFx0XHRpZiAoIFFVbml0LmNvbmZpZy5jdXJyZW50Lmlnbm9yZUdsb2JhbEVycm9ycyApIHtcblx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFx0fVxuXHRcdFx0XHRRVW5pdC5wdXNoRmFpbHVyZSggZXJyb3IsIGZpbGVQYXRoICsgXCI6XCIgKyBsaW5lck5yICk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRRVW5pdC50ZXN0KCBcImdsb2JhbCBmYWlsdXJlXCIsIGV4dGVuZCggZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0UVVuaXQucHVzaEZhaWx1cmUoIGVycm9yLCBmaWxlUGF0aCArIFwiOlwiICsgbGluZXJOciApO1xuXHRcdFx0XHR9LCB7IHZhbGlkVGVzdDogdHJ1ZSB9ICkgKTtcblx0XHRcdH1cblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cblx0XHRyZXR1cm4gcmV0O1xuXHR9O1xufSgpICk7XG5cbi8vIEZpZ3VyZSBvdXQgaWYgd2UncmUgcnVubmluZyB0aGUgdGVzdHMgZnJvbSBhIHNlcnZlciBvciBub3RcblFVbml0LmlzTG9jYWwgPSAhKCBkZWZpbmVkLmRvY3VtZW50ICYmIHdpbmRvdy5sb2NhdGlvbi5wcm90b2NvbCAhPT0gXCJmaWxlOlwiICk7XG5cbi8vIEV4cG9zZSB0aGUgY3VycmVudCBRVW5pdCB2ZXJzaW9uXG5RVW5pdC52ZXJzaW9uID0gXCIxLjIzLjFcIjtcblxuZXh0ZW5kKCBRVW5pdCwge1xuXG5cdC8vIENhbGwgb24gc3RhcnQgb2YgbW9kdWxlIHRlc3QgdG8gcHJlcGVuZCBuYW1lIHRvIGFsbCB0ZXN0c1xuXHRtb2R1bGU6IGZ1bmN0aW9uKCBuYW1lLCB0ZXN0RW52aXJvbm1lbnQsIGV4ZWN1dGVOb3cgKSB7XG5cdFx0dmFyIG1vZHVsZSwgbW9kdWxlRm5zO1xuXHRcdHZhciBjdXJyZW50TW9kdWxlID0gY29uZmlnLmN1cnJlbnRNb2R1bGU7XG5cblx0XHRpZiAoIGFyZ3VtZW50cy5sZW5ndGggPT09IDIgKSB7XG5cdFx0XHRpZiAoIG9iamVjdFR5cGUoIHRlc3RFbnZpcm9ubWVudCApID09PSBcImZ1bmN0aW9uXCIgKSB7XG5cdFx0XHRcdGV4ZWN1dGVOb3cgPSB0ZXN0RW52aXJvbm1lbnQ7XG5cdFx0XHRcdHRlc3RFbnZpcm9ubWVudCA9IHVuZGVmaW5lZDtcblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBERVBSRUNBVEVEOiBoYW5kbGVzIHNldHVwL3RlYXJkb3duIGZ1bmN0aW9ucyxcblx0XHQvLyBiZWZvcmVFYWNoIGFuZCBhZnRlckVhY2ggc2hvdWxkIGJlIHVzZWQgaW5zdGVhZFxuXHRcdGlmICggdGVzdEVudmlyb25tZW50ICYmIHRlc3RFbnZpcm9ubWVudC5zZXR1cCApIHtcblx0XHRcdHRlc3RFbnZpcm9ubWVudC5iZWZvcmVFYWNoID0gdGVzdEVudmlyb25tZW50LnNldHVwO1xuXHRcdFx0ZGVsZXRlIHRlc3RFbnZpcm9ubWVudC5zZXR1cDtcblx0XHR9XG5cdFx0aWYgKCB0ZXN0RW52aXJvbm1lbnQgJiYgdGVzdEVudmlyb25tZW50LnRlYXJkb3duICkge1xuXHRcdFx0dGVzdEVudmlyb25tZW50LmFmdGVyRWFjaCA9IHRlc3RFbnZpcm9ubWVudC50ZWFyZG93bjtcblx0XHRcdGRlbGV0ZSB0ZXN0RW52aXJvbm1lbnQudGVhcmRvd247XG5cdFx0fVxuXG5cdFx0bW9kdWxlID0gY3JlYXRlTW9kdWxlKCk7XG5cblx0XHRtb2R1bGVGbnMgPSB7XG5cdFx0XHRiZWZvcmVFYWNoOiBzZXRIb29rKCBtb2R1bGUsIFwiYmVmb3JlRWFjaFwiICksXG5cdFx0XHRhZnRlckVhY2g6IHNldEhvb2soIG1vZHVsZSwgXCJhZnRlckVhY2hcIiApXG5cdFx0fTtcblxuXHRcdGlmICggb2JqZWN0VHlwZSggZXhlY3V0ZU5vdyApID09PSBcImZ1bmN0aW9uXCIgKSB7XG5cdFx0XHRjb25maWcubW9kdWxlU3RhY2sucHVzaCggbW9kdWxlICk7XG5cdFx0XHRzZXRDdXJyZW50TW9kdWxlKCBtb2R1bGUgKTtcblx0XHRcdGV4ZWN1dGVOb3cuY2FsbCggbW9kdWxlLnRlc3RFbnZpcm9ubWVudCwgbW9kdWxlRm5zICk7XG5cdFx0XHRjb25maWcubW9kdWxlU3RhY2sucG9wKCk7XG5cdFx0XHRtb2R1bGUgPSBtb2R1bGUucGFyZW50TW9kdWxlIHx8IGN1cnJlbnRNb2R1bGU7XG5cdFx0fVxuXG5cdFx0c2V0Q3VycmVudE1vZHVsZSggbW9kdWxlICk7XG5cblx0XHRmdW5jdGlvbiBjcmVhdGVNb2R1bGUoKSB7XG5cdFx0XHR2YXIgcGFyZW50TW9kdWxlID0gY29uZmlnLm1vZHVsZVN0YWNrLmxlbmd0aCA/XG5cdFx0XHRcdGNvbmZpZy5tb2R1bGVTdGFjay5zbGljZSggLTEgKVsgMCBdIDogbnVsbDtcblx0XHRcdHZhciBtb2R1bGVOYW1lID0gcGFyZW50TW9kdWxlICE9PSBudWxsID9cblx0XHRcdFx0WyBwYXJlbnRNb2R1bGUubmFtZSwgbmFtZSBdLmpvaW4oIFwiID4gXCIgKSA6IG5hbWU7XG5cdFx0XHR2YXIgbW9kdWxlID0ge1xuXHRcdFx0XHRuYW1lOiBtb2R1bGVOYW1lLFxuXHRcdFx0XHRwYXJlbnRNb2R1bGU6IHBhcmVudE1vZHVsZSxcblx0XHRcdFx0dGVzdHM6IFtdLFxuXHRcdFx0XHRtb2R1bGVJZDogZ2VuZXJhdGVIYXNoKCBtb2R1bGVOYW1lIClcblx0XHRcdH07XG5cblx0XHRcdHZhciBlbnYgPSB7fTtcblx0XHRcdGlmICggcGFyZW50TW9kdWxlICkge1xuXHRcdFx0XHRleHRlbmQoIGVudiwgcGFyZW50TW9kdWxlLnRlc3RFbnZpcm9ubWVudCApO1xuXHRcdFx0XHRkZWxldGUgZW52LmJlZm9yZUVhY2g7XG5cdFx0XHRcdGRlbGV0ZSBlbnYuYWZ0ZXJFYWNoO1xuXHRcdFx0fVxuXHRcdFx0ZXh0ZW5kKCBlbnYsIHRlc3RFbnZpcm9ubWVudCApO1xuXHRcdFx0bW9kdWxlLnRlc3RFbnZpcm9ubWVudCA9IGVudjtcblxuXHRcdFx0Y29uZmlnLm1vZHVsZXMucHVzaCggbW9kdWxlICk7XG5cdFx0XHRyZXR1cm4gbW9kdWxlO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHNldEN1cnJlbnRNb2R1bGUoIG1vZHVsZSApIHtcblx0XHRcdGNvbmZpZy5jdXJyZW50TW9kdWxlID0gbW9kdWxlO1xuXHRcdH1cblxuXHR9LFxuXG5cdC8vIERFUFJFQ0FURUQ6IFFVbml0LmFzeW5jVGVzdCgpIHdpbGwgYmUgcmVtb3ZlZCBpbiBRVW5pdCAyLjAuXG5cdGFzeW5jVGVzdDogYXN5bmNUZXN0LFxuXG5cdHRlc3Q6IHRlc3QsXG5cblx0c2tpcDogc2tpcCxcblxuXHRvbmx5OiBvbmx5LFxuXG5cdC8vIERFUFJFQ0FURUQ6IFRoZSBmdW5jdGlvbmFsaXR5IG9mIFFVbml0LnN0YXJ0KCkgd2lsbCBiZSBhbHRlcmVkIGluIFFVbml0IDIuMC5cblx0Ly8gSW4gUVVuaXQgMi4wLCBpbnZva2luZyBpdCB3aWxsIE9OTFkgYWZmZWN0IHRoZSBgUVVuaXQuY29uZmlnLmF1dG9zdGFydGAgYmxvY2tpbmcgYmVoYXZpb3IuXG5cdHN0YXJ0OiBmdW5jdGlvbiggY291bnQgKSB7XG5cdFx0dmFyIGdsb2JhbFN0YXJ0QWxyZWFkeUNhbGxlZCA9IGdsb2JhbFN0YXJ0Q2FsbGVkO1xuXG5cdFx0aWYgKCAhY29uZmlnLmN1cnJlbnQgKSB7XG5cdFx0XHRnbG9iYWxTdGFydENhbGxlZCA9IHRydWU7XG5cblx0XHRcdGlmICggcnVuU3RhcnRlZCApIHtcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKCBcIkNhbGxlZCBzdGFydCgpIG91dHNpZGUgb2YgYSB0ZXN0IGNvbnRleHQgd2hpbGUgYWxyZWFkeSBzdGFydGVkXCIgKTtcblx0XHRcdH0gZWxzZSBpZiAoIGdsb2JhbFN0YXJ0QWxyZWFkeUNhbGxlZCB8fCBjb3VudCA+IDEgKSB7XG5cdFx0XHRcdHRocm93IG5ldyBFcnJvciggXCJDYWxsZWQgc3RhcnQoKSBvdXRzaWRlIG9mIGEgdGVzdCBjb250ZXh0IHRvbyBtYW55IHRpbWVzXCIgKTtcblx0XHRcdH0gZWxzZSBpZiAoIGNvbmZpZy5hdXRvc3RhcnQgKSB7XG5cdFx0XHRcdHRocm93IG5ldyBFcnJvciggXCJDYWxsZWQgc3RhcnQoKSBvdXRzaWRlIG9mIGEgdGVzdCBjb250ZXh0IHdoZW4gXCIgK1xuXHRcdFx0XHRcdFwiUVVuaXQuY29uZmlnLmF1dG9zdGFydCB3YXMgdHJ1ZVwiICk7XG5cdFx0XHR9IGVsc2UgaWYgKCAhY29uZmlnLnBhZ2VMb2FkZWQgKSB7XG5cblx0XHRcdFx0Ly8gVGhlIHBhZ2UgaXNuJ3QgY29tcGxldGVseSBsb2FkZWQgeWV0LCBzbyBiYWlsIG91dCBhbmQgbGV0IGBRVW5pdC5sb2FkYCBoYW5kbGUgaXRcblx0XHRcdFx0Y29uZmlnLmF1dG9zdGFydCA9IHRydWU7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHR9IGVsc2Uge1xuXG5cdFx0XHQvLyBJZiBhIHRlc3QgaXMgcnVubmluZywgYWRqdXN0IGl0cyBzZW1hcGhvcmVcblx0XHRcdGNvbmZpZy5jdXJyZW50LnNlbWFwaG9yZSAtPSBjb3VudCB8fCAxO1xuXG5cdFx0XHQvLyBJZiBzZW1hcGhvcmUgaXMgbm9uLW51bWVyaWMsIHRocm93IGVycm9yXG5cdFx0XHRpZiAoIGlzTmFOKCBjb25maWcuY3VycmVudC5zZW1hcGhvcmUgKSApIHtcblx0XHRcdFx0Y29uZmlnLmN1cnJlbnQuc2VtYXBob3JlID0gMDtcblxuXHRcdFx0XHRRVW5pdC5wdXNoRmFpbHVyZShcblx0XHRcdFx0XHRcIkNhbGxlZCBzdGFydCgpIHdpdGggYSBub24tbnVtZXJpYyBkZWNyZW1lbnQuXCIsXG5cdFx0XHRcdFx0c291cmNlRnJvbVN0YWNrdHJhY2UoIDIgKVxuXHRcdFx0XHQpO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdC8vIERvbid0IHN0YXJ0IHVudGlsIGVxdWFsIG51bWJlciBvZiBzdG9wLWNhbGxzXG5cdFx0XHRpZiAoIGNvbmZpZy5jdXJyZW50LnNlbWFwaG9yZSA+IDAgKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0Ly8gVGhyb3cgYW4gRXJyb3IgaWYgc3RhcnQgaXMgY2FsbGVkIG1vcmUgb2Z0ZW4gdGhhbiBzdG9wXG5cdFx0XHRpZiAoIGNvbmZpZy5jdXJyZW50LnNlbWFwaG9yZSA8IDAgKSB7XG5cdFx0XHRcdGNvbmZpZy5jdXJyZW50LnNlbWFwaG9yZSA9IDA7XG5cblx0XHRcdFx0UVVuaXQucHVzaEZhaWx1cmUoXG5cdFx0XHRcdFx0XCJDYWxsZWQgc3RhcnQoKSB3aGlsZSBhbHJlYWR5IHN0YXJ0ZWQgKHRlc3QncyBzZW1hcGhvcmUgd2FzIDAgYWxyZWFkeSlcIixcblx0XHRcdFx0XHRzb3VyY2VGcm9tU3RhY2t0cmFjZSggMiApXG5cdFx0XHRcdCk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXN1bWVQcm9jZXNzaW5nKCk7XG5cdH0sXG5cblx0Ly8gREVQUkVDQVRFRDogUVVuaXQuc3RvcCgpIHdpbGwgYmUgcmVtb3ZlZCBpbiBRVW5pdCAyLjAuXG5cdHN0b3A6IGZ1bmN0aW9uKCBjb3VudCApIHtcblxuXHRcdC8vIElmIHRoZXJlIGlzbid0IGEgdGVzdCBydW5uaW5nLCBkb24ndCBhbGxvdyBRVW5pdC5zdG9wKCkgdG8gYmUgY2FsbGVkXG5cdFx0aWYgKCAhY29uZmlnLmN1cnJlbnQgKSB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoIFwiQ2FsbGVkIHN0b3AoKSBvdXRzaWRlIG9mIGEgdGVzdCBjb250ZXh0XCIgKTtcblx0XHR9XG5cblx0XHQvLyBJZiBhIHRlc3QgaXMgcnVubmluZywgYWRqdXN0IGl0cyBzZW1hcGhvcmVcblx0XHRjb25maWcuY3VycmVudC5zZW1hcGhvcmUgKz0gY291bnQgfHwgMTtcblxuXHRcdHBhdXNlUHJvY2Vzc2luZygpO1xuXHR9LFxuXG5cdGNvbmZpZzogY29uZmlnLFxuXG5cdGlzOiBpcyxcblxuXHRvYmplY3RUeXBlOiBvYmplY3RUeXBlLFxuXG5cdGV4dGVuZDogZXh0ZW5kLFxuXG5cdGxvYWQ6IGZ1bmN0aW9uKCkge1xuXHRcdGNvbmZpZy5wYWdlTG9hZGVkID0gdHJ1ZTtcblxuXHRcdC8vIEluaXRpYWxpemUgdGhlIGNvbmZpZ3VyYXRpb24gb3B0aW9uc1xuXHRcdGV4dGVuZCggY29uZmlnLCB7XG5cdFx0XHRzdGF0czogeyBhbGw6IDAsIGJhZDogMCB9LFxuXHRcdFx0bW9kdWxlU3RhdHM6IHsgYWxsOiAwLCBiYWQ6IDAgfSxcblx0XHRcdHN0YXJ0ZWQ6IDAsXG5cdFx0XHR1cGRhdGVSYXRlOiAxMDAwLFxuXHRcdFx0YXV0b3N0YXJ0OiB0cnVlLFxuXHRcdFx0ZmlsdGVyOiBcIlwiXG5cdFx0fSwgdHJ1ZSApO1xuXG5cdFx0Y29uZmlnLmJsb2NraW5nID0gZmFsc2U7XG5cblx0XHRpZiAoIGNvbmZpZy5hdXRvc3RhcnQgKSB7XG5cdFx0XHRyZXN1bWVQcm9jZXNzaW5nKCk7XG5cdFx0fVxuXHR9LFxuXG5cdHN0YWNrOiBmdW5jdGlvbiggb2Zmc2V0ICkge1xuXHRcdG9mZnNldCA9ICggb2Zmc2V0IHx8IDAgKSArIDI7XG5cdFx0cmV0dXJuIHNvdXJjZUZyb21TdGFja3RyYWNlKCBvZmZzZXQgKTtcblx0fVxufSApO1xuXG5yZWdpc3RlckxvZ2dpbmdDYWxsYmFja3MoIFFVbml0ICk7XG5cbmZ1bmN0aW9uIGJlZ2luKCkge1xuXHR2YXIgaSwgbCxcblx0XHRtb2R1bGVzTG9nID0gW107XG5cblx0Ly8gSWYgdGhlIHRlc3QgcnVuIGhhc24ndCBvZmZpY2lhbGx5IGJlZ3VuIHlldFxuXHRpZiAoICFjb25maWcuc3RhcnRlZCApIHtcblxuXHRcdC8vIFJlY29yZCB0aGUgdGltZSBvZiB0aGUgdGVzdCBydW4ncyBiZWdpbm5pbmdcblx0XHRjb25maWcuc3RhcnRlZCA9IG5vdygpO1xuXG5cdFx0dmVyaWZ5TG9nZ2luZ0NhbGxiYWNrcygpO1xuXG5cdFx0Ly8gRGVsZXRlIHRoZSBsb29zZSB1bm5hbWVkIG1vZHVsZSBpZiB1bnVzZWQuXG5cdFx0aWYgKCBjb25maWcubW9kdWxlc1sgMCBdLm5hbWUgPT09IFwiXCIgJiYgY29uZmlnLm1vZHVsZXNbIDAgXS50ZXN0cy5sZW5ndGggPT09IDAgKSB7XG5cdFx0XHRjb25maWcubW9kdWxlcy5zaGlmdCgpO1xuXHRcdH1cblxuXHRcdC8vIEF2b2lkIHVubmVjZXNzYXJ5IGluZm9ybWF0aW9uIGJ5IG5vdCBsb2dnaW5nIG1vZHVsZXMnIHRlc3QgZW52aXJvbm1lbnRzXG5cdFx0Zm9yICggaSA9IDAsIGwgPSBjb25maWcubW9kdWxlcy5sZW5ndGg7IGkgPCBsOyBpKysgKSB7XG5cdFx0XHRtb2R1bGVzTG9nLnB1c2goIHtcblx0XHRcdFx0bmFtZTogY29uZmlnLm1vZHVsZXNbIGkgXS5uYW1lLFxuXHRcdFx0XHR0ZXN0czogY29uZmlnLm1vZHVsZXNbIGkgXS50ZXN0c1xuXHRcdFx0fSApO1xuXHRcdH1cblxuXHRcdC8vIFRoZSB0ZXN0IHJ1biBpcyBvZmZpY2lhbGx5IGJlZ2lubmluZyBub3dcblx0XHRydW5Mb2dnaW5nQ2FsbGJhY2tzKCBcImJlZ2luXCIsIHtcblx0XHRcdHRvdGFsVGVzdHM6IFRlc3QuY291bnQsXG5cdFx0XHRtb2R1bGVzOiBtb2R1bGVzTG9nXG5cdFx0fSApO1xuXHR9XG5cblx0Y29uZmlnLmJsb2NraW5nID0gZmFsc2U7XG5cdHByb2Nlc3MoIHRydWUgKTtcbn1cblxuZnVuY3Rpb24gcHJvY2VzcyggbGFzdCApIHtcblx0ZnVuY3Rpb24gbmV4dCgpIHtcblx0XHRwcm9jZXNzKCBsYXN0ICk7XG5cdH1cblx0dmFyIHN0YXJ0ID0gbm93KCk7XG5cdGNvbmZpZy5kZXB0aCA9ICggY29uZmlnLmRlcHRoIHx8IDAgKSArIDE7XG5cblx0d2hpbGUgKCBjb25maWcucXVldWUubGVuZ3RoICYmICFjb25maWcuYmxvY2tpbmcgKSB7XG5cdFx0aWYgKCAhZGVmaW5lZC5zZXRUaW1lb3V0IHx8IGNvbmZpZy51cGRhdGVSYXRlIDw9IDAgfHxcblx0XHRcdFx0KCAoIG5vdygpIC0gc3RhcnQgKSA8IGNvbmZpZy51cGRhdGVSYXRlICkgKSB7XG5cdFx0XHRpZiAoIGNvbmZpZy5jdXJyZW50ICkge1xuXG5cdFx0XHRcdC8vIFJlc2V0IGFzeW5jIHRyYWNraW5nIGZvciBlYWNoIHBoYXNlIG9mIHRoZSBUZXN0IGxpZmVjeWNsZVxuXHRcdFx0XHRjb25maWcuY3VycmVudC51c2VkQXN5bmMgPSBmYWxzZTtcblx0XHRcdH1cblx0XHRcdGNvbmZpZy5xdWV1ZS5zaGlmdCgpKCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHNldFRpbWVvdXQoIG5leHQsIDEzICk7XG5cdFx0XHRicmVhaztcblx0XHR9XG5cdH1cblx0Y29uZmlnLmRlcHRoLS07XG5cdGlmICggbGFzdCAmJiAhY29uZmlnLmJsb2NraW5nICYmICFjb25maWcucXVldWUubGVuZ3RoICYmIGNvbmZpZy5kZXB0aCA9PT0gMCApIHtcblx0XHRkb25lKCk7XG5cdH1cbn1cblxuZnVuY3Rpb24gcGF1c2VQcm9jZXNzaW5nKCkge1xuXHRjb25maWcuYmxvY2tpbmcgPSB0cnVlO1xuXG5cdGlmICggY29uZmlnLnRlc3RUaW1lb3V0ICYmIGRlZmluZWQuc2V0VGltZW91dCApIHtcblx0XHRjbGVhclRpbWVvdXQoIGNvbmZpZy50aW1lb3V0ICk7XG5cdFx0Y29uZmlnLnRpbWVvdXQgPSBzZXRUaW1lb3V0KCBmdW5jdGlvbigpIHtcblx0XHRcdGlmICggY29uZmlnLmN1cnJlbnQgKSB7XG5cdFx0XHRcdGNvbmZpZy5jdXJyZW50LnNlbWFwaG9yZSA9IDA7XG5cdFx0XHRcdFFVbml0LnB1c2hGYWlsdXJlKCBcIlRlc3QgdGltZWQgb3V0XCIsIHNvdXJjZUZyb21TdGFja3RyYWNlKCAyICkgKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHRocm93IG5ldyBFcnJvciggXCJUZXN0IHRpbWVkIG91dFwiICk7XG5cdFx0XHR9XG5cdFx0XHRyZXN1bWVQcm9jZXNzaW5nKCk7XG5cdFx0fSwgY29uZmlnLnRlc3RUaW1lb3V0ICk7XG5cdH1cbn1cblxuZnVuY3Rpb24gcmVzdW1lUHJvY2Vzc2luZygpIHtcblx0cnVuU3RhcnRlZCA9IHRydWU7XG5cblx0Ly8gQSBzbGlnaHQgZGVsYXkgdG8gYWxsb3cgdGhpcyBpdGVyYXRpb24gb2YgdGhlIGV2ZW50IGxvb3AgdG8gZmluaXNoIChtb3JlIGFzc2VydGlvbnMsIGV0Yy4pXG5cdGlmICggZGVmaW5lZC5zZXRUaW1lb3V0ICkge1xuXHRcdHNldFRpbWVvdXQoIGZ1bmN0aW9uKCkge1xuXHRcdFx0aWYgKCBjb25maWcuY3VycmVudCAmJiBjb25maWcuY3VycmVudC5zZW1hcGhvcmUgPiAwICkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0XHRpZiAoIGNvbmZpZy50aW1lb3V0ICkge1xuXHRcdFx0XHRjbGVhclRpbWVvdXQoIGNvbmZpZy50aW1lb3V0ICk7XG5cdFx0XHR9XG5cblx0XHRcdGJlZ2luKCk7XG5cdFx0fSwgMTMgKTtcblx0fSBlbHNlIHtcblx0XHRiZWdpbigpO1xuXHR9XG59XG5cbmZ1bmN0aW9uIGRvbmUoKSB7XG5cdHZhciBydW50aW1lLCBwYXNzZWQ7XG5cblx0Y29uZmlnLmF1dG9ydW4gPSB0cnVlO1xuXG5cdC8vIExvZyB0aGUgbGFzdCBtb2R1bGUgcmVzdWx0c1xuXHRpZiAoIGNvbmZpZy5wcmV2aW91c01vZHVsZSApIHtcblx0XHRydW5Mb2dnaW5nQ2FsbGJhY2tzKCBcIm1vZHVsZURvbmVcIiwge1xuXHRcdFx0bmFtZTogY29uZmlnLnByZXZpb3VzTW9kdWxlLm5hbWUsXG5cdFx0XHR0ZXN0czogY29uZmlnLnByZXZpb3VzTW9kdWxlLnRlc3RzLFxuXHRcdFx0ZmFpbGVkOiBjb25maWcubW9kdWxlU3RhdHMuYmFkLFxuXHRcdFx0cGFzc2VkOiBjb25maWcubW9kdWxlU3RhdHMuYWxsIC0gY29uZmlnLm1vZHVsZVN0YXRzLmJhZCxcblx0XHRcdHRvdGFsOiBjb25maWcubW9kdWxlU3RhdHMuYWxsLFxuXHRcdFx0cnVudGltZTogbm93KCkgLSBjb25maWcubW9kdWxlU3RhdHMuc3RhcnRlZFxuXHRcdH0gKTtcblx0fVxuXHRkZWxldGUgY29uZmlnLnByZXZpb3VzTW9kdWxlO1xuXG5cdHJ1bnRpbWUgPSBub3coKSAtIGNvbmZpZy5zdGFydGVkO1xuXHRwYXNzZWQgPSBjb25maWcuc3RhdHMuYWxsIC0gY29uZmlnLnN0YXRzLmJhZDtcblxuXHRydW5Mb2dnaW5nQ2FsbGJhY2tzKCBcImRvbmVcIiwge1xuXHRcdGZhaWxlZDogY29uZmlnLnN0YXRzLmJhZCxcblx0XHRwYXNzZWQ6IHBhc3NlZCxcblx0XHR0b3RhbDogY29uZmlnLnN0YXRzLmFsbCxcblx0XHRydW50aW1lOiBydW50aW1lXG5cdH0gKTtcbn1cblxuZnVuY3Rpb24gc2V0SG9vayggbW9kdWxlLCBob29rTmFtZSApIHtcblx0aWYgKCBtb2R1bGUudGVzdEVudmlyb25tZW50ID09PSB1bmRlZmluZWQgKSB7XG5cdFx0bW9kdWxlLnRlc3RFbnZpcm9ubWVudCA9IHt9O1xuXHR9XG5cblx0cmV0dXJuIGZ1bmN0aW9uKCBjYWxsYmFjayApIHtcblx0XHRtb2R1bGUudGVzdEVudmlyb25tZW50WyBob29rTmFtZSBdID0gY2FsbGJhY2s7XG5cdH07XG59XG5cbnZhciBmb2N1c2VkID0gZmFsc2U7XG52YXIgcHJpb3JpdHlDb3VudCA9IDA7XG52YXIgdW5pdFNhbXBsZXI7XG5cbmZ1bmN0aW9uIFRlc3QoIHNldHRpbmdzICkge1xuXHR2YXIgaSwgbDtcblxuXHQrK1Rlc3QuY291bnQ7XG5cblx0ZXh0ZW5kKCB0aGlzLCBzZXR0aW5ncyApO1xuXHR0aGlzLmFzc2VydGlvbnMgPSBbXTtcblx0dGhpcy5zZW1hcGhvcmUgPSAwO1xuXHR0aGlzLnVzZWRBc3luYyA9IGZhbHNlO1xuXHR0aGlzLm1vZHVsZSA9IGNvbmZpZy5jdXJyZW50TW9kdWxlO1xuXHR0aGlzLnN0YWNrID0gc291cmNlRnJvbVN0YWNrdHJhY2UoIDMgKTtcblxuXHQvLyBSZWdpc3RlciB1bmlxdWUgc3RyaW5nc1xuXHRmb3IgKCBpID0gMCwgbCA9IHRoaXMubW9kdWxlLnRlc3RzOyBpIDwgbC5sZW5ndGg7IGkrKyApIHtcblx0XHRpZiAoIHRoaXMubW9kdWxlLnRlc3RzWyBpIF0ubmFtZSA9PT0gdGhpcy50ZXN0TmFtZSApIHtcblx0XHRcdHRoaXMudGVzdE5hbWUgKz0gXCIgXCI7XG5cdFx0fVxuXHR9XG5cblx0dGhpcy50ZXN0SWQgPSBnZW5lcmF0ZUhhc2goIHRoaXMubW9kdWxlLm5hbWUsIHRoaXMudGVzdE5hbWUgKTtcblxuXHR0aGlzLm1vZHVsZS50ZXN0cy5wdXNoKCB7XG5cdFx0bmFtZTogdGhpcy50ZXN0TmFtZSxcblx0XHR0ZXN0SWQ6IHRoaXMudGVzdElkXG5cdH0gKTtcblxuXHRpZiAoIHNldHRpbmdzLnNraXAgKSB7XG5cblx0XHQvLyBTa2lwcGVkIHRlc3RzIHdpbGwgZnVsbHkgaWdub3JlIGFueSBzZW50IGNhbGxiYWNrXG5cdFx0dGhpcy5jYWxsYmFjayA9IGZ1bmN0aW9uKCkge307XG5cdFx0dGhpcy5hc3luYyA9IGZhbHNlO1xuXHRcdHRoaXMuZXhwZWN0ZWQgPSAwO1xuXHR9IGVsc2Uge1xuXHRcdHRoaXMuYXNzZXJ0ID0gbmV3IEFzc2VydCggdGhpcyApO1xuXHR9XG59XG5cblRlc3QuY291bnQgPSAwO1xuXG5UZXN0LnByb3RvdHlwZSA9IHtcblx0YmVmb3JlOiBmdW5jdGlvbigpIHtcblx0XHRpZiAoXG5cblx0XHRcdC8vIEVtaXQgbW9kdWxlU3RhcnQgd2hlbiB3ZSdyZSBzd2l0Y2hpbmcgZnJvbSBvbmUgbW9kdWxlIHRvIGFub3RoZXJcblx0XHRcdHRoaXMubW9kdWxlICE9PSBjb25maWcucHJldmlvdXNNb2R1bGUgfHxcblxuXHRcdFx0XHQvLyBUaGV5IGNvdWxkIGJlIGVxdWFsIChib3RoIHVuZGVmaW5lZCkgYnV0IGlmIHRoZSBwcmV2aW91c01vZHVsZSBwcm9wZXJ0eSBkb2Vzbid0XG5cdFx0XHRcdC8vIHlldCBleGlzdCBpdCBtZWFucyB0aGlzIGlzIHRoZSBmaXJzdCB0ZXN0IGluIGEgc3VpdGUgdGhhdCBpc24ndCB3cmFwcGVkIGluIGFcblx0XHRcdFx0Ly8gbW9kdWxlLCBpbiB3aGljaCBjYXNlIHdlJ2xsIGp1c3QgZW1pdCBhIG1vZHVsZVN0YXJ0IGV2ZW50IGZvciAndW5kZWZpbmVkJy5cblx0XHRcdFx0Ly8gV2l0aG91dCB0aGlzLCByZXBvcnRlcnMgY2FuIGdldCB0ZXN0U3RhcnQgYmVmb3JlIG1vZHVsZVN0YXJ0ICB3aGljaCBpcyBhIHByb2JsZW0uXG5cdFx0XHRcdCFoYXNPd24uY2FsbCggY29uZmlnLCBcInByZXZpb3VzTW9kdWxlXCIgKVxuXHRcdCkge1xuXHRcdFx0aWYgKCBoYXNPd24uY2FsbCggY29uZmlnLCBcInByZXZpb3VzTW9kdWxlXCIgKSApIHtcblx0XHRcdFx0cnVuTG9nZ2luZ0NhbGxiYWNrcyggXCJtb2R1bGVEb25lXCIsIHtcblx0XHRcdFx0XHRuYW1lOiBjb25maWcucHJldmlvdXNNb2R1bGUubmFtZSxcblx0XHRcdFx0XHR0ZXN0czogY29uZmlnLnByZXZpb3VzTW9kdWxlLnRlc3RzLFxuXHRcdFx0XHRcdGZhaWxlZDogY29uZmlnLm1vZHVsZVN0YXRzLmJhZCxcblx0XHRcdFx0XHRwYXNzZWQ6IGNvbmZpZy5tb2R1bGVTdGF0cy5hbGwgLSBjb25maWcubW9kdWxlU3RhdHMuYmFkLFxuXHRcdFx0XHRcdHRvdGFsOiBjb25maWcubW9kdWxlU3RhdHMuYWxsLFxuXHRcdFx0XHRcdHJ1bnRpbWU6IG5vdygpIC0gY29uZmlnLm1vZHVsZVN0YXRzLnN0YXJ0ZWRcblx0XHRcdFx0fSApO1xuXHRcdFx0fVxuXHRcdFx0Y29uZmlnLnByZXZpb3VzTW9kdWxlID0gdGhpcy5tb2R1bGU7XG5cdFx0XHRjb25maWcubW9kdWxlU3RhdHMgPSB7IGFsbDogMCwgYmFkOiAwLCBzdGFydGVkOiBub3coKSB9O1xuXHRcdFx0cnVuTG9nZ2luZ0NhbGxiYWNrcyggXCJtb2R1bGVTdGFydFwiLCB7XG5cdFx0XHRcdG5hbWU6IHRoaXMubW9kdWxlLm5hbWUsXG5cdFx0XHRcdHRlc3RzOiB0aGlzLm1vZHVsZS50ZXN0c1xuXHRcdFx0fSApO1xuXHRcdH1cblxuXHRcdGNvbmZpZy5jdXJyZW50ID0gdGhpcztcblxuXHRcdGlmICggdGhpcy5tb2R1bGUudGVzdEVudmlyb25tZW50ICkge1xuXHRcdFx0ZGVsZXRlIHRoaXMubW9kdWxlLnRlc3RFbnZpcm9ubWVudC5iZWZvcmVFYWNoO1xuXHRcdFx0ZGVsZXRlIHRoaXMubW9kdWxlLnRlc3RFbnZpcm9ubWVudC5hZnRlckVhY2g7XG5cdFx0fVxuXHRcdHRoaXMudGVzdEVudmlyb25tZW50ID0gZXh0ZW5kKCB7fSwgdGhpcy5tb2R1bGUudGVzdEVudmlyb25tZW50ICk7XG5cblx0XHR0aGlzLnN0YXJ0ZWQgPSBub3coKTtcblx0XHRydW5Mb2dnaW5nQ2FsbGJhY2tzKCBcInRlc3RTdGFydFwiLCB7XG5cdFx0XHRuYW1lOiB0aGlzLnRlc3ROYW1lLFxuXHRcdFx0bW9kdWxlOiB0aGlzLm1vZHVsZS5uYW1lLFxuXHRcdFx0dGVzdElkOiB0aGlzLnRlc3RJZFxuXHRcdH0gKTtcblxuXHRcdGlmICggIWNvbmZpZy5wb2xsdXRpb24gKSB7XG5cdFx0XHRzYXZlR2xvYmFsKCk7XG5cdFx0fVxuXHR9LFxuXG5cdHJ1bjogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHByb21pc2U7XG5cblx0XHRjb25maWcuY3VycmVudCA9IHRoaXM7XG5cblx0XHRpZiAoIHRoaXMuYXN5bmMgKSB7XG5cdFx0XHRRVW5pdC5zdG9wKCk7XG5cdFx0fVxuXG5cdFx0dGhpcy5jYWxsYmFja1N0YXJ0ZWQgPSBub3coKTtcblxuXHRcdGlmICggY29uZmlnLm5vdHJ5Y2F0Y2ggKSB7XG5cdFx0XHRydW5UZXN0KCB0aGlzICk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0dHJ5IHtcblx0XHRcdHJ1blRlc3QoIHRoaXMgKTtcblx0XHR9IGNhdGNoICggZSApIHtcblx0XHRcdHRoaXMucHVzaEZhaWx1cmUoIFwiRGllZCBvbiB0ZXN0ICNcIiArICggdGhpcy5hc3NlcnRpb25zLmxlbmd0aCArIDEgKSArIFwiIFwiICtcblx0XHRcdFx0dGhpcy5zdGFjayArIFwiOiBcIiArICggZS5tZXNzYWdlIHx8IGUgKSwgZXh0cmFjdFN0YWNrdHJhY2UoIGUsIDAgKSApO1xuXG5cdFx0XHQvLyBFbHNlIG5leHQgdGVzdCB3aWxsIGNhcnJ5IHRoZSByZXNwb25zaWJpbGl0eVxuXHRcdFx0c2F2ZUdsb2JhbCgpO1xuXG5cdFx0XHQvLyBSZXN0YXJ0IHRoZSB0ZXN0cyBpZiB0aGV5J3JlIGJsb2NraW5nXG5cdFx0XHRpZiAoIGNvbmZpZy5ibG9ja2luZyApIHtcblx0XHRcdFx0UVVuaXQuc3RhcnQoKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRmdW5jdGlvbiBydW5UZXN0KCB0ZXN0ICkge1xuXHRcdFx0cHJvbWlzZSA9IHRlc3QuY2FsbGJhY2suY2FsbCggdGVzdC50ZXN0RW52aXJvbm1lbnQsIHRlc3QuYXNzZXJ0ICk7XG5cdFx0XHR0ZXN0LnJlc29sdmVQcm9taXNlKCBwcm9taXNlICk7XG5cdFx0fVxuXHR9LFxuXG5cdGFmdGVyOiBmdW5jdGlvbigpIHtcblx0XHRjaGVja1BvbGx1dGlvbigpO1xuXHR9LFxuXG5cdHF1ZXVlSG9vazogZnVuY3Rpb24oIGhvb2ssIGhvb2tOYW1lICkge1xuXHRcdHZhciBwcm9taXNlLFxuXHRcdFx0dGVzdCA9IHRoaXM7XG5cdFx0cmV0dXJuIGZ1bmN0aW9uIHJ1bkhvb2soKSB7XG5cdFx0XHRjb25maWcuY3VycmVudCA9IHRlc3Q7XG5cdFx0XHRpZiAoIGNvbmZpZy5ub3RyeWNhdGNoICkge1xuXHRcdFx0XHRjYWxsSG9vaygpO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0XHR0cnkge1xuXHRcdFx0XHRjYWxsSG9vaygpO1xuXHRcdFx0fSBjYXRjaCAoIGVycm9yICkge1xuXHRcdFx0XHR0ZXN0LnB1c2hGYWlsdXJlKCBob29rTmFtZSArIFwiIGZhaWxlZCBvbiBcIiArIHRlc3QudGVzdE5hbWUgKyBcIjogXCIgK1xuXHRcdFx0XHQoIGVycm9yLm1lc3NhZ2UgfHwgZXJyb3IgKSwgZXh0cmFjdFN0YWNrdHJhY2UoIGVycm9yLCAwICkgKTtcblx0XHRcdH1cblxuXHRcdFx0ZnVuY3Rpb24gY2FsbEhvb2soKSB7XG5cdFx0XHRcdHByb21pc2UgPSBob29rLmNhbGwoIHRlc3QudGVzdEVudmlyb25tZW50LCB0ZXN0LmFzc2VydCApO1xuXHRcdFx0XHR0ZXN0LnJlc29sdmVQcm9taXNlKCBwcm9taXNlLCBob29rTmFtZSApO1xuXHRcdFx0fVxuXHRcdH07XG5cdH0sXG5cblx0Ly8gQ3VycmVudGx5IG9ubHkgdXNlZCBmb3IgbW9kdWxlIGxldmVsIGhvb2tzLCBjYW4gYmUgdXNlZCB0byBhZGQgZ2xvYmFsIGxldmVsIG9uZXNcblx0aG9va3M6IGZ1bmN0aW9uKCBoYW5kbGVyICkge1xuXHRcdHZhciBob29rcyA9IFtdO1xuXG5cdFx0ZnVuY3Rpb24gcHJvY2Vzc0hvb2tzKCB0ZXN0LCBtb2R1bGUgKSB7XG5cdFx0XHRpZiAoIG1vZHVsZS5wYXJlbnRNb2R1bGUgKSB7XG5cdFx0XHRcdHByb2Nlc3NIb29rcyggdGVzdCwgbW9kdWxlLnBhcmVudE1vZHVsZSApO1xuXHRcdFx0fVxuXHRcdFx0aWYgKCBtb2R1bGUudGVzdEVudmlyb25tZW50ICYmXG5cdFx0XHRcdFFVbml0Lm9iamVjdFR5cGUoIG1vZHVsZS50ZXN0RW52aXJvbm1lbnRbIGhhbmRsZXIgXSApID09PSBcImZ1bmN0aW9uXCIgKSB7XG5cdFx0XHRcdGhvb2tzLnB1c2goIHRlc3QucXVldWVIb29rKCBtb2R1bGUudGVzdEVudmlyb25tZW50WyBoYW5kbGVyIF0sIGhhbmRsZXIgKSApO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIEhvb2tzIGFyZSBpZ25vcmVkIG9uIHNraXBwZWQgdGVzdHNcblx0XHRpZiAoICF0aGlzLnNraXAgKSB7XG5cdFx0XHRwcm9jZXNzSG9va3MoIHRoaXMsIHRoaXMubW9kdWxlICk7XG5cdFx0fVxuXHRcdHJldHVybiBob29rcztcblx0fSxcblxuXHRmaW5pc2g6IGZ1bmN0aW9uKCkge1xuXHRcdGNvbmZpZy5jdXJyZW50ID0gdGhpcztcblx0XHRpZiAoIGNvbmZpZy5yZXF1aXJlRXhwZWN0cyAmJiB0aGlzLmV4cGVjdGVkID09PSBudWxsICkge1xuXHRcdFx0dGhpcy5wdXNoRmFpbHVyZSggXCJFeHBlY3RlZCBudW1iZXIgb2YgYXNzZXJ0aW9ucyB0byBiZSBkZWZpbmVkLCBidXQgZXhwZWN0KCkgd2FzIFwiICtcblx0XHRcdFx0XCJub3QgY2FsbGVkLlwiLCB0aGlzLnN0YWNrICk7XG5cdFx0fSBlbHNlIGlmICggdGhpcy5leHBlY3RlZCAhPT0gbnVsbCAmJiB0aGlzLmV4cGVjdGVkICE9PSB0aGlzLmFzc2VydGlvbnMubGVuZ3RoICkge1xuXHRcdFx0dGhpcy5wdXNoRmFpbHVyZSggXCJFeHBlY3RlZCBcIiArIHRoaXMuZXhwZWN0ZWQgKyBcIiBhc3NlcnRpb25zLCBidXQgXCIgK1xuXHRcdFx0XHR0aGlzLmFzc2VydGlvbnMubGVuZ3RoICsgXCIgd2VyZSBydW5cIiwgdGhpcy5zdGFjayApO1xuXHRcdH0gZWxzZSBpZiAoIHRoaXMuZXhwZWN0ZWQgPT09IG51bGwgJiYgIXRoaXMuYXNzZXJ0aW9ucy5sZW5ndGggKSB7XG5cdFx0XHR0aGlzLnB1c2hGYWlsdXJlKCBcIkV4cGVjdGVkIGF0IGxlYXN0IG9uZSBhc3NlcnRpb24sIGJ1dCBub25lIHdlcmUgcnVuIC0gY2FsbCBcIiArXG5cdFx0XHRcdFwiZXhwZWN0KDApIHRvIGFjY2VwdCB6ZXJvIGFzc2VydGlvbnMuXCIsIHRoaXMuc3RhY2sgKTtcblx0XHR9XG5cblx0XHR2YXIgaSxcblx0XHRcdGJhZCA9IDA7XG5cblx0XHR0aGlzLnJ1bnRpbWUgPSBub3coKSAtIHRoaXMuc3RhcnRlZDtcblx0XHRjb25maWcuc3RhdHMuYWxsICs9IHRoaXMuYXNzZXJ0aW9ucy5sZW5ndGg7XG5cdFx0Y29uZmlnLm1vZHVsZVN0YXRzLmFsbCArPSB0aGlzLmFzc2VydGlvbnMubGVuZ3RoO1xuXG5cdFx0Zm9yICggaSA9IDA7IGkgPCB0aGlzLmFzc2VydGlvbnMubGVuZ3RoOyBpKysgKSB7XG5cdFx0XHRpZiAoICF0aGlzLmFzc2VydGlvbnNbIGkgXS5yZXN1bHQgKSB7XG5cdFx0XHRcdGJhZCsrO1xuXHRcdFx0XHRjb25maWcuc3RhdHMuYmFkKys7XG5cdFx0XHRcdGNvbmZpZy5tb2R1bGVTdGF0cy5iYWQrKztcblx0XHRcdH1cblx0XHR9XG5cblx0XHRydW5Mb2dnaW5nQ2FsbGJhY2tzKCBcInRlc3REb25lXCIsIHtcblx0XHRcdG5hbWU6IHRoaXMudGVzdE5hbWUsXG5cdFx0XHRtb2R1bGU6IHRoaXMubW9kdWxlLm5hbWUsXG5cdFx0XHRza2lwcGVkOiAhIXRoaXMuc2tpcCxcblx0XHRcdGZhaWxlZDogYmFkLFxuXHRcdFx0cGFzc2VkOiB0aGlzLmFzc2VydGlvbnMubGVuZ3RoIC0gYmFkLFxuXHRcdFx0dG90YWw6IHRoaXMuYXNzZXJ0aW9ucy5sZW5ndGgsXG5cdFx0XHRydW50aW1lOiB0aGlzLnJ1bnRpbWUsXG5cblx0XHRcdC8vIEhUTUwgUmVwb3J0ZXIgdXNlXG5cdFx0XHRhc3NlcnRpb25zOiB0aGlzLmFzc2VydGlvbnMsXG5cdFx0XHR0ZXN0SWQ6IHRoaXMudGVzdElkLFxuXG5cdFx0XHQvLyBTb3VyY2Ugb2YgVGVzdFxuXHRcdFx0c291cmNlOiB0aGlzLnN0YWNrLFxuXG5cdFx0XHQvLyBERVBSRUNBVEVEOiB0aGlzIHByb3BlcnR5IHdpbGwgYmUgcmVtb3ZlZCBpbiAyLjAuMCwgdXNlIHJ1bnRpbWUgaW5zdGVhZFxuXHRcdFx0ZHVyYXRpb246IHRoaXMucnVudGltZVxuXHRcdH0gKTtcblxuXHRcdC8vIFFVbml0LnJlc2V0KCkgaXMgZGVwcmVjYXRlZCBhbmQgd2lsbCBiZSByZXBsYWNlZCBmb3IgYSBuZXdcblx0XHQvLyBmaXh0dXJlIHJlc2V0IGZ1bmN0aW9uIG9uIFFVbml0IDIuMC8yLjEuXG5cdFx0Ly8gSXQncyBzdGlsbCBjYWxsZWQgaGVyZSBmb3IgYmFja3dhcmRzIGNvbXBhdGliaWxpdHkgaGFuZGxpbmdcblx0XHRRVW5pdC5yZXNldCgpO1xuXG5cdFx0Y29uZmlnLmN1cnJlbnQgPSB1bmRlZmluZWQ7XG5cdH0sXG5cblx0cXVldWU6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBwcmlvcml0eSxcblx0XHRcdHRlc3QgPSB0aGlzO1xuXG5cdFx0aWYgKCAhdGhpcy52YWxpZCgpICkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHJ1bigpIHtcblxuXHRcdFx0Ly8gRWFjaCBvZiB0aGVzZSBjYW4gYnkgYXN5bmNcblx0XHRcdHN5bmNocm9uaXplKCBbXG5cdFx0XHRcdGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHRlc3QuYmVmb3JlKCk7XG5cdFx0XHRcdH0sXG5cblx0XHRcdFx0dGVzdC5ob29rcyggXCJiZWZvcmVFYWNoXCIgKSxcblx0XHRcdFx0ZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0dGVzdC5ydW4oKTtcblx0XHRcdFx0fSxcblxuXHRcdFx0XHR0ZXN0Lmhvb2tzKCBcImFmdGVyRWFjaFwiICkucmV2ZXJzZSgpLFxuXG5cdFx0XHRcdGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHRlc3QuYWZ0ZXIoKTtcblx0XHRcdFx0fSxcblx0XHRcdFx0ZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0dGVzdC5maW5pc2goKTtcblx0XHRcdFx0fVxuXHRcdFx0XSApO1xuXHRcdH1cblxuXHRcdC8vIFByaW9yaXRpemUgcHJldmlvdXNseSBmYWlsZWQgdGVzdHMsIGRldGVjdGVkIGZyb20gc2Vzc2lvblN0b3JhZ2Vcblx0XHRwcmlvcml0eSA9IFFVbml0LmNvbmZpZy5yZW9yZGVyICYmIGRlZmluZWQuc2Vzc2lvblN0b3JhZ2UgJiZcblx0XHRcdFx0K3Nlc3Npb25TdG9yYWdlLmdldEl0ZW0oIFwicXVuaXQtdGVzdC1cIiArIHRoaXMubW9kdWxlLm5hbWUgKyBcIi1cIiArIHRoaXMudGVzdE5hbWUgKTtcblxuXHRcdHJldHVybiBzeW5jaHJvbml6ZSggcnVuLCBwcmlvcml0eSwgY29uZmlnLnNlZWQgKTtcblx0fSxcblxuXHRwdXNoUmVzdWx0OiBmdW5jdGlvbiggcmVzdWx0SW5mbyApIHtcblxuXHRcdC8vIERlc3RydWN0dXJlIG9mIHJlc3VsdEluZm8gPSB7IHJlc3VsdCwgYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSwgbmVnYXRpdmUgfVxuXHRcdHZhciBzb3VyY2UsXG5cdFx0XHRkZXRhaWxzID0ge1xuXHRcdFx0XHRtb2R1bGU6IHRoaXMubW9kdWxlLm5hbWUsXG5cdFx0XHRcdG5hbWU6IHRoaXMudGVzdE5hbWUsXG5cdFx0XHRcdHJlc3VsdDogcmVzdWx0SW5mby5yZXN1bHQsXG5cdFx0XHRcdG1lc3NhZ2U6IHJlc3VsdEluZm8ubWVzc2FnZSxcblx0XHRcdFx0YWN0dWFsOiByZXN1bHRJbmZvLmFjdHVhbCxcblx0XHRcdFx0ZXhwZWN0ZWQ6IHJlc3VsdEluZm8uZXhwZWN0ZWQsXG5cdFx0XHRcdHRlc3RJZDogdGhpcy50ZXN0SWQsXG5cdFx0XHRcdG5lZ2F0aXZlOiByZXN1bHRJbmZvLm5lZ2F0aXZlIHx8IGZhbHNlLFxuXHRcdFx0XHRydW50aW1lOiBub3coKSAtIHRoaXMuc3RhcnRlZFxuXHRcdFx0fTtcblxuXHRcdGlmICggIXJlc3VsdEluZm8ucmVzdWx0ICkge1xuXHRcdFx0c291cmNlID0gc291cmNlRnJvbVN0YWNrdHJhY2UoKTtcblxuXHRcdFx0aWYgKCBzb3VyY2UgKSB7XG5cdFx0XHRcdGRldGFpbHMuc291cmNlID0gc291cmNlO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJ1bkxvZ2dpbmdDYWxsYmFja3MoIFwibG9nXCIsIGRldGFpbHMgKTtcblxuXHRcdHRoaXMuYXNzZXJ0aW9ucy5wdXNoKCB7XG5cdFx0XHRyZXN1bHQ6ICEhcmVzdWx0SW5mby5yZXN1bHQsXG5cdFx0XHRtZXNzYWdlOiByZXN1bHRJbmZvLm1lc3NhZ2Vcblx0XHR9ICk7XG5cdH0sXG5cblx0cHVzaEZhaWx1cmU6IGZ1bmN0aW9uKCBtZXNzYWdlLCBzb3VyY2UsIGFjdHVhbCApIHtcblx0XHRpZiAoICEoIHRoaXMgaW5zdGFuY2VvZiBUZXN0ICkgKSB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoIFwicHVzaEZhaWx1cmUoKSBhc3NlcnRpb24gb3V0c2lkZSB0ZXN0IGNvbnRleHQsIHdhcyBcIiArXG5cdFx0XHRcdHNvdXJjZUZyb21TdGFja3RyYWNlKCAyICkgKTtcblx0XHR9XG5cblx0XHR2YXIgZGV0YWlscyA9IHtcblx0XHRcdFx0bW9kdWxlOiB0aGlzLm1vZHVsZS5uYW1lLFxuXHRcdFx0XHRuYW1lOiB0aGlzLnRlc3ROYW1lLFxuXHRcdFx0XHRyZXN1bHQ6IGZhbHNlLFxuXHRcdFx0XHRtZXNzYWdlOiBtZXNzYWdlIHx8IFwiZXJyb3JcIixcblx0XHRcdFx0YWN0dWFsOiBhY3R1YWwgfHwgbnVsbCxcblx0XHRcdFx0dGVzdElkOiB0aGlzLnRlc3RJZCxcblx0XHRcdFx0cnVudGltZTogbm93KCkgLSB0aGlzLnN0YXJ0ZWRcblx0XHRcdH07XG5cblx0XHRpZiAoIHNvdXJjZSApIHtcblx0XHRcdGRldGFpbHMuc291cmNlID0gc291cmNlO1xuXHRcdH1cblxuXHRcdHJ1bkxvZ2dpbmdDYWxsYmFja3MoIFwibG9nXCIsIGRldGFpbHMgKTtcblxuXHRcdHRoaXMuYXNzZXJ0aW9ucy5wdXNoKCB7XG5cdFx0XHRyZXN1bHQ6IGZhbHNlLFxuXHRcdFx0bWVzc2FnZTogbWVzc2FnZVxuXHRcdH0gKTtcblx0fSxcblxuXHRyZXNvbHZlUHJvbWlzZTogZnVuY3Rpb24oIHByb21pc2UsIHBoYXNlICkge1xuXHRcdHZhciB0aGVuLCBtZXNzYWdlLFxuXHRcdFx0dGVzdCA9IHRoaXM7XG5cdFx0aWYgKCBwcm9taXNlICE9IG51bGwgKSB7XG5cdFx0XHR0aGVuID0gcHJvbWlzZS50aGVuO1xuXHRcdFx0aWYgKCBRVW5pdC5vYmplY3RUeXBlKCB0aGVuICkgPT09IFwiZnVuY3Rpb25cIiApIHtcblx0XHRcdFx0UVVuaXQuc3RvcCgpO1xuXHRcdFx0XHR0aGVuLmNhbGwoXG5cdFx0XHRcdFx0cHJvbWlzZSxcblx0XHRcdFx0XHRmdW5jdGlvbigpIHsgUVVuaXQuc3RhcnQoKTsgfSxcblx0XHRcdFx0XHRmdW5jdGlvbiggZXJyb3IgKSB7XG5cdFx0XHRcdFx0XHRtZXNzYWdlID0gXCJQcm9taXNlIHJlamVjdGVkIFwiICtcblx0XHRcdFx0XHRcdFx0KCAhcGhhc2UgPyBcImR1cmluZ1wiIDogcGhhc2UucmVwbGFjZSggL0VhY2gkLywgXCJcIiApICkgK1xuXHRcdFx0XHRcdFx0XHRcIiBcIiArIHRlc3QudGVzdE5hbWUgKyBcIjogXCIgKyAoIGVycm9yLm1lc3NhZ2UgfHwgZXJyb3IgKTtcblx0XHRcdFx0XHRcdHRlc3QucHVzaEZhaWx1cmUoIG1lc3NhZ2UsIGV4dHJhY3RTdGFja3RyYWNlKCBlcnJvciwgMCApICk7XG5cblx0XHRcdFx0XHRcdC8vIEVsc2UgbmV4dCB0ZXN0IHdpbGwgY2FycnkgdGhlIHJlc3BvbnNpYmlsaXR5XG5cdFx0XHRcdFx0XHRzYXZlR2xvYmFsKCk7XG5cblx0XHRcdFx0XHRcdC8vIFVuYmxvY2tcblx0XHRcdFx0XHRcdFFVbml0LnN0YXJ0KCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHQpO1xuXHRcdFx0fVxuXHRcdH1cblx0fSxcblxuXHR2YWxpZDogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIGZpbHRlciA9IGNvbmZpZy5maWx0ZXIsXG5cdFx0XHRyZWdleEZpbHRlciA9IC9eKCE/KVxcLyhbXFx3XFxXXSopXFwvKGk/JCkvLmV4ZWMoIGZpbHRlciApLFxuXHRcdFx0bW9kdWxlID0gY29uZmlnLm1vZHVsZSAmJiBjb25maWcubW9kdWxlLnRvTG93ZXJDYXNlKCksXG5cdFx0XHRmdWxsTmFtZSA9ICggdGhpcy5tb2R1bGUubmFtZSArIFwiOiBcIiArIHRoaXMudGVzdE5hbWUgKTtcblxuXHRcdGZ1bmN0aW9uIG1vZHVsZUNoYWluTmFtZU1hdGNoKCB0ZXN0TW9kdWxlICkge1xuXHRcdFx0dmFyIHRlc3RNb2R1bGVOYW1lID0gdGVzdE1vZHVsZS5uYW1lID8gdGVzdE1vZHVsZS5uYW1lLnRvTG93ZXJDYXNlKCkgOiBudWxsO1xuXHRcdFx0aWYgKCB0ZXN0TW9kdWxlTmFtZSA9PT0gbW9kdWxlICkge1xuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdH0gZWxzZSBpZiAoIHRlc3RNb2R1bGUucGFyZW50TW9kdWxlICkge1xuXHRcdFx0XHRyZXR1cm4gbW9kdWxlQ2hhaW5OYW1lTWF0Y2goIHRlc3RNb2R1bGUucGFyZW50TW9kdWxlICk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gbW9kdWxlQ2hhaW5JZE1hdGNoKCB0ZXN0TW9kdWxlICkge1xuXHRcdFx0cmV0dXJuIGluQXJyYXkoIHRlc3RNb2R1bGUubW9kdWxlSWQsIGNvbmZpZy5tb2R1bGVJZCApID4gLTEgfHxcblx0XHRcdFx0dGVzdE1vZHVsZS5wYXJlbnRNb2R1bGUgJiYgbW9kdWxlQ2hhaW5JZE1hdGNoKCB0ZXN0TW9kdWxlLnBhcmVudE1vZHVsZSApO1xuXHRcdH1cblxuXHRcdC8vIEludGVybmFsbHktZ2VuZXJhdGVkIHRlc3RzIGFyZSBhbHdheXMgdmFsaWRcblx0XHRpZiAoIHRoaXMuY2FsbGJhY2sgJiYgdGhpcy5jYWxsYmFjay52YWxpZFRlc3QgKSB7XG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9XG5cblx0XHRpZiAoIGNvbmZpZy5tb2R1bGVJZCAmJiBjb25maWcubW9kdWxlSWQubGVuZ3RoID4gMCAmJlxuXHRcdFx0IW1vZHVsZUNoYWluSWRNYXRjaCggdGhpcy5tb2R1bGUgKSApIHtcblxuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblxuXHRcdGlmICggY29uZmlnLnRlc3RJZCAmJiBjb25maWcudGVzdElkLmxlbmd0aCA+IDAgJiZcblx0XHRcdGluQXJyYXkoIHRoaXMudGVzdElkLCBjb25maWcudGVzdElkICkgPCAwICkge1xuXG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXG5cdFx0aWYgKCBtb2R1bGUgJiYgIW1vZHVsZUNoYWluTmFtZU1hdGNoKCB0aGlzLm1vZHVsZSApICkge1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblxuXHRcdGlmICggIWZpbHRlciApIHtcblx0XHRcdHJldHVybiB0cnVlO1xuXHRcdH1cblxuXHRcdHJldHVybiByZWdleEZpbHRlciA/XG5cdFx0XHR0aGlzLnJlZ2V4RmlsdGVyKCAhIXJlZ2V4RmlsdGVyWyAxIF0sIHJlZ2V4RmlsdGVyWyAyIF0sIHJlZ2V4RmlsdGVyWyAzIF0sIGZ1bGxOYW1lICkgOlxuXHRcdFx0dGhpcy5zdHJpbmdGaWx0ZXIoIGZpbHRlciwgZnVsbE5hbWUgKTtcblx0fSxcblxuXHRyZWdleEZpbHRlcjogZnVuY3Rpb24oIGV4Y2x1ZGUsIHBhdHRlcm4sIGZsYWdzLCBmdWxsTmFtZSApIHtcblx0XHR2YXIgcmVnZXggPSBuZXcgUmVnRXhwKCBwYXR0ZXJuLCBmbGFncyApO1xuXHRcdHZhciBtYXRjaCA9IHJlZ2V4LnRlc3QoIGZ1bGxOYW1lICk7XG5cblx0XHRyZXR1cm4gbWF0Y2ggIT09IGV4Y2x1ZGU7XG5cdH0sXG5cblx0c3RyaW5nRmlsdGVyOiBmdW5jdGlvbiggZmlsdGVyLCBmdWxsTmFtZSApIHtcblx0XHRmaWx0ZXIgPSBmaWx0ZXIudG9Mb3dlckNhc2UoKTtcblx0XHRmdWxsTmFtZSA9IGZ1bGxOYW1lLnRvTG93ZXJDYXNlKCk7XG5cblx0XHR2YXIgaW5jbHVkZSA9IGZpbHRlci5jaGFyQXQoIDAgKSAhPT0gXCIhXCI7XG5cdFx0aWYgKCAhaW5jbHVkZSApIHtcblx0XHRcdGZpbHRlciA9IGZpbHRlci5zbGljZSggMSApO1xuXHRcdH1cblxuXHRcdC8vIElmIHRoZSBmaWx0ZXIgbWF0Y2hlcywgd2UgbmVlZCB0byBob25vdXIgaW5jbHVkZVxuXHRcdGlmICggZnVsbE5hbWUuaW5kZXhPZiggZmlsdGVyICkgIT09IC0xICkge1xuXHRcdFx0cmV0dXJuIGluY2x1ZGU7XG5cdFx0fVxuXG5cdFx0Ly8gT3RoZXJ3aXNlLCBkbyB0aGUgb3Bwb3NpdGVcblx0XHRyZXR1cm4gIWluY2x1ZGU7XG5cdH1cbn07XG5cbi8vIFJlc2V0cyB0aGUgdGVzdCBzZXR1cC4gVXNlZnVsIGZvciB0ZXN0cyB0aGF0IG1vZGlmeSB0aGUgRE9NLlxuLypcbkRFUFJFQ0FURUQ6IFVzZSBtdWx0aXBsZSB0ZXN0cyBpbnN0ZWFkIG9mIHJlc2V0dGluZyBpbnNpZGUgYSB0ZXN0LlxuVXNlIHRlc3RTdGFydCBvciB0ZXN0RG9uZSBmb3IgY3VzdG9tIGNsZWFudXAuXG5UaGlzIG1ldGhvZCB3aWxsIHRocm93IGFuIGVycm9yIGluIDIuMCwgYW5kIHdpbGwgYmUgcmVtb3ZlZCBpbiAyLjFcbiovXG5RVW5pdC5yZXNldCA9IGZ1bmN0aW9uKCkge1xuXG5cdC8vIFJldHVybiBvbiBub24tYnJvd3NlciBlbnZpcm9ubWVudHNcblx0Ly8gVGhpcyBpcyBuZWNlc3NhcnkgdG8gbm90IGJyZWFrIG9uIG5vZGUgdGVzdHNcblx0aWYgKCAhZGVmaW5lZC5kb2N1bWVudCApIHtcblx0XHRyZXR1cm47XG5cdH1cblxuXHR2YXIgZml4dHVyZSA9IGRlZmluZWQuZG9jdW1lbnQgJiYgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQgJiZcblx0XHRcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCBcInF1bml0LWZpeHR1cmVcIiApO1xuXG5cdGlmICggZml4dHVyZSApIHtcblx0XHRmaXh0dXJlLmlubmVySFRNTCA9IGNvbmZpZy5maXh0dXJlO1xuXHR9XG59O1xuXG5RVW5pdC5wdXNoRmFpbHVyZSA9IGZ1bmN0aW9uKCkge1xuXHRpZiAoICFRVW5pdC5jb25maWcuY3VycmVudCApIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoIFwicHVzaEZhaWx1cmUoKSBhc3NlcnRpb24gb3V0c2lkZSB0ZXN0IGNvbnRleHQsIGluIFwiICtcblx0XHRcdHNvdXJjZUZyb21TdGFja3RyYWNlKCAyICkgKTtcblx0fVxuXG5cdC8vIEdldHMgY3VycmVudCB0ZXN0IG9ialxuXHR2YXIgY3VycmVudFRlc3QgPSBRVW5pdC5jb25maWcuY3VycmVudDtcblxuXHRyZXR1cm4gY3VycmVudFRlc3QucHVzaEZhaWx1cmUuYXBwbHkoIGN1cnJlbnRUZXN0LCBhcmd1bWVudHMgKTtcbn07XG5cbi8vIEJhc2VkIG9uIEphdmEncyBTdHJpbmcuaGFzaENvZGUsIGEgc2ltcGxlIGJ1dCBub3Rcbi8vIHJpZ29yb3VzbHkgY29sbGlzaW9uIHJlc2lzdGFudCBoYXNoaW5nIGZ1bmN0aW9uXG5mdW5jdGlvbiBnZW5lcmF0ZUhhc2goIG1vZHVsZSwgdGVzdE5hbWUgKSB7XG5cdHZhciBoZXgsXG5cdFx0aSA9IDAsXG5cdFx0aGFzaCA9IDAsXG5cdFx0c3RyID0gbW9kdWxlICsgXCJcXHgxQ1wiICsgdGVzdE5hbWUsXG5cdFx0bGVuID0gc3RyLmxlbmd0aDtcblxuXHRmb3IgKCA7IGkgPCBsZW47IGkrKyApIHtcblx0XHRoYXNoICA9ICggKCBoYXNoIDw8IDUgKSAtIGhhc2ggKSArIHN0ci5jaGFyQ29kZUF0KCBpICk7XG5cdFx0aGFzaCB8PSAwO1xuXHR9XG5cblx0Ly8gQ29udmVydCB0aGUgcG9zc2libHkgbmVnYXRpdmUgaW50ZWdlciBoYXNoIGNvZGUgaW50byBhbiA4IGNoYXJhY3RlciBoZXggc3RyaW5nLCB3aGljaCBpc24ndFxuXHQvLyBzdHJpY3RseSBuZWNlc3NhcnkgYnV0IGluY3JlYXNlcyB1c2VyIHVuZGVyc3RhbmRpbmcgdGhhdCB0aGUgaWQgaXMgYSBTSEEtbGlrZSBoYXNoXG5cdGhleCA9ICggMHgxMDAwMDAwMDAgKyBoYXNoICkudG9TdHJpbmcoIDE2ICk7XG5cdGlmICggaGV4Lmxlbmd0aCA8IDggKSB7XG5cdFx0aGV4ID0gXCIwMDAwMDAwXCIgKyBoZXg7XG5cdH1cblxuXHRyZXR1cm4gaGV4LnNsaWNlKCAtOCApO1xufVxuXG5mdW5jdGlvbiBzeW5jaHJvbml6ZSggY2FsbGJhY2ssIHByaW9yaXR5LCBzZWVkICkge1xuXHR2YXIgbGFzdCA9ICFwcmlvcml0eSxcblx0XHRpbmRleDtcblxuXHRpZiAoIFFVbml0Lm9iamVjdFR5cGUoIGNhbGxiYWNrICkgPT09IFwiYXJyYXlcIiApIHtcblx0XHR3aGlsZSAoIGNhbGxiYWNrLmxlbmd0aCApIHtcblx0XHRcdHN5bmNocm9uaXplKCBjYWxsYmFjay5zaGlmdCgpICk7XG5cdFx0fVxuXHRcdHJldHVybjtcblx0fVxuXG5cdGlmICggcHJpb3JpdHkgKSB7XG5cdFx0Y29uZmlnLnF1ZXVlLnNwbGljZSggcHJpb3JpdHlDb3VudCsrLCAwLCBjYWxsYmFjayApO1xuXHR9IGVsc2UgaWYgKCBzZWVkICkge1xuXHRcdGlmICggIXVuaXRTYW1wbGVyICkge1xuXHRcdFx0dW5pdFNhbXBsZXIgPSB1bml0U2FtcGxlckdlbmVyYXRvciggc2VlZCApO1xuXHRcdH1cblxuXHRcdC8vIEluc2VydCBpbnRvIGEgcmFuZG9tIHBvc2l0aW9uIGFmdGVyIGFsbCBwcmlvcml0eSBpdGVtc1xuXHRcdGluZGV4ID0gTWF0aC5mbG9vciggdW5pdFNhbXBsZXIoKSAqICggY29uZmlnLnF1ZXVlLmxlbmd0aCAtIHByaW9yaXR5Q291bnQgKyAxICkgKTtcblx0XHRjb25maWcucXVldWUuc3BsaWNlKCBwcmlvcml0eUNvdW50ICsgaW5kZXgsIDAsIGNhbGxiYWNrICk7XG5cdH0gZWxzZSB7XG5cdFx0Y29uZmlnLnF1ZXVlLnB1c2goIGNhbGxiYWNrICk7XG5cdH1cblxuXHRpZiAoIGNvbmZpZy5hdXRvcnVuICYmICFjb25maWcuYmxvY2tpbmcgKSB7XG5cdFx0cHJvY2VzcyggbGFzdCApO1xuXHR9XG59XG5cbmZ1bmN0aW9uIHVuaXRTYW1wbGVyR2VuZXJhdG9yKCBzZWVkICkge1xuXG5cdC8vIDMyLWJpdCB4b3JzaGlmdCwgcmVxdWlyZXMgb25seSBhIG5vbnplcm8gc2VlZFxuXHQvLyBodHRwOi8vZXhjYW1lcmEuY29tL3NwaGlueC9hcnRpY2xlLXhvcnNoaWZ0Lmh0bWxcblx0dmFyIHNhbXBsZSA9IHBhcnNlSW50KCBnZW5lcmF0ZUhhc2goIHNlZWQgKSwgMTYgKSB8fCAtMTtcblx0cmV0dXJuIGZ1bmN0aW9uKCkge1xuXHRcdHNhbXBsZSBePSBzYW1wbGUgPDwgMTM7XG5cdFx0c2FtcGxlIF49IHNhbXBsZSA+Pj4gMTc7XG5cdFx0c2FtcGxlIF49IHNhbXBsZSA8PCA1O1xuXG5cdFx0Ly8gRUNNQVNjcmlwdCBoYXMgbm8gdW5zaWduZWQgbnVtYmVyIHR5cGVcblx0XHRpZiAoIHNhbXBsZSA8IDAgKSB7XG5cdFx0XHRzYW1wbGUgKz0gMHgxMDAwMDAwMDA7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHNhbXBsZSAvIDB4MTAwMDAwMDAwO1xuXHR9O1xufVxuXG5mdW5jdGlvbiBzYXZlR2xvYmFsKCkge1xuXHRjb25maWcucG9sbHV0aW9uID0gW107XG5cblx0aWYgKCBjb25maWcubm9nbG9iYWxzICkge1xuXHRcdGZvciAoIHZhciBrZXkgaW4gZ2xvYmFsICkge1xuXHRcdFx0aWYgKCBoYXNPd24uY2FsbCggZ2xvYmFsLCBrZXkgKSApIHtcblxuXHRcdFx0XHQvLyBJbiBPcGVyYSBzb21ldGltZXMgRE9NIGVsZW1lbnQgaWRzIHNob3cgdXAgaGVyZSwgaWdub3JlIHRoZW1cblx0XHRcdFx0aWYgKCAvXnF1bml0LXRlc3Qtb3V0cHV0Ly50ZXN0KCBrZXkgKSApIHtcblx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0fVxuXHRcdFx0XHRjb25maWcucG9sbHV0aW9uLnB1c2goIGtleSApO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxufVxuXG5mdW5jdGlvbiBjaGVja1BvbGx1dGlvbigpIHtcblx0dmFyIG5ld0dsb2JhbHMsXG5cdFx0ZGVsZXRlZEdsb2JhbHMsXG5cdFx0b2xkID0gY29uZmlnLnBvbGx1dGlvbjtcblxuXHRzYXZlR2xvYmFsKCk7XG5cblx0bmV3R2xvYmFscyA9IGRpZmYoIGNvbmZpZy5wb2xsdXRpb24sIG9sZCApO1xuXHRpZiAoIG5ld0dsb2JhbHMubGVuZ3RoID4gMCApIHtcblx0XHRRVW5pdC5wdXNoRmFpbHVyZSggXCJJbnRyb2R1Y2VkIGdsb2JhbCB2YXJpYWJsZShzKTogXCIgKyBuZXdHbG9iYWxzLmpvaW4oIFwiLCBcIiApICk7XG5cdH1cblxuXHRkZWxldGVkR2xvYmFscyA9IGRpZmYoIG9sZCwgY29uZmlnLnBvbGx1dGlvbiApO1xuXHRpZiAoIGRlbGV0ZWRHbG9iYWxzLmxlbmd0aCA+IDAgKSB7XG5cdFx0UVVuaXQucHVzaEZhaWx1cmUoIFwiRGVsZXRlZCBnbG9iYWwgdmFyaWFibGUocyk6IFwiICsgZGVsZXRlZEdsb2JhbHMuam9pbiggXCIsIFwiICkgKTtcblx0fVxufVxuXG4vLyBXaWxsIGJlIGV4cG9zZWQgYXMgUVVuaXQuYXN5bmNUZXN0XG5mdW5jdGlvbiBhc3luY1Rlc3QoIHRlc3ROYW1lLCBleHBlY3RlZCwgY2FsbGJhY2sgKSB7XG5cdGlmICggYXJndW1lbnRzLmxlbmd0aCA9PT0gMiApIHtcblx0XHRjYWxsYmFjayA9IGV4cGVjdGVkO1xuXHRcdGV4cGVjdGVkID0gbnVsbDtcblx0fVxuXG5cdFFVbml0LnRlc3QoIHRlc3ROYW1lLCBleHBlY3RlZCwgY2FsbGJhY2ssIHRydWUgKTtcbn1cblxuLy8gV2lsbCBiZSBleHBvc2VkIGFzIFFVbml0LnRlc3RcbmZ1bmN0aW9uIHRlc3QoIHRlc3ROYW1lLCBleHBlY3RlZCwgY2FsbGJhY2ssIGFzeW5jICkge1xuXHRpZiAoIGZvY3VzZWQgKSAgeyByZXR1cm47IH1cblxuXHR2YXIgbmV3VGVzdDtcblxuXHRpZiAoIGFyZ3VtZW50cy5sZW5ndGggPT09IDIgKSB7XG5cdFx0Y2FsbGJhY2sgPSBleHBlY3RlZDtcblx0XHRleHBlY3RlZCA9IG51bGw7XG5cdH1cblxuXHRuZXdUZXN0ID0gbmV3IFRlc3QoIHtcblx0XHR0ZXN0TmFtZTogdGVzdE5hbWUsXG5cdFx0ZXhwZWN0ZWQ6IGV4cGVjdGVkLFxuXHRcdGFzeW5jOiBhc3luYyxcblx0XHRjYWxsYmFjazogY2FsbGJhY2tcblx0fSApO1xuXG5cdG5ld1Rlc3QucXVldWUoKTtcbn1cblxuLy8gV2lsbCBiZSBleHBvc2VkIGFzIFFVbml0LnNraXBcbmZ1bmN0aW9uIHNraXAoIHRlc3ROYW1lICkge1xuXHRpZiAoIGZvY3VzZWQgKSAgeyByZXR1cm47IH1cblxuXHR2YXIgdGVzdCA9IG5ldyBUZXN0KCB7XG5cdFx0dGVzdE5hbWU6IHRlc3ROYW1lLFxuXHRcdHNraXA6IHRydWVcblx0fSApO1xuXG5cdHRlc3QucXVldWUoKTtcbn1cblxuLy8gV2lsbCBiZSBleHBvc2VkIGFzIFFVbml0Lm9ubHlcbmZ1bmN0aW9uIG9ubHkoIHRlc3ROYW1lLCBleHBlY3RlZCwgY2FsbGJhY2ssIGFzeW5jICkge1xuXHR2YXIgbmV3VGVzdDtcblxuXHRpZiAoIGZvY3VzZWQgKSAgeyByZXR1cm47IH1cblxuXHRRVW5pdC5jb25maWcucXVldWUubGVuZ3RoID0gMDtcblx0Zm9jdXNlZCA9IHRydWU7XG5cblx0aWYgKCBhcmd1bWVudHMubGVuZ3RoID09PSAyICkge1xuXHRcdGNhbGxiYWNrID0gZXhwZWN0ZWQ7XG5cdFx0ZXhwZWN0ZWQgPSBudWxsO1xuXHR9XG5cblx0bmV3VGVzdCA9IG5ldyBUZXN0KCB7XG5cdFx0dGVzdE5hbWU6IHRlc3ROYW1lLFxuXHRcdGV4cGVjdGVkOiBleHBlY3RlZCxcblx0XHRhc3luYzogYXN5bmMsXG5cdFx0Y2FsbGJhY2s6IGNhbGxiYWNrXG5cdH0gKTtcblxuXHRuZXdUZXN0LnF1ZXVlKCk7XG59XG5cbmZ1bmN0aW9uIEFzc2VydCggdGVzdENvbnRleHQgKSB7XG5cdHRoaXMudGVzdCA9IHRlc3RDb250ZXh0O1xufVxuXG4vLyBBc3NlcnQgaGVscGVyc1xuUVVuaXQuYXNzZXJ0ID0gQXNzZXJ0LnByb3RvdHlwZSA9IHtcblxuXHQvLyBTcGVjaWZ5IHRoZSBudW1iZXIgb2YgZXhwZWN0ZWQgYXNzZXJ0aW9ucyB0byBndWFyYW50ZWUgdGhhdCBmYWlsZWQgdGVzdFxuXHQvLyAobm8gYXNzZXJ0aW9ucyBhcmUgcnVuIGF0IGFsbCkgZG9uJ3Qgc2xpcCB0aHJvdWdoLlxuXHRleHBlY3Q6IGZ1bmN0aW9uKCBhc3NlcnRzICkge1xuXHRcdGlmICggYXJndW1lbnRzLmxlbmd0aCA9PT0gMSApIHtcblx0XHRcdHRoaXMudGVzdC5leHBlY3RlZCA9IGFzc2VydHM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLnRlc3QuZXhwZWN0ZWQ7XG5cdFx0fVxuXHR9LFxuXG5cdC8vIEluY3JlbWVudCB0aGlzIFRlc3QncyBzZW1hcGhvcmUgY291bnRlciwgdGhlbiByZXR1cm4gYSBmdW5jdGlvbiB0aGF0XG5cdC8vIGRlY3JlbWVudHMgdGhhdCBjb3VudGVyIGEgbWF4aW11bSBvZiBvbmNlLlxuXHRhc3luYzogZnVuY3Rpb24oIGNvdW50ICkge1xuXHRcdHZhciB0ZXN0ID0gdGhpcy50ZXN0LFxuXHRcdFx0cG9wcGVkID0gZmFsc2UsXG5cdFx0XHRhY2NlcHRDYWxsQ291bnQgPSBjb3VudDtcblxuXHRcdGlmICggdHlwZW9mIGFjY2VwdENhbGxDb3VudCA9PT0gXCJ1bmRlZmluZWRcIiApIHtcblx0XHRcdGFjY2VwdENhbGxDb3VudCA9IDE7XG5cdFx0fVxuXG5cdFx0dGVzdC5zZW1hcGhvcmUgKz0gMTtcblx0XHR0ZXN0LnVzZWRBc3luYyA9IHRydWU7XG5cdFx0cGF1c2VQcm9jZXNzaW5nKCk7XG5cblx0XHRyZXR1cm4gZnVuY3Rpb24gZG9uZSgpIHtcblxuXHRcdFx0aWYgKCBwb3BwZWQgKSB7XG5cdFx0XHRcdHRlc3QucHVzaEZhaWx1cmUoIFwiVG9vIG1hbnkgY2FsbHMgdG8gdGhlIGBhc3NlcnQuYXN5bmNgIGNhbGxiYWNrXCIsXG5cdFx0XHRcdFx0c291cmNlRnJvbVN0YWNrdHJhY2UoIDIgKSApO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0XHRhY2NlcHRDYWxsQ291bnQgLT0gMTtcblx0XHRcdGlmICggYWNjZXB0Q2FsbENvdW50ID4gMCApIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHR0ZXN0LnNlbWFwaG9yZSAtPSAxO1xuXHRcdFx0cG9wcGVkID0gdHJ1ZTtcblx0XHRcdHJlc3VtZVByb2Nlc3NpbmcoKTtcblx0XHR9O1xuXHR9LFxuXG5cdC8vIEV4cG9ydHMgdGVzdC5wdXNoKCkgdG8gdGhlIHVzZXIgQVBJXG5cdC8vIEFsaWFzIG9mIHB1c2hSZXN1bHQuXG5cdHB1c2g6IGZ1bmN0aW9uKCByZXN1bHQsIGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UsIG5lZ2F0aXZlICkge1xuXHRcdHZhciBjdXJyZW50QXNzZXJ0ID0gdGhpcyBpbnN0YW5jZW9mIEFzc2VydCA/IHRoaXMgOiBRVW5pdC5jb25maWcuY3VycmVudC5hc3NlcnQ7XG5cdFx0cmV0dXJuIGN1cnJlbnRBc3NlcnQucHVzaFJlc3VsdCgge1xuXHRcdFx0cmVzdWx0OiByZXN1bHQsXG5cdFx0XHRhY3R1YWw6IGFjdHVhbCxcblx0XHRcdGV4cGVjdGVkOiBleHBlY3RlZCxcblx0XHRcdG1lc3NhZ2U6IG1lc3NhZ2UsXG5cdFx0XHRuZWdhdGl2ZTogbmVnYXRpdmVcblx0XHR9ICk7XG5cdH0sXG5cblx0cHVzaFJlc3VsdDogZnVuY3Rpb24oIHJlc3VsdEluZm8gKSB7XG5cblx0XHQvLyBEZXN0cnVjdHVyZSBvZiByZXN1bHRJbmZvID0geyByZXN1bHQsIGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UsIG5lZ2F0aXZlIH1cblx0XHR2YXIgYXNzZXJ0ID0gdGhpcyxcblx0XHRcdGN1cnJlbnRUZXN0ID0gKCBhc3NlcnQgaW5zdGFuY2VvZiBBc3NlcnQgJiYgYXNzZXJ0LnRlc3QgKSB8fCBRVW5pdC5jb25maWcuY3VycmVudDtcblxuXHRcdC8vIEJhY2t3YXJkcyBjb21wYXRpYmlsaXR5IGZpeC5cblx0XHQvLyBBbGxvd3MgdGhlIGRpcmVjdCB1c2Ugb2YgZ2xvYmFsIGV4cG9ydGVkIGFzc2VydGlvbnMgYW5kIFFVbml0LmFzc2VydC4qXG5cdFx0Ly8gQWx0aG91Z2gsIGl0J3MgdXNlIGlzIG5vdCByZWNvbW1lbmRlZCBhcyBpdCBjYW4gbGVhayBhc3NlcnRpb25zXG5cdFx0Ly8gdG8gb3RoZXIgdGVzdHMgZnJvbSBhc3luYyB0ZXN0cywgYmVjYXVzZSB3ZSBvbmx5IGdldCBhIHJlZmVyZW5jZSB0byB0aGUgY3VycmVudCB0ZXN0LFxuXHRcdC8vIG5vdCBleGFjdGx5IHRoZSB0ZXN0IHdoZXJlIGFzc2VydGlvbiB3ZXJlIGludGVuZGVkIHRvIGJlIGNhbGxlZC5cblx0XHRpZiAoICFjdXJyZW50VGVzdCApIHtcblx0XHRcdHRocm93IG5ldyBFcnJvciggXCJhc3NlcnRpb24gb3V0c2lkZSB0ZXN0IGNvbnRleHQsIGluIFwiICsgc291cmNlRnJvbVN0YWNrdHJhY2UoIDIgKSApO1xuXHRcdH1cblxuXHRcdGlmICggY3VycmVudFRlc3QudXNlZEFzeW5jID09PSB0cnVlICYmIGN1cnJlbnRUZXN0LnNlbWFwaG9yZSA9PT0gMCApIHtcblx0XHRcdGN1cnJlbnRUZXN0LnB1c2hGYWlsdXJlKCBcIkFzc2VydGlvbiBhZnRlciB0aGUgZmluYWwgYGFzc2VydC5hc3luY2Agd2FzIHJlc29sdmVkXCIsXG5cdFx0XHRcdHNvdXJjZUZyb21TdGFja3RyYWNlKCAyICkgKTtcblxuXHRcdFx0Ly8gQWxsb3cgdGhpcyBhc3NlcnRpb24gdG8gY29udGludWUgcnVubmluZyBhbnl3YXkuLi5cblx0XHR9XG5cblx0XHRpZiAoICEoIGFzc2VydCBpbnN0YW5jZW9mIEFzc2VydCApICkge1xuXHRcdFx0YXNzZXJ0ID0gY3VycmVudFRlc3QuYXNzZXJ0O1xuXHRcdH1cblxuXHRcdHJldHVybiBhc3NlcnQudGVzdC5wdXNoUmVzdWx0KCByZXN1bHRJbmZvICk7XG5cdH0sXG5cblx0b2s6IGZ1bmN0aW9uKCByZXN1bHQsIG1lc3NhZ2UgKSB7XG5cdFx0bWVzc2FnZSA9IG1lc3NhZ2UgfHwgKCByZXN1bHQgPyBcIm9rYXlcIiA6IFwiZmFpbGVkLCBleHBlY3RlZCBhcmd1bWVudCB0byBiZSB0cnV0aHksIHdhczogXCIgK1xuXHRcdFx0UVVuaXQuZHVtcC5wYXJzZSggcmVzdWx0ICkgKTtcblx0XHR0aGlzLnB1c2hSZXN1bHQoIHtcblx0XHRcdHJlc3VsdDogISFyZXN1bHQsXG5cdFx0XHRhY3R1YWw6IHJlc3VsdCxcblx0XHRcdGV4cGVjdGVkOiB0cnVlLFxuXHRcdFx0bWVzc2FnZTogbWVzc2FnZVxuXHRcdH0gKTtcblx0fSxcblxuXHRub3RPazogZnVuY3Rpb24oIHJlc3VsdCwgbWVzc2FnZSApIHtcblx0XHRtZXNzYWdlID0gbWVzc2FnZSB8fCAoICFyZXN1bHQgPyBcIm9rYXlcIiA6IFwiZmFpbGVkLCBleHBlY3RlZCBhcmd1bWVudCB0byBiZSBmYWxzeSwgd2FzOiBcIiArXG5cdFx0XHRRVW5pdC5kdW1wLnBhcnNlKCByZXN1bHQgKSApO1xuXHRcdHRoaXMucHVzaFJlc3VsdCgge1xuXHRcdFx0cmVzdWx0OiAhcmVzdWx0LFxuXHRcdFx0YWN0dWFsOiByZXN1bHQsXG5cdFx0XHRleHBlY3RlZDogZmFsc2UsXG5cdFx0XHRtZXNzYWdlOiBtZXNzYWdlXG5cdFx0fSApO1xuXHR9LFxuXG5cdGVxdWFsOiBmdW5jdGlvbiggYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSApIHtcblx0XHQvKmpzaGludCBlcWVxZXE6ZmFsc2UgKi9cblx0XHR0aGlzLnB1c2hSZXN1bHQoIHtcblx0XHRcdHJlc3VsdDogZXhwZWN0ZWQgPT0gYWN0dWFsLFxuXHRcdFx0YWN0dWFsOiBhY3R1YWwsXG5cdFx0XHRleHBlY3RlZDogZXhwZWN0ZWQsXG5cdFx0XHRtZXNzYWdlOiBtZXNzYWdlXG5cdFx0fSApO1xuXHR9LFxuXG5cdG5vdEVxdWFsOiBmdW5jdGlvbiggYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSApIHtcblx0XHQvKmpzaGludCBlcWVxZXE6ZmFsc2UgKi9cblx0XHR0aGlzLnB1c2hSZXN1bHQoIHtcblx0XHRcdHJlc3VsdDogZXhwZWN0ZWQgIT0gYWN0dWFsLFxuXHRcdFx0YWN0dWFsOiBhY3R1YWwsXG5cdFx0XHRleHBlY3RlZDogZXhwZWN0ZWQsXG5cdFx0XHRtZXNzYWdlOiBtZXNzYWdlLFxuXHRcdFx0bmVnYXRpdmU6IHRydWVcblx0XHR9ICk7XG5cdH0sXG5cblx0cHJvcEVxdWFsOiBmdW5jdGlvbiggYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSApIHtcblx0XHRhY3R1YWwgPSBvYmplY3RWYWx1ZXMoIGFjdHVhbCApO1xuXHRcdGV4cGVjdGVkID0gb2JqZWN0VmFsdWVzKCBleHBlY3RlZCApO1xuXHRcdHRoaXMucHVzaFJlc3VsdCgge1xuXHRcdFx0cmVzdWx0OiBRVW5pdC5lcXVpdiggYWN0dWFsLCBleHBlY3RlZCApLFxuXHRcdFx0YWN0dWFsOiBhY3R1YWwsXG5cdFx0XHRleHBlY3RlZDogZXhwZWN0ZWQsXG5cdFx0XHRtZXNzYWdlOiBtZXNzYWdlXG5cdFx0fSApO1xuXHR9LFxuXG5cdG5vdFByb3BFcXVhbDogZnVuY3Rpb24oIGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UgKSB7XG5cdFx0YWN0dWFsID0gb2JqZWN0VmFsdWVzKCBhY3R1YWwgKTtcblx0XHRleHBlY3RlZCA9IG9iamVjdFZhbHVlcyggZXhwZWN0ZWQgKTtcblx0XHR0aGlzLnB1c2hSZXN1bHQoIHtcblx0XHRcdHJlc3VsdDogIVFVbml0LmVxdWl2KCBhY3R1YWwsIGV4cGVjdGVkICksXG5cdFx0XHRhY3R1YWw6IGFjdHVhbCxcblx0XHRcdGV4cGVjdGVkOiBleHBlY3RlZCxcblx0XHRcdG1lc3NhZ2U6IG1lc3NhZ2UsXG5cdFx0XHRuZWdhdGl2ZTogdHJ1ZVxuXHRcdH0gKTtcblx0fSxcblxuXHRkZWVwRXF1YWw6IGZ1bmN0aW9uKCBhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlICkge1xuXHRcdHRoaXMucHVzaFJlc3VsdCgge1xuXHRcdFx0cmVzdWx0OiBRVW5pdC5lcXVpdiggYWN0dWFsLCBleHBlY3RlZCApLFxuXHRcdFx0YWN0dWFsOiBhY3R1YWwsXG5cdFx0XHRleHBlY3RlZDogZXhwZWN0ZWQsXG5cdFx0XHRtZXNzYWdlOiBtZXNzYWdlXG5cdFx0fSApO1xuXHR9LFxuXG5cdG5vdERlZXBFcXVhbDogZnVuY3Rpb24oIGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UgKSB7XG5cdFx0dGhpcy5wdXNoUmVzdWx0KCB7XG5cdFx0XHRyZXN1bHQ6ICFRVW5pdC5lcXVpdiggYWN0dWFsLCBleHBlY3RlZCApLFxuXHRcdFx0YWN0dWFsOiBhY3R1YWwsXG5cdFx0XHRleHBlY3RlZDogZXhwZWN0ZWQsXG5cdFx0XHRtZXNzYWdlOiBtZXNzYWdlLFxuXHRcdFx0bmVnYXRpdmU6IHRydWVcblx0XHR9ICk7XG5cdH0sXG5cblx0c3RyaWN0RXF1YWw6IGZ1bmN0aW9uKCBhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlICkge1xuXHRcdHRoaXMucHVzaFJlc3VsdCgge1xuXHRcdFx0cmVzdWx0OiBleHBlY3RlZCA9PT0gYWN0dWFsLFxuXHRcdFx0YWN0dWFsOiBhY3R1YWwsXG5cdFx0XHRleHBlY3RlZDogZXhwZWN0ZWQsXG5cdFx0XHRtZXNzYWdlOiBtZXNzYWdlXG5cdFx0fSApO1xuXHR9LFxuXG5cdG5vdFN0cmljdEVxdWFsOiBmdW5jdGlvbiggYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSApIHtcblx0XHR0aGlzLnB1c2hSZXN1bHQoIHtcblx0XHRcdHJlc3VsdDogZXhwZWN0ZWQgIT09IGFjdHVhbCxcblx0XHRcdGFjdHVhbDogYWN0dWFsLFxuXHRcdFx0ZXhwZWN0ZWQ6IGV4cGVjdGVkLFxuXHRcdFx0bWVzc2FnZTogbWVzc2FnZSxcblx0XHRcdG5lZ2F0aXZlOiB0cnVlXG5cdFx0fSApO1xuXHR9LFxuXG5cdFwidGhyb3dzXCI6IGZ1bmN0aW9uKCBibG9jaywgZXhwZWN0ZWQsIG1lc3NhZ2UgKSB7XG5cdFx0dmFyIGFjdHVhbCwgZXhwZWN0ZWRUeXBlLFxuXHRcdFx0ZXhwZWN0ZWRPdXRwdXQgPSBleHBlY3RlZCxcblx0XHRcdG9rID0gZmFsc2UsXG5cdFx0XHRjdXJyZW50VGVzdCA9ICggdGhpcyBpbnN0YW5jZW9mIEFzc2VydCAmJiB0aGlzLnRlc3QgKSB8fCBRVW5pdC5jb25maWcuY3VycmVudDtcblxuXHRcdC8vICdleHBlY3RlZCcgaXMgb3B0aW9uYWwgdW5sZXNzIGRvaW5nIHN0cmluZyBjb21wYXJpc29uXG5cdFx0aWYgKCBtZXNzYWdlID09IG51bGwgJiYgdHlwZW9mIGV4cGVjdGVkID09PSBcInN0cmluZ1wiICkge1xuXHRcdFx0bWVzc2FnZSA9IGV4cGVjdGVkO1xuXHRcdFx0ZXhwZWN0ZWQgPSBudWxsO1xuXHRcdH1cblxuXHRcdGN1cnJlbnRUZXN0Lmlnbm9yZUdsb2JhbEVycm9ycyA9IHRydWU7XG5cdFx0dHJ5IHtcblx0XHRcdGJsb2NrLmNhbGwoIGN1cnJlbnRUZXN0LnRlc3RFbnZpcm9ubWVudCApO1xuXHRcdH0gY2F0Y2ggKCBlICkge1xuXHRcdFx0YWN0dWFsID0gZTtcblx0XHR9XG5cdFx0Y3VycmVudFRlc3QuaWdub3JlR2xvYmFsRXJyb3JzID0gZmFsc2U7XG5cblx0XHRpZiAoIGFjdHVhbCApIHtcblx0XHRcdGV4cGVjdGVkVHlwZSA9IFFVbml0Lm9iamVjdFR5cGUoIGV4cGVjdGVkICk7XG5cblx0XHRcdC8vIFdlIGRvbid0IHdhbnQgdG8gdmFsaWRhdGUgdGhyb3duIGVycm9yXG5cdFx0XHRpZiAoICFleHBlY3RlZCApIHtcblx0XHRcdFx0b2sgPSB0cnVlO1xuXHRcdFx0XHRleHBlY3RlZE91dHB1dCA9IG51bGw7XG5cblx0XHRcdC8vIEV4cGVjdGVkIGlzIGEgcmVnZXhwXG5cdFx0XHR9IGVsc2UgaWYgKCBleHBlY3RlZFR5cGUgPT09IFwicmVnZXhwXCIgKSB7XG5cdFx0XHRcdG9rID0gZXhwZWN0ZWQudGVzdCggZXJyb3JTdHJpbmcoIGFjdHVhbCApICk7XG5cblx0XHRcdC8vIEV4cGVjdGVkIGlzIGEgc3RyaW5nXG5cdFx0XHR9IGVsc2UgaWYgKCBleHBlY3RlZFR5cGUgPT09IFwic3RyaW5nXCIgKSB7XG5cdFx0XHRcdG9rID0gZXhwZWN0ZWQgPT09IGVycm9yU3RyaW5nKCBhY3R1YWwgKTtcblxuXHRcdFx0Ly8gRXhwZWN0ZWQgaXMgYSBjb25zdHJ1Y3RvciwgbWF5YmUgYW4gRXJyb3IgY29uc3RydWN0b3Jcblx0XHRcdH0gZWxzZSBpZiAoIGV4cGVjdGVkVHlwZSA9PT0gXCJmdW5jdGlvblwiICYmIGFjdHVhbCBpbnN0YW5jZW9mIGV4cGVjdGVkICkge1xuXHRcdFx0XHRvayA9IHRydWU7XG5cblx0XHRcdC8vIEV4cGVjdGVkIGlzIGFuIEVycm9yIG9iamVjdFxuXHRcdFx0fSBlbHNlIGlmICggZXhwZWN0ZWRUeXBlID09PSBcIm9iamVjdFwiICkge1xuXHRcdFx0XHRvayA9IGFjdHVhbCBpbnN0YW5jZW9mIGV4cGVjdGVkLmNvbnN0cnVjdG9yICYmXG5cdFx0XHRcdFx0YWN0dWFsLm5hbWUgPT09IGV4cGVjdGVkLm5hbWUgJiZcblx0XHRcdFx0XHRhY3R1YWwubWVzc2FnZSA9PT0gZXhwZWN0ZWQubWVzc2FnZTtcblxuXHRcdFx0Ly8gRXhwZWN0ZWQgaXMgYSB2YWxpZGF0aW9uIGZ1bmN0aW9uIHdoaWNoIHJldHVybnMgdHJ1ZSBpZiB2YWxpZGF0aW9uIHBhc3NlZFxuXHRcdFx0fSBlbHNlIGlmICggZXhwZWN0ZWRUeXBlID09PSBcImZ1bmN0aW9uXCIgJiYgZXhwZWN0ZWQuY2FsbCgge30sIGFjdHVhbCApID09PSB0cnVlICkge1xuXHRcdFx0XHRleHBlY3RlZE91dHB1dCA9IG51bGw7XG5cdFx0XHRcdG9rID0gdHJ1ZTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRjdXJyZW50VGVzdC5hc3NlcnQucHVzaFJlc3VsdCgge1xuXHRcdFx0cmVzdWx0OiBvayxcblx0XHRcdGFjdHVhbDogYWN0dWFsLFxuXHRcdFx0ZXhwZWN0ZWQ6IGV4cGVjdGVkT3V0cHV0LFxuXHRcdFx0bWVzc2FnZTogbWVzc2FnZVxuXHRcdH0gKTtcblx0fVxufTtcblxuLy8gUHJvdmlkZSBhbiBhbHRlcm5hdGl2ZSB0byBhc3NlcnQudGhyb3dzKCksIGZvciBlbnZpcm9ubWVudHMgdGhhdCBjb25zaWRlciB0aHJvd3MgYSByZXNlcnZlZCB3b3JkXG4vLyBLbm93biB0byB1cyBhcmU6IENsb3N1cmUgQ29tcGlsZXIsIE5hcndoYWxcbiggZnVuY3Rpb24oKSB7XG5cdC8qanNoaW50IHN1Yjp0cnVlICovXG5cdEFzc2VydC5wcm90b3R5cGUucmFpc2VzID0gQXNzZXJ0LnByb3RvdHlwZSBbIFwidGhyb3dzXCIgXTsgLy9qc2NzOmlnbm9yZSByZXF1aXJlRG90Tm90YXRpb25cbn0oKSApO1xuXG5mdW5jdGlvbiBlcnJvclN0cmluZyggZXJyb3IgKSB7XG5cdHZhciBuYW1lLCBtZXNzYWdlLFxuXHRcdHJlc3VsdEVycm9yU3RyaW5nID0gZXJyb3IudG9TdHJpbmcoKTtcblx0aWYgKCByZXN1bHRFcnJvclN0cmluZy5zdWJzdHJpbmcoIDAsIDcgKSA9PT0gXCJbb2JqZWN0XCIgKSB7XG5cdFx0bmFtZSA9IGVycm9yLm5hbWUgPyBlcnJvci5uYW1lLnRvU3RyaW5nKCkgOiBcIkVycm9yXCI7XG5cdFx0bWVzc2FnZSA9IGVycm9yLm1lc3NhZ2UgPyBlcnJvci5tZXNzYWdlLnRvU3RyaW5nKCkgOiBcIlwiO1xuXHRcdGlmICggbmFtZSAmJiBtZXNzYWdlICkge1xuXHRcdFx0cmV0dXJuIG5hbWUgKyBcIjogXCIgKyBtZXNzYWdlO1xuXHRcdH0gZWxzZSBpZiAoIG5hbWUgKSB7XG5cdFx0XHRyZXR1cm4gbmFtZTtcblx0XHR9IGVsc2UgaWYgKCBtZXNzYWdlICkge1xuXHRcdFx0cmV0dXJuIG1lc3NhZ2U7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiBcIkVycm9yXCI7XG5cdFx0fVxuXHR9IGVsc2Uge1xuXHRcdHJldHVybiByZXN1bHRFcnJvclN0cmluZztcblx0fVxufVxuXG4vLyBUZXN0IGZvciBlcXVhbGl0eSBhbnkgSmF2YVNjcmlwdCB0eXBlLlxuLy8gQXV0aG9yOiBQaGlsaXBwZSBSYXRow6kgPHByYXRoZUBnbWFpbC5jb20+XG5RVW5pdC5lcXVpdiA9ICggZnVuY3Rpb24oKSB7XG5cblx0Ly8gU3RhY2sgdG8gZGVjaWRlIGJldHdlZW4gc2tpcC9hYm9ydCBmdW5jdGlvbnNcblx0dmFyIGNhbGxlcnMgPSBbXTtcblxuXHQvLyBTdGFjayB0byBhdm9pZGluZyBsb29wcyBmcm9tIGNpcmN1bGFyIHJlZmVyZW5jaW5nXG5cdHZhciBwYXJlbnRzID0gW107XG5cdHZhciBwYXJlbnRzQiA9IFtdO1xuXG5cdHZhciBnZXRQcm90byA9IE9iamVjdC5nZXRQcm90b3R5cGVPZiB8fCBmdW5jdGlvbiggb2JqICkge1xuXG5cdFx0Lypqc2hpbnQgcHJvdG86IHRydWUgKi9cblx0XHRyZXR1cm4gb2JqLl9fcHJvdG9fXztcblx0fTtcblxuXHRmdW5jdGlvbiB1c2VTdHJpY3RFcXVhbGl0eSggYiwgYSApIHtcblxuXHRcdC8vIFRvIGNhdGNoIHNob3J0IGFubm90YXRpb24gVlMgJ25ldycgYW5ub3RhdGlvbiBvZiBhIGRlY2xhcmF0aW9uLiBlLmcuOlxuXHRcdC8vIGB2YXIgaSA9IDE7YFxuXHRcdC8vIGB2YXIgaiA9IG5ldyBOdW1iZXIoMSk7YFxuXHRcdGlmICggdHlwZW9mIGEgPT09IFwib2JqZWN0XCIgKSB7XG5cdFx0XHRhID0gYS52YWx1ZU9mKCk7XG5cdFx0fVxuXHRcdGlmICggdHlwZW9mIGIgPT09IFwib2JqZWN0XCIgKSB7XG5cdFx0XHRiID0gYi52YWx1ZU9mKCk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGEgPT09IGI7XG5cdH1cblxuXHRmdW5jdGlvbiBjb21wYXJlQ29uc3RydWN0b3JzKCBhLCBiICkge1xuXHRcdHZhciBwcm90b0EgPSBnZXRQcm90byggYSApO1xuXHRcdHZhciBwcm90b0IgPSBnZXRQcm90byggYiApO1xuXG5cdFx0Ly8gQ29tcGFyaW5nIGNvbnN0cnVjdG9ycyBpcyBtb3JlIHN0cmljdCB0aGFuIHVzaW5nIGBpbnN0YW5jZW9mYFxuXHRcdGlmICggYS5jb25zdHJ1Y3RvciA9PT0gYi5jb25zdHJ1Y3RvciApIHtcblx0XHRcdHJldHVybiB0cnVlO1xuXHRcdH1cblxuXHRcdC8vIFJlZiAjODUxXG5cdFx0Ly8gSWYgdGhlIG9iaiBwcm90b3R5cGUgZGVzY2VuZHMgZnJvbSBhIG51bGwgY29uc3RydWN0b3IsIHRyZWF0IGl0XG5cdFx0Ly8gYXMgYSBudWxsIHByb3RvdHlwZS5cblx0XHRpZiAoIHByb3RvQSAmJiBwcm90b0EuY29uc3RydWN0b3IgPT09IG51bGwgKSB7XG5cdFx0XHRwcm90b0EgPSBudWxsO1xuXHRcdH1cblx0XHRpZiAoIHByb3RvQiAmJiBwcm90b0IuY29uc3RydWN0b3IgPT09IG51bGwgKSB7XG5cdFx0XHRwcm90b0IgPSBudWxsO1xuXHRcdH1cblxuXHRcdC8vIEFsbG93IG9iamVjdHMgd2l0aCBubyBwcm90b3R5cGUgdG8gYmUgZXF1aXZhbGVudCB0b1xuXHRcdC8vIG9iamVjdHMgd2l0aCBPYmplY3QgYXMgdGhlaXIgY29uc3RydWN0b3IuXG5cdFx0aWYgKCAoIHByb3RvQSA9PT0gbnVsbCAmJiBwcm90b0IgPT09IE9iamVjdC5wcm90b3R5cGUgKSB8fFxuXHRcdFx0XHQoIHByb3RvQiA9PT0gbnVsbCAmJiBwcm90b0EgPT09IE9iamVjdC5wcm90b3R5cGUgKSApIHtcblx0XHRcdHJldHVybiB0cnVlO1xuXHRcdH1cblxuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXG5cdGZ1bmN0aW9uIGdldFJlZ0V4cEZsYWdzKCByZWdleHAgKSB7XG5cdFx0cmV0dXJuIFwiZmxhZ3NcIiBpbiByZWdleHAgPyByZWdleHAuZmxhZ3MgOiByZWdleHAudG9TdHJpbmcoKS5tYXRjaCggL1tnaW11eV0qJC8gKVsgMCBdO1xuXHR9XG5cblx0dmFyIGNhbGxiYWNrcyA9IHtcblx0XHRcInN0cmluZ1wiOiB1c2VTdHJpY3RFcXVhbGl0eSxcblx0XHRcImJvb2xlYW5cIjogdXNlU3RyaWN0RXF1YWxpdHksXG5cdFx0XCJudW1iZXJcIjogdXNlU3RyaWN0RXF1YWxpdHksXG5cdFx0XCJudWxsXCI6IHVzZVN0cmljdEVxdWFsaXR5LFxuXHRcdFwidW5kZWZpbmVkXCI6IHVzZVN0cmljdEVxdWFsaXR5LFxuXHRcdFwic3ltYm9sXCI6IHVzZVN0cmljdEVxdWFsaXR5LFxuXHRcdFwiZGF0ZVwiOiB1c2VTdHJpY3RFcXVhbGl0eSxcblxuXHRcdFwibmFuXCI6IGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fSxcblxuXHRcdFwicmVnZXhwXCI6IGZ1bmN0aW9uKCBiLCBhICkge1xuXHRcdFx0cmV0dXJuIGEuc291cmNlID09PSBiLnNvdXJjZSAmJlxuXG5cdFx0XHRcdC8vIEluY2x1ZGUgZmxhZ3MgaW4gdGhlIGNvbXBhcmlzb25cblx0XHRcdFx0Z2V0UmVnRXhwRmxhZ3MoIGEgKSA9PT0gZ2V0UmVnRXhwRmxhZ3MoIGIgKTtcblx0XHR9LFxuXG5cdFx0Ly8gLSBza2lwIHdoZW4gdGhlIHByb3BlcnR5IGlzIGEgbWV0aG9kIG9mIGFuIGluc3RhbmNlIChPT1ApXG5cdFx0Ly8gLSBhYm9ydCBvdGhlcndpc2UsXG5cdFx0Ly8gaW5pdGlhbCA9PT0gd291bGQgaGF2ZSBjYXRjaCBpZGVudGljYWwgcmVmZXJlbmNlcyBhbnl3YXlcblx0XHRcImZ1bmN0aW9uXCI6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGNhbGxlciA9IGNhbGxlcnNbIGNhbGxlcnMubGVuZ3RoIC0gMSBdO1xuXHRcdFx0cmV0dXJuIGNhbGxlciAhPT0gT2JqZWN0ICYmIHR5cGVvZiBjYWxsZXIgIT09IFwidW5kZWZpbmVkXCI7XG5cdFx0fSxcblxuXHRcdFwiYXJyYXlcIjogZnVuY3Rpb24oIGIsIGEgKSB7XG5cdFx0XHR2YXIgaSwgaiwgbGVuLCBsb29wLCBhQ2lyY3VsYXIsIGJDaXJjdWxhcjtcblxuXHRcdFx0bGVuID0gYS5sZW5ndGg7XG5cdFx0XHRpZiAoIGxlbiAhPT0gYi5sZW5ndGggKSB7XG5cblx0XHRcdFx0Ly8gU2FmZSBhbmQgZmFzdGVyXG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gVHJhY2sgcmVmZXJlbmNlIHRvIGF2b2lkIGNpcmN1bGFyIHJlZmVyZW5jZXNcblx0XHRcdHBhcmVudHMucHVzaCggYSApO1xuXHRcdFx0cGFyZW50c0IucHVzaCggYiApO1xuXHRcdFx0Zm9yICggaSA9IDA7IGkgPCBsZW47IGkrKyApIHtcblx0XHRcdFx0bG9vcCA9IGZhbHNlO1xuXHRcdFx0XHRmb3IgKCBqID0gMDsgaiA8IHBhcmVudHMubGVuZ3RoOyBqKysgKSB7XG5cdFx0XHRcdFx0YUNpcmN1bGFyID0gcGFyZW50c1sgaiBdID09PSBhWyBpIF07XG5cdFx0XHRcdFx0YkNpcmN1bGFyID0gcGFyZW50c0JbIGogXSA9PT0gYlsgaSBdO1xuXHRcdFx0XHRcdGlmICggYUNpcmN1bGFyIHx8IGJDaXJjdWxhciApIHtcblx0XHRcdFx0XHRcdGlmICggYVsgaSBdID09PSBiWyBpIF0gfHwgYUNpcmN1bGFyICYmIGJDaXJjdWxhciApIHtcblx0XHRcdFx0XHRcdFx0bG9vcCA9IHRydWU7XG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRwYXJlbnRzLnBvcCgpO1xuXHRcdFx0XHRcdFx0XHRwYXJlbnRzQi5wb3AoKTtcblx0XHRcdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoICFsb29wICYmICFpbm5lckVxdWl2KCBhWyBpIF0sIGJbIGkgXSApICkge1xuXHRcdFx0XHRcdHBhcmVudHMucG9wKCk7XG5cdFx0XHRcdFx0cGFyZW50c0IucG9wKCk7XG5cdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRwYXJlbnRzLnBvcCgpO1xuXHRcdFx0cGFyZW50c0IucG9wKCk7XG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9LFxuXG5cdFx0XCJzZXRcIjogZnVuY3Rpb24oIGIsIGEgKSB7XG5cdFx0XHR2YXIgaW5uZXJFcSxcblx0XHRcdFx0b3V0ZXJFcSA9IHRydWU7XG5cblx0XHRcdGlmICggYS5zaXplICE9PSBiLnNpemUgKSB7XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdH1cblxuXHRcdFx0YS5mb3JFYWNoKCBmdW5jdGlvbiggYVZhbCApIHtcblx0XHRcdFx0aW5uZXJFcSA9IGZhbHNlO1xuXG5cdFx0XHRcdGIuZm9yRWFjaCggZnVuY3Rpb24oIGJWYWwgKSB7XG5cdFx0XHRcdFx0aWYgKCBpbm5lckVxdWl2KCBiVmFsLCBhVmFsICkgKSB7XG5cdFx0XHRcdFx0XHRpbm5lckVxID0gdHJ1ZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0gKTtcblxuXHRcdFx0XHRpZiAoICFpbm5lckVxICkge1xuXHRcdFx0XHRcdG91dGVyRXEgPSBmYWxzZTtcblx0XHRcdFx0fVxuXHRcdFx0fSApO1xuXG5cdFx0XHRyZXR1cm4gb3V0ZXJFcTtcblx0XHR9LFxuXG5cdFx0XCJtYXBcIjogZnVuY3Rpb24oIGIsIGEgKSB7XG5cdFx0XHR2YXIgaW5uZXJFcSxcblx0XHRcdFx0b3V0ZXJFcSA9IHRydWU7XG5cblx0XHRcdGlmICggYS5zaXplICE9PSBiLnNpemUgKSB7XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdH1cblxuXHRcdFx0YS5mb3JFYWNoKCBmdW5jdGlvbiggYVZhbCwgYUtleSApIHtcblx0XHRcdFx0aW5uZXJFcSA9IGZhbHNlO1xuXG5cdFx0XHRcdGIuZm9yRWFjaCggZnVuY3Rpb24oIGJWYWwsIGJLZXkgKSB7XG5cdFx0XHRcdFx0aWYgKCBpbm5lckVxdWl2KCBbIGJWYWwsIGJLZXkgXSwgWyBhVmFsLCBhS2V5IF0gKSApIHtcblx0XHRcdFx0XHRcdGlubmVyRXEgPSB0cnVlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSApO1xuXG5cdFx0XHRcdGlmICggIWlubmVyRXEgKSB7XG5cdFx0XHRcdFx0b3V0ZXJFcSA9IGZhbHNlO1xuXHRcdFx0XHR9XG5cdFx0XHR9ICk7XG5cblx0XHRcdHJldHVybiBvdXRlckVxO1xuXHRcdH0sXG5cblx0XHRcIm9iamVjdFwiOiBmdW5jdGlvbiggYiwgYSApIHtcblx0XHRcdHZhciBpLCBqLCBsb29wLCBhQ2lyY3VsYXIsIGJDaXJjdWxhcjtcblxuXHRcdFx0Ly8gRGVmYXVsdCB0byB0cnVlXG5cdFx0XHR2YXIgZXEgPSB0cnVlO1xuXHRcdFx0dmFyIGFQcm9wZXJ0aWVzID0gW107XG5cdFx0XHR2YXIgYlByb3BlcnRpZXMgPSBbXTtcblxuXHRcdFx0aWYgKCBjb21wYXJlQ29uc3RydWN0b3JzKCBhLCBiICkgPT09IGZhbHNlICkge1xuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHR9XG5cblx0XHRcdC8vIFN0YWNrIGNvbnN0cnVjdG9yIGJlZm9yZSB0cmF2ZXJzaW5nIHByb3BlcnRpZXNcblx0XHRcdGNhbGxlcnMucHVzaCggYS5jb25zdHJ1Y3RvciApO1xuXG5cdFx0XHQvLyBUcmFjayByZWZlcmVuY2UgdG8gYXZvaWQgY2lyY3VsYXIgcmVmZXJlbmNlc1xuXHRcdFx0cGFyZW50cy5wdXNoKCBhICk7XG5cdFx0XHRwYXJlbnRzQi5wdXNoKCBiICk7XG5cblx0XHRcdC8vIEJlIHN0cmljdDogZG9uJ3QgZW5zdXJlIGhhc093blByb3BlcnR5IGFuZCBnbyBkZWVwXG5cdFx0XHRmb3IgKCBpIGluIGEgKSB7XG5cdFx0XHRcdGxvb3AgPSBmYWxzZTtcblx0XHRcdFx0Zm9yICggaiA9IDA7IGogPCBwYXJlbnRzLmxlbmd0aDsgaisrICkge1xuXHRcdFx0XHRcdGFDaXJjdWxhciA9IHBhcmVudHNbIGogXSA9PT0gYVsgaSBdO1xuXHRcdFx0XHRcdGJDaXJjdWxhciA9IHBhcmVudHNCWyBqIF0gPT09IGJbIGkgXTtcblx0XHRcdFx0XHRpZiAoIGFDaXJjdWxhciB8fCBiQ2lyY3VsYXIgKSB7XG5cdFx0XHRcdFx0XHRpZiAoIGFbIGkgXSA9PT0gYlsgaSBdIHx8IGFDaXJjdWxhciAmJiBiQ2lyY3VsYXIgKSB7XG5cdFx0XHRcdFx0XHRcdGxvb3AgPSB0cnVlO1xuXHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0ZXEgPSBmYWxzZTtcblx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdGFQcm9wZXJ0aWVzLnB1c2goIGkgKTtcblx0XHRcdFx0aWYgKCAhbG9vcCAmJiAhaW5uZXJFcXVpdiggYVsgaSBdLCBiWyBpIF0gKSApIHtcblx0XHRcdFx0XHRlcSA9IGZhbHNlO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdHBhcmVudHMucG9wKCk7XG5cdFx0XHRwYXJlbnRzQi5wb3AoKTtcblxuXHRcdFx0Ly8gVW5zdGFjaywgd2UgYXJlIGRvbmVcblx0XHRcdGNhbGxlcnMucG9wKCk7XG5cblx0XHRcdGZvciAoIGkgaW4gYiApIHtcblxuXHRcdFx0XHQvLyBDb2xsZWN0IGIncyBwcm9wZXJ0aWVzXG5cdFx0XHRcdGJQcm9wZXJ0aWVzLnB1c2goIGkgKTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gRW5zdXJlcyBpZGVudGljYWwgcHJvcGVydGllcyBuYW1lXG5cdFx0XHRyZXR1cm4gZXEgJiYgaW5uZXJFcXVpdiggYVByb3BlcnRpZXMuc29ydCgpLCBiUHJvcGVydGllcy5zb3J0KCkgKTtcblx0XHR9XG5cdH07XG5cblx0ZnVuY3Rpb24gdHlwZUVxdWl2KCBhLCBiICkge1xuXHRcdHZhciB0eXBlID0gUVVuaXQub2JqZWN0VHlwZSggYSApO1xuXHRcdHJldHVybiBRVW5pdC5vYmplY3RUeXBlKCBiICkgPT09IHR5cGUgJiYgY2FsbGJhY2tzWyB0eXBlIF0oIGIsIGEgKTtcblx0fVxuXG5cdC8vIFRoZSByZWFsIGVxdWl2IGZ1bmN0aW9uXG5cdGZ1bmN0aW9uIGlubmVyRXF1aXYoIGEsIGIgKSB7XG5cblx0XHQvLyBXZSdyZSBkb25lIHdoZW4gdGhlcmUncyBub3RoaW5nIG1vcmUgdG8gY29tcGFyZVxuXHRcdGlmICggYXJndW1lbnRzLmxlbmd0aCA8IDIgKSB7XG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9XG5cblx0XHQvLyBSZXF1aXJlIHR5cGUtc3BlY2lmaWMgZXF1YWxpdHlcblx0XHRyZXR1cm4gKCBhID09PSBiIHx8IHR5cGVFcXVpdiggYSwgYiApICkgJiZcblxuXHRcdFx0Ly8gLi4uYWNyb3NzIGFsbCBjb25zZWN1dGl2ZSBhcmd1bWVudCBwYWlyc1xuXHRcdFx0KCBhcmd1bWVudHMubGVuZ3RoID09PSAyIHx8IGlubmVyRXF1aXYuYXBwbHkoIHRoaXMsIFtdLnNsaWNlLmNhbGwoIGFyZ3VtZW50cywgMSApICkgKTtcblx0fVxuXG5cdHJldHVybiBpbm5lckVxdWl2O1xufSgpICk7XG5cbi8vIEJhc2VkIG9uIGpzRHVtcCBieSBBcmllbCBGbGVzbGVyXG4vLyBodHRwOi8vZmxlc2xlci5ibG9nc3BvdC5jb20vMjAwOC8wNS9qc2R1bXAtcHJldHR5LWR1bXAtb2YtYW55LWphdmFzY3JpcHQuaHRtbFxuUVVuaXQuZHVtcCA9ICggZnVuY3Rpb24oKSB7XG5cdGZ1bmN0aW9uIHF1b3RlKCBzdHIgKSB7XG5cdFx0cmV0dXJuIFwiXFxcIlwiICsgc3RyLnRvU3RyaW5nKCkucmVwbGFjZSggL1xcXFwvZywgXCJcXFxcXFxcXFwiICkucmVwbGFjZSggL1wiL2csIFwiXFxcXFxcXCJcIiApICsgXCJcXFwiXCI7XG5cdH1cblx0ZnVuY3Rpb24gbGl0ZXJhbCggbyApIHtcblx0XHRyZXR1cm4gbyArIFwiXCI7XG5cdH1cblx0ZnVuY3Rpb24gam9pbiggcHJlLCBhcnIsIHBvc3QgKSB7XG5cdFx0dmFyIHMgPSBkdW1wLnNlcGFyYXRvcigpLFxuXHRcdFx0YmFzZSA9IGR1bXAuaW5kZW50KCksXG5cdFx0XHRpbm5lciA9IGR1bXAuaW5kZW50KCAxICk7XG5cdFx0aWYgKCBhcnIuam9pbiApIHtcblx0XHRcdGFyciA9IGFyci5qb2luKCBcIixcIiArIHMgKyBpbm5lciApO1xuXHRcdH1cblx0XHRpZiAoICFhcnIgKSB7XG5cdFx0XHRyZXR1cm4gcHJlICsgcG9zdDtcblx0XHR9XG5cdFx0cmV0dXJuIFsgcHJlLCBpbm5lciArIGFyciwgYmFzZSArIHBvc3QgXS5qb2luKCBzICk7XG5cdH1cblx0ZnVuY3Rpb24gYXJyYXkoIGFyciwgc3RhY2sgKSB7XG5cdFx0dmFyIGkgPSBhcnIubGVuZ3RoLFxuXHRcdFx0cmV0ID0gbmV3IEFycmF5KCBpICk7XG5cblx0XHRpZiAoIGR1bXAubWF4RGVwdGggJiYgZHVtcC5kZXB0aCA+IGR1bXAubWF4RGVwdGggKSB7XG5cdFx0XHRyZXR1cm4gXCJbb2JqZWN0IEFycmF5XVwiO1xuXHRcdH1cblxuXHRcdHRoaXMudXAoKTtcblx0XHR3aGlsZSAoIGktLSApIHtcblx0XHRcdHJldFsgaSBdID0gdGhpcy5wYXJzZSggYXJyWyBpIF0sIHVuZGVmaW5lZCwgc3RhY2sgKTtcblx0XHR9XG5cdFx0dGhpcy5kb3duKCk7XG5cdFx0cmV0dXJuIGpvaW4oIFwiW1wiLCByZXQsIFwiXVwiICk7XG5cdH1cblxuXHR2YXIgcmVOYW1lID0gL15mdW5jdGlvbiAoXFx3KykvLFxuXHRcdGR1bXAgPSB7XG5cblx0XHRcdC8vIFRoZSBvYmpUeXBlIGlzIHVzZWQgbW9zdGx5IGludGVybmFsbHksIHlvdSBjYW4gZml4IGEgKGN1c3RvbSkgdHlwZSBpbiBhZHZhbmNlXG5cdFx0XHRwYXJzZTogZnVuY3Rpb24oIG9iaiwgb2JqVHlwZSwgc3RhY2sgKSB7XG5cdFx0XHRcdHN0YWNrID0gc3RhY2sgfHwgW107XG5cdFx0XHRcdHZhciByZXMsIHBhcnNlciwgcGFyc2VyVHlwZSxcblx0XHRcdFx0XHRpblN0YWNrID0gaW5BcnJheSggb2JqLCBzdGFjayApO1xuXG5cdFx0XHRcdGlmICggaW5TdGFjayAhPT0gLTEgKSB7XG5cdFx0XHRcdFx0cmV0dXJuIFwicmVjdXJzaW9uKFwiICsgKCBpblN0YWNrIC0gc3RhY2subGVuZ3RoICkgKyBcIilcIjtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdG9ialR5cGUgPSBvYmpUeXBlIHx8IHRoaXMudHlwZU9mKCBvYmogICk7XG5cdFx0XHRcdHBhcnNlciA9IHRoaXMucGFyc2Vyc1sgb2JqVHlwZSBdO1xuXHRcdFx0XHRwYXJzZXJUeXBlID0gdHlwZW9mIHBhcnNlcjtcblxuXHRcdFx0XHRpZiAoIHBhcnNlclR5cGUgPT09IFwiZnVuY3Rpb25cIiApIHtcblx0XHRcdFx0XHRzdGFjay5wdXNoKCBvYmogKTtcblx0XHRcdFx0XHRyZXMgPSBwYXJzZXIuY2FsbCggdGhpcywgb2JqLCBzdGFjayApO1xuXHRcdFx0XHRcdHN0YWNrLnBvcCgpO1xuXHRcdFx0XHRcdHJldHVybiByZXM7XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuICggcGFyc2VyVHlwZSA9PT0gXCJzdHJpbmdcIiApID8gcGFyc2VyIDogdGhpcy5wYXJzZXJzLmVycm9yO1xuXHRcdFx0fSxcblx0XHRcdHR5cGVPZjogZnVuY3Rpb24oIG9iaiApIHtcblx0XHRcdFx0dmFyIHR5cGU7XG5cdFx0XHRcdGlmICggb2JqID09PSBudWxsICkge1xuXHRcdFx0XHRcdHR5cGUgPSBcIm51bGxcIjtcblx0XHRcdFx0fSBlbHNlIGlmICggdHlwZW9mIG9iaiA9PT0gXCJ1bmRlZmluZWRcIiApIHtcblx0XHRcdFx0XHR0eXBlID0gXCJ1bmRlZmluZWRcIjtcblx0XHRcdFx0fSBlbHNlIGlmICggUVVuaXQuaXMoIFwicmVnZXhwXCIsIG9iaiApICkge1xuXHRcdFx0XHRcdHR5cGUgPSBcInJlZ2V4cFwiO1xuXHRcdFx0XHR9IGVsc2UgaWYgKCBRVW5pdC5pcyggXCJkYXRlXCIsIG9iaiApICkge1xuXHRcdFx0XHRcdHR5cGUgPSBcImRhdGVcIjtcblx0XHRcdFx0fSBlbHNlIGlmICggUVVuaXQuaXMoIFwiZnVuY3Rpb25cIiwgb2JqICkgKSB7XG5cdFx0XHRcdFx0dHlwZSA9IFwiZnVuY3Rpb25cIjtcblx0XHRcdFx0fSBlbHNlIGlmICggb2JqLnNldEludGVydmFsICE9PSB1bmRlZmluZWQgJiZcblx0XHRcdFx0XHRcdG9iai5kb2N1bWVudCAhPT0gdW5kZWZpbmVkICYmXG5cdFx0XHRcdFx0XHRvYmoubm9kZVR5cGUgPT09IHVuZGVmaW5lZCApIHtcblx0XHRcdFx0XHR0eXBlID0gXCJ3aW5kb3dcIjtcblx0XHRcdFx0fSBlbHNlIGlmICggb2JqLm5vZGVUeXBlID09PSA5ICkge1xuXHRcdFx0XHRcdHR5cGUgPSBcImRvY3VtZW50XCI7XG5cdFx0XHRcdH0gZWxzZSBpZiAoIG9iai5ub2RlVHlwZSApIHtcblx0XHRcdFx0XHR0eXBlID0gXCJub2RlXCI7XG5cdFx0XHRcdH0gZWxzZSBpZiAoXG5cblx0XHRcdFx0XHQvLyBOYXRpdmUgYXJyYXlzXG5cdFx0XHRcdFx0dG9TdHJpbmcuY2FsbCggb2JqICkgPT09IFwiW29iamVjdCBBcnJheV1cIiB8fFxuXG5cdFx0XHRcdFx0Ly8gTm9kZUxpc3Qgb2JqZWN0c1xuXHRcdFx0XHRcdCggdHlwZW9mIG9iai5sZW5ndGggPT09IFwibnVtYmVyXCIgJiYgb2JqLml0ZW0gIT09IHVuZGVmaW5lZCAmJlxuXHRcdFx0XHRcdCggb2JqLmxlbmd0aCA/IG9iai5pdGVtKCAwICkgPT09IG9ialsgMCBdIDogKCBvYmouaXRlbSggMCApID09PSBudWxsICYmXG5cdFx0XHRcdFx0b2JqWyAwIF0gPT09IHVuZGVmaW5lZCApICkgKVxuXHRcdFx0XHQpIHtcblx0XHRcdFx0XHR0eXBlID0gXCJhcnJheVwiO1xuXHRcdFx0XHR9IGVsc2UgaWYgKCBvYmouY29uc3RydWN0b3IgPT09IEVycm9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciApIHtcblx0XHRcdFx0XHR0eXBlID0gXCJlcnJvclwiO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHR5cGUgPSB0eXBlb2Ygb2JqO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHJldHVybiB0eXBlO1xuXHRcdFx0fSxcblxuXHRcdFx0c2VwYXJhdG9yOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0cmV0dXJuIHRoaXMubXVsdGlsaW5lID8gdGhpcy5IVE1MID8gXCI8YnIgLz5cIiA6IFwiXFxuXCIgOiB0aGlzLkhUTUwgPyBcIiYjMTYwO1wiIDogXCIgXCI7XG5cdFx0XHR9LFxuXG5cdFx0XHQvLyBFeHRyYSBjYW4gYmUgYSBudW1iZXIsIHNob3J0Y3V0IGZvciBpbmNyZWFzaW5nLWNhbGxpbmctZGVjcmVhc2luZ1xuXHRcdFx0aW5kZW50OiBmdW5jdGlvbiggZXh0cmEgKSB7XG5cdFx0XHRcdGlmICggIXRoaXMubXVsdGlsaW5lICkge1xuXHRcdFx0XHRcdHJldHVybiBcIlwiO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHZhciBjaHIgPSB0aGlzLmluZGVudENoYXI7XG5cdFx0XHRcdGlmICggdGhpcy5IVE1MICkge1xuXHRcdFx0XHRcdGNociA9IGNoci5yZXBsYWNlKCAvXFx0L2csIFwiICAgXCIgKS5yZXBsYWNlKCAvIC9nLCBcIiYjMTYwO1wiICk7XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuIG5ldyBBcnJheSggdGhpcy5kZXB0aCArICggZXh0cmEgfHwgMCApICkuam9pbiggY2hyICk7XG5cdFx0XHR9LFxuXHRcdFx0dXA6IGZ1bmN0aW9uKCBhICkge1xuXHRcdFx0XHR0aGlzLmRlcHRoICs9IGEgfHwgMTtcblx0XHRcdH0sXG5cdFx0XHRkb3duOiBmdW5jdGlvbiggYSApIHtcblx0XHRcdFx0dGhpcy5kZXB0aCAtPSBhIHx8IDE7XG5cdFx0XHR9LFxuXHRcdFx0c2V0UGFyc2VyOiBmdW5jdGlvbiggbmFtZSwgcGFyc2VyICkge1xuXHRcdFx0XHR0aGlzLnBhcnNlcnNbIG5hbWUgXSA9IHBhcnNlcjtcblx0XHRcdH0sXG5cblx0XHRcdC8vIFRoZSBuZXh0IDMgYXJlIGV4cG9zZWQgc28geW91IGNhbiB1c2UgdGhlbVxuXHRcdFx0cXVvdGU6IHF1b3RlLFxuXHRcdFx0bGl0ZXJhbDogbGl0ZXJhbCxcblx0XHRcdGpvaW46IGpvaW4sXG5cdFx0XHRkZXB0aDogMSxcblx0XHRcdG1heERlcHRoOiBRVW5pdC5jb25maWcubWF4RGVwdGgsXG5cblx0XHRcdC8vIFRoaXMgaXMgdGhlIGxpc3Qgb2YgcGFyc2VycywgdG8gbW9kaWZ5IHRoZW0sIHVzZSBkdW1wLnNldFBhcnNlclxuXHRcdFx0cGFyc2Vyczoge1xuXHRcdFx0XHR3aW5kb3c6IFwiW1dpbmRvd11cIixcblx0XHRcdFx0ZG9jdW1lbnQ6IFwiW0RvY3VtZW50XVwiLFxuXHRcdFx0XHRlcnJvcjogZnVuY3Rpb24oIGVycm9yICkge1xuXHRcdFx0XHRcdHJldHVybiBcIkVycm9yKFxcXCJcIiArIGVycm9yLm1lc3NhZ2UgKyBcIlxcXCIpXCI7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdHVua25vd246IFwiW1Vua25vd25dXCIsXG5cdFx0XHRcdFwibnVsbFwiOiBcIm51bGxcIixcblx0XHRcdFx0XCJ1bmRlZmluZWRcIjogXCJ1bmRlZmluZWRcIixcblx0XHRcdFx0XCJmdW5jdGlvblwiOiBmdW5jdGlvbiggZm4gKSB7XG5cdFx0XHRcdFx0dmFyIHJldCA9IFwiZnVuY3Rpb25cIixcblxuXHRcdFx0XHRcdFx0Ly8gRnVuY3Rpb25zIG5ldmVyIGhhdmUgbmFtZSBpbiBJRVxuXHRcdFx0XHRcdFx0bmFtZSA9IFwibmFtZVwiIGluIGZuID8gZm4ubmFtZSA6ICggcmVOYW1lLmV4ZWMoIGZuICkgfHwgW10gKVsgMSBdO1xuXG5cdFx0XHRcdFx0aWYgKCBuYW1lICkge1xuXHRcdFx0XHRcdFx0cmV0ICs9IFwiIFwiICsgbmFtZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0cmV0ICs9IFwiKFwiO1xuXG5cdFx0XHRcdFx0cmV0ID0gWyByZXQsIGR1bXAucGFyc2UoIGZuLCBcImZ1bmN0aW9uQXJnc1wiICksIFwiKXtcIiBdLmpvaW4oIFwiXCIgKTtcblx0XHRcdFx0XHRyZXR1cm4gam9pbiggcmV0LCBkdW1wLnBhcnNlKCBmbiwgXCJmdW5jdGlvbkNvZGVcIiApLCBcIn1cIiApO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRhcnJheTogYXJyYXksXG5cdFx0XHRcdG5vZGVsaXN0OiBhcnJheSxcblx0XHRcdFx0XCJhcmd1bWVudHNcIjogYXJyYXksXG5cdFx0XHRcdG9iamVjdDogZnVuY3Rpb24oIG1hcCwgc3RhY2sgKSB7XG5cdFx0XHRcdFx0dmFyIGtleXMsIGtleSwgdmFsLCBpLCBub25FbnVtZXJhYmxlUHJvcGVydGllcyxcblx0XHRcdFx0XHRcdHJldCA9IFtdO1xuXG5cdFx0XHRcdFx0aWYgKCBkdW1wLm1heERlcHRoICYmIGR1bXAuZGVwdGggPiBkdW1wLm1heERlcHRoICkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIFwiW29iamVjdCBPYmplY3RdXCI7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0ZHVtcC51cCgpO1xuXHRcdFx0XHRcdGtleXMgPSBbXTtcblx0XHRcdFx0XHRmb3IgKCBrZXkgaW4gbWFwICkge1xuXHRcdFx0XHRcdFx0a2V5cy5wdXNoKCBrZXkgKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHQvLyBTb21lIHByb3BlcnRpZXMgYXJlIG5vdCBhbHdheXMgZW51bWVyYWJsZSBvbiBFcnJvciBvYmplY3RzLlxuXHRcdFx0XHRcdG5vbkVudW1lcmFibGVQcm9wZXJ0aWVzID0gWyBcIm1lc3NhZ2VcIiwgXCJuYW1lXCIgXTtcblx0XHRcdFx0XHRmb3IgKCBpIGluIG5vbkVudW1lcmFibGVQcm9wZXJ0aWVzICkge1xuXHRcdFx0XHRcdFx0a2V5ID0gbm9uRW51bWVyYWJsZVByb3BlcnRpZXNbIGkgXTtcblx0XHRcdFx0XHRcdGlmICgga2V5IGluIG1hcCAmJiBpbkFycmF5KCBrZXksIGtleXMgKSA8IDAgKSB7XG5cdFx0XHRcdFx0XHRcdGtleXMucHVzaCgga2V5ICk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGtleXMuc29ydCgpO1xuXHRcdFx0XHRcdGZvciAoIGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7IGkrKyApIHtcblx0XHRcdFx0XHRcdGtleSA9IGtleXNbIGkgXTtcblx0XHRcdFx0XHRcdHZhbCA9IG1hcFsga2V5IF07XG5cdFx0XHRcdFx0XHRyZXQucHVzaCggZHVtcC5wYXJzZSgga2V5LCBcImtleVwiICkgKyBcIjogXCIgK1xuXHRcdFx0XHRcdFx0XHRkdW1wLnBhcnNlKCB2YWwsIHVuZGVmaW5lZCwgc3RhY2sgKSApO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRkdW1wLmRvd24oKTtcblx0XHRcdFx0XHRyZXR1cm4gam9pbiggXCJ7XCIsIHJldCwgXCJ9XCIgKTtcblx0XHRcdFx0fSxcblx0XHRcdFx0bm9kZTogZnVuY3Rpb24oIG5vZGUgKSB7XG5cdFx0XHRcdFx0dmFyIGxlbiwgaSwgdmFsLFxuXHRcdFx0XHRcdFx0b3BlbiA9IGR1bXAuSFRNTCA/IFwiJmx0O1wiIDogXCI8XCIsXG5cdFx0XHRcdFx0XHRjbG9zZSA9IGR1bXAuSFRNTCA/IFwiJmd0O1wiIDogXCI+XCIsXG5cdFx0XHRcdFx0XHR0YWcgPSBub2RlLm5vZGVOYW1lLnRvTG93ZXJDYXNlKCksXG5cdFx0XHRcdFx0XHRyZXQgPSBvcGVuICsgdGFnLFxuXHRcdFx0XHRcdFx0YXR0cnMgPSBub2RlLmF0dHJpYnV0ZXM7XG5cblx0XHRcdFx0XHRpZiAoIGF0dHJzICkge1xuXHRcdFx0XHRcdFx0Zm9yICggaSA9IDAsIGxlbiA9IGF0dHJzLmxlbmd0aDsgaSA8IGxlbjsgaSsrICkge1xuXHRcdFx0XHRcdFx0XHR2YWwgPSBhdHRyc1sgaSBdLm5vZGVWYWx1ZTtcblxuXHRcdFx0XHRcdFx0XHQvLyBJRTYgaW5jbHVkZXMgYWxsIGF0dHJpYnV0ZXMgaW4gLmF0dHJpYnV0ZXMsIGV2ZW4gb25lcyBub3QgZXhwbGljaXRseVxuXHRcdFx0XHRcdFx0XHQvLyBzZXQuIFRob3NlIGhhdmUgdmFsdWVzIGxpa2UgdW5kZWZpbmVkLCBudWxsLCAwLCBmYWxzZSwgXCJcIiBvclxuXHRcdFx0XHRcdFx0XHQvLyBcImluaGVyaXRcIi5cblx0XHRcdFx0XHRcdFx0aWYgKCB2YWwgJiYgdmFsICE9PSBcImluaGVyaXRcIiApIHtcblx0XHRcdFx0XHRcdFx0XHRyZXQgKz0gXCIgXCIgKyBhdHRyc1sgaSBdLm5vZGVOYW1lICsgXCI9XCIgK1xuXHRcdFx0XHRcdFx0XHRcdFx0ZHVtcC5wYXJzZSggdmFsLCBcImF0dHJpYnV0ZVwiICk7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0cmV0ICs9IGNsb3NlO1xuXG5cdFx0XHRcdFx0Ly8gU2hvdyBjb250ZW50IG9mIFRleHROb2RlIG9yIENEQVRBU2VjdGlvblxuXHRcdFx0XHRcdGlmICggbm9kZS5ub2RlVHlwZSA9PT0gMyB8fCBub2RlLm5vZGVUeXBlID09PSA0ICkge1xuXHRcdFx0XHRcdFx0cmV0ICs9IG5vZGUubm9kZVZhbHVlO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdHJldHVybiByZXQgKyBvcGVuICsgXCIvXCIgKyB0YWcgKyBjbG9zZTtcblx0XHRcdFx0fSxcblxuXHRcdFx0XHQvLyBGdW5jdGlvbiBjYWxscyBpdCBpbnRlcm5hbGx5LCBpdCdzIHRoZSBhcmd1bWVudHMgcGFydCBvZiB0aGUgZnVuY3Rpb25cblx0XHRcdFx0ZnVuY3Rpb25BcmdzOiBmdW5jdGlvbiggZm4gKSB7XG5cdFx0XHRcdFx0dmFyIGFyZ3MsXG5cdFx0XHRcdFx0XHRsID0gZm4ubGVuZ3RoO1xuXG5cdFx0XHRcdFx0aWYgKCAhbCApIHtcblx0XHRcdFx0XHRcdHJldHVybiBcIlwiO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGFyZ3MgPSBuZXcgQXJyYXkoIGwgKTtcblx0XHRcdFx0XHR3aGlsZSAoIGwtLSApIHtcblxuXHRcdFx0XHRcdFx0Ly8gOTcgaXMgJ2EnXG5cdFx0XHRcdFx0XHRhcmdzWyBsIF0gPSBTdHJpbmcuZnJvbUNoYXJDb2RlKCA5NyArIGwgKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0cmV0dXJuIFwiIFwiICsgYXJncy5qb2luKCBcIiwgXCIgKSArIFwiIFwiO1xuXHRcdFx0XHR9LFxuXG5cdFx0XHRcdC8vIE9iamVjdCBjYWxscyBpdCBpbnRlcm5hbGx5LCB0aGUga2V5IHBhcnQgb2YgYW4gaXRlbSBpbiBhIG1hcFxuXHRcdFx0XHRrZXk6IHF1b3RlLFxuXG5cdFx0XHRcdC8vIEZ1bmN0aW9uIGNhbGxzIGl0IGludGVybmFsbHksIGl0J3MgdGhlIGNvbnRlbnQgb2YgdGhlIGZ1bmN0aW9uXG5cdFx0XHRcdGZ1bmN0aW9uQ29kZTogXCJbY29kZV1cIixcblxuXHRcdFx0XHQvLyBOb2RlIGNhbGxzIGl0IGludGVybmFsbHksIGl0J3MgYSBodG1sIGF0dHJpYnV0ZSB2YWx1ZVxuXHRcdFx0XHRhdHRyaWJ1dGU6IHF1b3RlLFxuXHRcdFx0XHRzdHJpbmc6IHF1b3RlLFxuXHRcdFx0XHRkYXRlOiBxdW90ZSxcblx0XHRcdFx0cmVnZXhwOiBsaXRlcmFsLFxuXHRcdFx0XHRudW1iZXI6IGxpdGVyYWwsXG5cdFx0XHRcdFwiYm9vbGVhblwiOiBsaXRlcmFsXG5cdFx0XHR9LFxuXG5cdFx0XHQvLyBJZiB0cnVlLCBlbnRpdGllcyBhcmUgZXNjYXBlZCAoIDwsID4sIFxcdCwgc3BhY2UgYW5kIFxcbiApXG5cdFx0XHRIVE1MOiBmYWxzZSxcblxuXHRcdFx0Ly8gSW5kZW50YXRpb24gdW5pdFxuXHRcdFx0aW5kZW50Q2hhcjogXCIgIFwiLFxuXG5cdFx0XHQvLyBJZiB0cnVlLCBpdGVtcyBpbiBhIGNvbGxlY3Rpb24sIGFyZSBzZXBhcmF0ZWQgYnkgYSBcXG4sIGVsc2UganVzdCBhIHNwYWNlLlxuXHRcdFx0bXVsdGlsaW5lOiB0cnVlXG5cdFx0fTtcblxuXHRyZXR1cm4gZHVtcDtcbn0oKSApO1xuXG4vLyBCYWNrIGNvbXBhdFxuUVVuaXQuanNEdW1wID0gUVVuaXQuZHVtcDtcblxuLy8gRGVwcmVjYXRlZFxuLy8gRXh0ZW5kIGFzc2VydCBtZXRob2RzIHRvIFFVbml0IGZvciBCYWNrd2FyZHMgY29tcGF0aWJpbGl0eVxuKCBmdW5jdGlvbigpIHtcblx0dmFyIGksXG5cdFx0YXNzZXJ0aW9ucyA9IEFzc2VydC5wcm90b3R5cGU7XG5cblx0ZnVuY3Rpb24gYXBwbHlDdXJyZW50KCBjdXJyZW50ICkge1xuXHRcdHJldHVybiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBhc3NlcnQgPSBuZXcgQXNzZXJ0KCBRVW5pdC5jb25maWcuY3VycmVudCApO1xuXHRcdFx0Y3VycmVudC5hcHBseSggYXNzZXJ0LCBhcmd1bWVudHMgKTtcblx0XHR9O1xuXHR9XG5cblx0Zm9yICggaSBpbiBhc3NlcnRpb25zICkge1xuXHRcdFFVbml0WyBpIF0gPSBhcHBseUN1cnJlbnQoIGFzc2VydGlvbnNbIGkgXSApO1xuXHR9XG59KCkgKTtcblxuLy8gRm9yIGJyb3dzZXIsIGV4cG9ydCBvbmx5IHNlbGVjdCBnbG9iYWxzXG5pZiAoIGRlZmluZWQuZG9jdW1lbnQgKSB7XG5cblx0KCBmdW5jdGlvbigpIHtcblx0XHR2YXIgaSwgbCxcblx0XHRcdGtleXMgPSBbXG5cdFx0XHRcdFwidGVzdFwiLFxuXHRcdFx0XHRcIm1vZHVsZVwiLFxuXHRcdFx0XHRcImV4cGVjdFwiLFxuXHRcdFx0XHRcImFzeW5jVGVzdFwiLFxuXHRcdFx0XHRcInN0YXJ0XCIsXG5cdFx0XHRcdFwic3RvcFwiLFxuXHRcdFx0XHRcIm9rXCIsXG5cdFx0XHRcdFwibm90T2tcIixcblx0XHRcdFx0XCJlcXVhbFwiLFxuXHRcdFx0XHRcIm5vdEVxdWFsXCIsXG5cdFx0XHRcdFwicHJvcEVxdWFsXCIsXG5cdFx0XHRcdFwibm90UHJvcEVxdWFsXCIsXG5cdFx0XHRcdFwiZGVlcEVxdWFsXCIsXG5cdFx0XHRcdFwibm90RGVlcEVxdWFsXCIsXG5cdFx0XHRcdFwic3RyaWN0RXF1YWxcIixcblx0XHRcdFx0XCJub3RTdHJpY3RFcXVhbFwiLFxuXHRcdFx0XHRcInRocm93c1wiLFxuXHRcdFx0XHRcInJhaXNlc1wiXG5cdFx0XHRdO1xuXG5cdFx0Zm9yICggaSA9IDAsIGwgPSBrZXlzLmxlbmd0aDsgaSA8IGw7IGkrKyApIHtcblx0XHRcdHdpbmRvd1sga2V5c1sgaSBdIF0gPSBRVW5pdFsga2V5c1sgaSBdIF07XG5cdFx0fVxuXHR9KCkgKTtcblxuXHR3aW5kb3cuUVVuaXQgPSBRVW5pdDtcbn1cblxuLy8gRm9yIG5vZGVqc1xuaWYgKCB0eXBlb2YgbW9kdWxlICE9PSBcInVuZGVmaW5lZFwiICYmIG1vZHVsZSAmJiBtb2R1bGUuZXhwb3J0cyApIHtcblx0bW9kdWxlLmV4cG9ydHMgPSBRVW5pdDtcblxuXHQvLyBGb3IgY29uc2lzdGVuY3kgd2l0aCBDb21tb25KUyBlbnZpcm9ubWVudHMnIGV4cG9ydHNcblx0bW9kdWxlLmV4cG9ydHMuUVVuaXQgPSBRVW5pdDtcbn1cblxuLy8gRm9yIENvbW1vbkpTIHdpdGggZXhwb3J0cywgYnV0IHdpdGhvdXQgbW9kdWxlLmV4cG9ydHMsIGxpa2UgUmhpbm9cbmlmICggdHlwZW9mIGV4cG9ydHMgIT09IFwidW5kZWZpbmVkXCIgJiYgZXhwb3J0cyApIHtcblx0ZXhwb3J0cy5RVW5pdCA9IFFVbml0O1xufVxuXG5pZiAoIHR5cGVvZiBkZWZpbmUgPT09IFwiZnVuY3Rpb25cIiAmJiBkZWZpbmUuYW1kICkge1xuXHRkZWZpbmUoIGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiBRVW5pdDtcblx0fSApO1xuXHRRVW5pdC5jb25maWcuYXV0b3N0YXJ0ID0gZmFsc2U7XG59XG5cbi8vIEdldCBhIHJlZmVyZW5jZSB0byB0aGUgZ2xvYmFsIG9iamVjdCwgbGlrZSB3aW5kb3cgaW4gYnJvd3NlcnNcbn0oICggZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzO1xufSgpICkgKSApO1xuXG4oIGZ1bmN0aW9uKCkge1xuXG4vLyBPbmx5IGludGVyYWN0IHdpdGggVVJMcyB2aWEgd2luZG93LmxvY2F0aW9uXG52YXIgbG9jYXRpb24gPSB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiICYmIHdpbmRvdy5sb2NhdGlvbjtcbmlmICggIWxvY2F0aW9uICkge1xuXHRyZXR1cm47XG59XG5cbnZhciB1cmxQYXJhbXMgPSBnZXRVcmxQYXJhbXMoKTtcblxuUVVuaXQudXJsUGFyYW1zID0gdXJsUGFyYW1zO1xuXG4vLyBNYXRjaCBtb2R1bGUvdGVzdCBieSBpbmNsdXNpb24gaW4gYW4gYXJyYXlcblFVbml0LmNvbmZpZy5tb2R1bGVJZCA9IFtdLmNvbmNhdCggdXJsUGFyYW1zLm1vZHVsZUlkIHx8IFtdICk7XG5RVW5pdC5jb25maWcudGVzdElkID0gW10uY29uY2F0KCB1cmxQYXJhbXMudGVzdElkIHx8IFtdICk7XG5cbi8vIEV4YWN0IGNhc2UtaW5zZW5zaXRpdmUgbWF0Y2ggb2YgdGhlIG1vZHVsZSBuYW1lXG5RVW5pdC5jb25maWcubW9kdWxlID0gdXJsUGFyYW1zLm1vZHVsZTtcblxuLy8gUmVndWxhciBleHByZXNzaW9uIG9yIGNhc2UtaW5zZW5zdGl2ZSBzdWJzdHJpbmcgbWF0Y2ggYWdhaW5zdCBcIm1vZHVsZU5hbWU6IHRlc3ROYW1lXCJcblFVbml0LmNvbmZpZy5maWx0ZXIgPSB1cmxQYXJhbXMuZmlsdGVyO1xuXG4vLyBUZXN0IG9yZGVyIHJhbmRvbWl6YXRpb25cbmlmICggdXJsUGFyYW1zLnNlZWQgPT09IHRydWUgKSB7XG5cblx0Ly8gR2VuZXJhdGUgYSByYW5kb20gc2VlZCBpZiB0aGUgb3B0aW9uIGlzIHNwZWNpZmllZCB3aXRob3V0IGEgdmFsdWVcblx0UVVuaXQuY29uZmlnLnNlZWQgPSBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKCAzNiApLnNsaWNlKCAyICk7XG59IGVsc2UgaWYgKCB1cmxQYXJhbXMuc2VlZCApIHtcblx0UVVuaXQuY29uZmlnLnNlZWQgPSB1cmxQYXJhbXMuc2VlZDtcbn1cblxuLy8gQWRkIFVSTC1wYXJhbWV0ZXItbWFwcGVkIGNvbmZpZyB2YWx1ZXMgd2l0aCBVSSBmb3JtIHJlbmRlcmluZyBkYXRhXG5RVW5pdC5jb25maWcudXJsQ29uZmlnLnB1c2goXG5cdHtcblx0XHRpZDogXCJoaWRlcGFzc2VkXCIsXG5cdFx0bGFiZWw6IFwiSGlkZSBwYXNzZWQgdGVzdHNcIixcblx0XHR0b29sdGlwOiBcIk9ubHkgc2hvdyB0ZXN0cyBhbmQgYXNzZXJ0aW9ucyB0aGF0IGZhaWwuIFN0b3JlZCBhcyBxdWVyeS1zdHJpbmdzLlwiXG5cdH0sXG5cdHtcblx0XHRpZDogXCJub2dsb2JhbHNcIixcblx0XHRsYWJlbDogXCJDaGVjayBmb3IgR2xvYmFsc1wiLFxuXHRcdHRvb2x0aXA6IFwiRW5hYmxpbmcgdGhpcyB3aWxsIHRlc3QgaWYgYW55IHRlc3QgaW50cm9kdWNlcyBuZXcgcHJvcGVydGllcyBvbiB0aGUgXCIgK1xuXHRcdFx0XCJnbG9iYWwgb2JqZWN0IChgd2luZG93YCBpbiBCcm93c2VycykuIFN0b3JlZCBhcyBxdWVyeS1zdHJpbmdzLlwiXG5cdH0sXG5cdHtcblx0XHRpZDogXCJub3RyeWNhdGNoXCIsXG5cdFx0bGFiZWw6IFwiTm8gdHJ5LWNhdGNoXCIsXG5cdFx0dG9vbHRpcDogXCJFbmFibGluZyB0aGlzIHdpbGwgcnVuIHRlc3RzIG91dHNpZGUgb2YgYSB0cnktY2F0Y2ggYmxvY2suIE1ha2VzIGRlYnVnZ2luZyBcIiArXG5cdFx0XHRcImV4Y2VwdGlvbnMgaW4gSUUgcmVhc29uYWJsZS4gU3RvcmVkIGFzIHF1ZXJ5LXN0cmluZ3MuXCJcblx0fVxuKTtcblxuUVVuaXQuYmVnaW4oIGZ1bmN0aW9uKCkge1xuXHR2YXIgaSwgb3B0aW9uLFxuXHRcdHVybENvbmZpZyA9IFFVbml0LmNvbmZpZy51cmxDb25maWc7XG5cblx0Zm9yICggaSA9IDA7IGkgPCB1cmxDb25maWcubGVuZ3RoOyBpKysgKSB7XG5cblx0XHQvLyBPcHRpb25zIGNhbiBiZSBlaXRoZXIgc3RyaW5ncyBvciBvYmplY3RzIHdpdGggbm9uZW1wdHkgXCJpZFwiIHByb3BlcnRpZXNcblx0XHRvcHRpb24gPSBRVW5pdC5jb25maWcudXJsQ29uZmlnWyBpIF07XG5cdFx0aWYgKCB0eXBlb2Ygb3B0aW9uICE9PSBcInN0cmluZ1wiICkge1xuXHRcdFx0b3B0aW9uID0gb3B0aW9uLmlkO1xuXHRcdH1cblxuXHRcdGlmICggUVVuaXQuY29uZmlnWyBvcHRpb24gXSA9PT0gdW5kZWZpbmVkICkge1xuXHRcdFx0UVVuaXQuY29uZmlnWyBvcHRpb24gXSA9IHVybFBhcmFtc1sgb3B0aW9uIF07XG5cdFx0fVxuXHR9XG59ICk7XG5cbmZ1bmN0aW9uIGdldFVybFBhcmFtcygpIHtcblx0dmFyIGksIHBhcmFtLCBuYW1lLCB2YWx1ZTtcblx0dmFyIHVybFBhcmFtcyA9IHt9O1xuXHR2YXIgcGFyYW1zID0gbG9jYXRpb24uc2VhcmNoLnNsaWNlKCAxICkuc3BsaXQoIFwiJlwiICk7XG5cdHZhciBsZW5ndGggPSBwYXJhbXMubGVuZ3RoO1xuXG5cdGZvciAoIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKysgKSB7XG5cdFx0aWYgKCBwYXJhbXNbIGkgXSApIHtcblx0XHRcdHBhcmFtID0gcGFyYW1zWyBpIF0uc3BsaXQoIFwiPVwiICk7XG5cdFx0XHRuYW1lID0gZGVjb2RlVVJJQ29tcG9uZW50KCBwYXJhbVsgMCBdICk7XG5cblx0XHRcdC8vIEFsbG93IGp1c3QgYSBrZXkgdG8gdHVybiBvbiBhIGZsYWcsIGUuZy4sIHRlc3QuaHRtbD9ub2dsb2JhbHNcblx0XHRcdHZhbHVlID0gcGFyYW0ubGVuZ3RoID09PSAxIHx8XG5cdFx0XHRcdGRlY29kZVVSSUNvbXBvbmVudCggcGFyYW0uc2xpY2UoIDEgKS5qb2luKCBcIj1cIiApICkgO1xuXHRcdFx0aWYgKCB1cmxQYXJhbXNbIG5hbWUgXSApIHtcblx0XHRcdFx0dXJsUGFyYW1zWyBuYW1lIF0gPSBbXS5jb25jYXQoIHVybFBhcmFtc1sgbmFtZSBdLCB2YWx1ZSApO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dXJsUGFyYW1zWyBuYW1lIF0gPSB2YWx1ZTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gdXJsUGFyYW1zO1xufVxuXG4vLyBEb24ndCBsb2FkIHRoZSBIVE1MIFJlcG9ydGVyIG9uIG5vbi1icm93c2VyIGVudmlyb25tZW50c1xuaWYgKCB0eXBlb2Ygd2luZG93ID09PSBcInVuZGVmaW5lZFwiIHx8ICF3aW5kb3cuZG9jdW1lbnQgKSB7XG5cdHJldHVybjtcbn1cblxuLy8gRGVwcmVjYXRlZCBRVW5pdC5pbml0IC0gUmVmICM1MzBcbi8vIFJlLWluaXRpYWxpemUgdGhlIGNvbmZpZ3VyYXRpb24gb3B0aW9uc1xuUVVuaXQuaW5pdCA9IGZ1bmN0aW9uKCkge1xuXHR2YXIgY29uZmlnID0gUVVuaXQuY29uZmlnO1xuXG5cdGNvbmZpZy5zdGF0cyA9IHsgYWxsOiAwLCBiYWQ6IDAgfTtcblx0Y29uZmlnLm1vZHVsZVN0YXRzID0geyBhbGw6IDAsIGJhZDogMCB9O1xuXHRjb25maWcuc3RhcnRlZCA9IDA7XG5cdGNvbmZpZy51cGRhdGVSYXRlID0gMTAwMDtcblx0Y29uZmlnLmJsb2NraW5nID0gZmFsc2U7XG5cdGNvbmZpZy5hdXRvc3RhcnQgPSB0cnVlO1xuXHRjb25maWcuYXV0b3J1biA9IGZhbHNlO1xuXHRjb25maWcuZmlsdGVyID0gXCJcIjtcblx0Y29uZmlnLnF1ZXVlID0gW107XG5cblx0YXBwZW5kSW50ZXJmYWNlKCk7XG59O1xuXG52YXIgY29uZmlnID0gUVVuaXQuY29uZmlnLFxuXHRkb2N1bWVudCA9IHdpbmRvdy5kb2N1bWVudCxcblx0Y29sbGFwc2VOZXh0ID0gZmFsc2UsXG5cdGhhc093biA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHksXG5cdHVuZmlsdGVyZWRVcmwgPSBzZXRVcmwoIHsgZmlsdGVyOiB1bmRlZmluZWQsIG1vZHVsZTogdW5kZWZpbmVkLFxuXHRcdG1vZHVsZUlkOiB1bmRlZmluZWQsIHRlc3RJZDogdW5kZWZpbmVkIH0gKSxcblx0ZGVmaW5lZCA9IHtcblx0XHRzZXNzaW9uU3RvcmFnZTogKCBmdW5jdGlvbigpIHtcblx0XHRcdHZhciB4ID0gXCJxdW5pdC10ZXN0LXN0cmluZ1wiO1xuXHRcdFx0dHJ5IHtcblx0XHRcdFx0c2Vzc2lvblN0b3JhZ2Uuc2V0SXRlbSggeCwgeCApO1xuXHRcdFx0XHRzZXNzaW9uU3RvcmFnZS5yZW1vdmVJdGVtKCB4ICk7XG5cdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0fSBjYXRjaCAoIGUgKSB7XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdH1cblx0XHR9KCkgKVxuXHR9LFxuXHRtb2R1bGVzTGlzdCA9IFtdO1xuXG4vKipcbiogRXNjYXBlIHRleHQgZm9yIGF0dHJpYnV0ZSBvciB0ZXh0IGNvbnRlbnQuXG4qL1xuZnVuY3Rpb24gZXNjYXBlVGV4dCggcyApIHtcblx0aWYgKCAhcyApIHtcblx0XHRyZXR1cm4gXCJcIjtcblx0fVxuXHRzID0gcyArIFwiXCI7XG5cblx0Ly8gQm90aCBzaW5nbGUgcXVvdGVzIGFuZCBkb3VibGUgcXVvdGVzIChmb3IgYXR0cmlidXRlcylcblx0cmV0dXJuIHMucmVwbGFjZSggL1snXCI8PiZdL2csIGZ1bmN0aW9uKCBzICkge1xuXHRcdHN3aXRjaCAoIHMgKSB7XG5cdFx0Y2FzZSBcIidcIjpcblx0XHRcdHJldHVybiBcIiYjMDM5O1wiO1xuXHRcdGNhc2UgXCJcXFwiXCI6XG5cdFx0XHRyZXR1cm4gXCImcXVvdDtcIjtcblx0XHRjYXNlIFwiPFwiOlxuXHRcdFx0cmV0dXJuIFwiJmx0O1wiO1xuXHRcdGNhc2UgXCI+XCI6XG5cdFx0XHRyZXR1cm4gXCImZ3Q7XCI7XG5cdFx0Y2FzZSBcIiZcIjpcblx0XHRcdHJldHVybiBcIiZhbXA7XCI7XG5cdFx0fVxuXHR9ICk7XG59XG5cbi8qKlxuICogQHBhcmFtIHtIVE1MRWxlbWVudH0gZWxlbVxuICogQHBhcmFtIHtzdHJpbmd9IHR5cGVcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gKi9cbmZ1bmN0aW9uIGFkZEV2ZW50KCBlbGVtLCB0eXBlLCBmbiApIHtcblx0aWYgKCBlbGVtLmFkZEV2ZW50TGlzdGVuZXIgKSB7XG5cblx0XHQvLyBTdGFuZGFyZHMtYmFzZWQgYnJvd3NlcnNcblx0XHRlbGVtLmFkZEV2ZW50TGlzdGVuZXIoIHR5cGUsIGZuLCBmYWxzZSApO1xuXHR9IGVsc2UgaWYgKCBlbGVtLmF0dGFjaEV2ZW50ICkge1xuXG5cdFx0Ly8gU3VwcG9ydDogSUUgPDlcblx0XHRlbGVtLmF0dGFjaEV2ZW50KCBcIm9uXCIgKyB0eXBlLCBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBldmVudCA9IHdpbmRvdy5ldmVudDtcblx0XHRcdGlmICggIWV2ZW50LnRhcmdldCApIHtcblx0XHRcdFx0ZXZlbnQudGFyZ2V0ID0gZXZlbnQuc3JjRWxlbWVudCB8fCBkb2N1bWVudDtcblx0XHRcdH1cblxuXHRcdFx0Zm4uY2FsbCggZWxlbSwgZXZlbnQgKTtcblx0XHR9ICk7XG5cdH1cbn1cblxuLyoqXG4gKiBAcGFyYW0ge0FycmF5fE5vZGVMaXN0fSBlbGVtc1xuICogQHBhcmFtIHtzdHJpbmd9IHR5cGVcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gKi9cbmZ1bmN0aW9uIGFkZEV2ZW50cyggZWxlbXMsIHR5cGUsIGZuICkge1xuXHR2YXIgaSA9IGVsZW1zLmxlbmd0aDtcblx0d2hpbGUgKCBpLS0gKSB7XG5cdFx0YWRkRXZlbnQoIGVsZW1zWyBpIF0sIHR5cGUsIGZuICk7XG5cdH1cbn1cblxuZnVuY3Rpb24gaGFzQ2xhc3MoIGVsZW0sIG5hbWUgKSB7XG5cdHJldHVybiAoIFwiIFwiICsgZWxlbS5jbGFzc05hbWUgKyBcIiBcIiApLmluZGV4T2YoIFwiIFwiICsgbmFtZSArIFwiIFwiICkgPj0gMDtcbn1cblxuZnVuY3Rpb24gYWRkQ2xhc3MoIGVsZW0sIG5hbWUgKSB7XG5cdGlmICggIWhhc0NsYXNzKCBlbGVtLCBuYW1lICkgKSB7XG5cdFx0ZWxlbS5jbGFzc05hbWUgKz0gKCBlbGVtLmNsYXNzTmFtZSA/IFwiIFwiIDogXCJcIiApICsgbmFtZTtcblx0fVxufVxuXG5mdW5jdGlvbiB0b2dnbGVDbGFzcyggZWxlbSwgbmFtZSwgZm9yY2UgKSB7XG5cdGlmICggZm9yY2UgfHwgdHlwZW9mIGZvcmNlID09PSBcInVuZGVmaW5lZFwiICYmICFoYXNDbGFzcyggZWxlbSwgbmFtZSApICkge1xuXHRcdGFkZENsYXNzKCBlbGVtLCBuYW1lICk7XG5cdH0gZWxzZSB7XG5cdFx0cmVtb3ZlQ2xhc3MoIGVsZW0sIG5hbWUgKTtcblx0fVxufVxuXG5mdW5jdGlvbiByZW1vdmVDbGFzcyggZWxlbSwgbmFtZSApIHtcblx0dmFyIHNldCA9IFwiIFwiICsgZWxlbS5jbGFzc05hbWUgKyBcIiBcIjtcblxuXHQvLyBDbGFzcyBuYW1lIG1heSBhcHBlYXIgbXVsdGlwbGUgdGltZXNcblx0d2hpbGUgKCBzZXQuaW5kZXhPZiggXCIgXCIgKyBuYW1lICsgXCIgXCIgKSA+PSAwICkge1xuXHRcdHNldCA9IHNldC5yZXBsYWNlKCBcIiBcIiArIG5hbWUgKyBcIiBcIiwgXCIgXCIgKTtcblx0fVxuXG5cdC8vIFRyaW0gZm9yIHByZXR0aW5lc3Ncblx0ZWxlbS5jbGFzc05hbWUgPSB0eXBlb2Ygc2V0LnRyaW0gPT09IFwiZnVuY3Rpb25cIiA/IHNldC50cmltKCkgOiBzZXQucmVwbGFjZSggL15cXHMrfFxccyskL2csIFwiXCIgKTtcbn1cblxuZnVuY3Rpb24gaWQoIG5hbWUgKSB7XG5cdHJldHVybiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCAmJiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCggbmFtZSApO1xufVxuXG5mdW5jdGlvbiBnZXRVcmxDb25maWdIdG1sKCkge1xuXHR2YXIgaSwgaiwgdmFsLFxuXHRcdGVzY2FwZWQsIGVzY2FwZWRUb29sdGlwLFxuXHRcdHNlbGVjdGlvbiA9IGZhbHNlLFxuXHRcdHVybENvbmZpZyA9IGNvbmZpZy51cmxDb25maWcsXG5cdFx0dXJsQ29uZmlnSHRtbCA9IFwiXCI7XG5cblx0Zm9yICggaSA9IDA7IGkgPCB1cmxDb25maWcubGVuZ3RoOyBpKysgKSB7XG5cblx0XHQvLyBPcHRpb25zIGNhbiBiZSBlaXRoZXIgc3RyaW5ncyBvciBvYmplY3RzIHdpdGggbm9uZW1wdHkgXCJpZFwiIHByb3BlcnRpZXNcblx0XHR2YWwgPSBjb25maWcudXJsQ29uZmlnWyBpIF07XG5cdFx0aWYgKCB0eXBlb2YgdmFsID09PSBcInN0cmluZ1wiICkge1xuXHRcdFx0dmFsID0ge1xuXHRcdFx0XHRpZDogdmFsLFxuXHRcdFx0XHRsYWJlbDogdmFsXG5cdFx0XHR9O1xuXHRcdH1cblxuXHRcdGVzY2FwZWQgPSBlc2NhcGVUZXh0KCB2YWwuaWQgKTtcblx0XHRlc2NhcGVkVG9vbHRpcCA9IGVzY2FwZVRleHQoIHZhbC50b29sdGlwICk7XG5cblx0XHRpZiAoICF2YWwudmFsdWUgfHwgdHlwZW9mIHZhbC52YWx1ZSA9PT0gXCJzdHJpbmdcIiApIHtcblx0XHRcdHVybENvbmZpZ0h0bWwgKz0gXCI8aW5wdXQgaWQ9J3F1bml0LXVybGNvbmZpZy1cIiArIGVzY2FwZWQgK1xuXHRcdFx0XHRcIicgbmFtZT0nXCIgKyBlc2NhcGVkICsgXCInIHR5cGU9J2NoZWNrYm94J1wiICtcblx0XHRcdFx0KCB2YWwudmFsdWUgPyBcIiB2YWx1ZT0nXCIgKyBlc2NhcGVUZXh0KCB2YWwudmFsdWUgKSArIFwiJ1wiIDogXCJcIiApICtcblx0XHRcdFx0KCBjb25maWdbIHZhbC5pZCBdID8gXCIgY2hlY2tlZD0nY2hlY2tlZCdcIiA6IFwiXCIgKSArXG5cdFx0XHRcdFwiIHRpdGxlPSdcIiArIGVzY2FwZWRUb29sdGlwICsgXCInIC8+PGxhYmVsIGZvcj0ncXVuaXQtdXJsY29uZmlnLVwiICsgZXNjYXBlZCArXG5cdFx0XHRcdFwiJyB0aXRsZT0nXCIgKyBlc2NhcGVkVG9vbHRpcCArIFwiJz5cIiArIHZhbC5sYWJlbCArIFwiPC9sYWJlbD5cIjtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dXJsQ29uZmlnSHRtbCArPSBcIjxsYWJlbCBmb3I9J3F1bml0LXVybGNvbmZpZy1cIiArIGVzY2FwZWQgK1xuXHRcdFx0XHRcIicgdGl0bGU9J1wiICsgZXNjYXBlZFRvb2x0aXAgKyBcIic+XCIgKyB2YWwubGFiZWwgK1xuXHRcdFx0XHRcIjogPC9sYWJlbD48c2VsZWN0IGlkPSdxdW5pdC11cmxjb25maWctXCIgKyBlc2NhcGVkICtcblx0XHRcdFx0XCInIG5hbWU9J1wiICsgZXNjYXBlZCArIFwiJyB0aXRsZT0nXCIgKyBlc2NhcGVkVG9vbHRpcCArIFwiJz48b3B0aW9uPjwvb3B0aW9uPlwiO1xuXG5cdFx0XHRpZiAoIFFVbml0LmlzKCBcImFycmF5XCIsIHZhbC52YWx1ZSApICkge1xuXHRcdFx0XHRmb3IgKCBqID0gMDsgaiA8IHZhbC52YWx1ZS5sZW5ndGg7IGorKyApIHtcblx0XHRcdFx0XHRlc2NhcGVkID0gZXNjYXBlVGV4dCggdmFsLnZhbHVlWyBqIF0gKTtcblx0XHRcdFx0XHR1cmxDb25maWdIdG1sICs9IFwiPG9wdGlvbiB2YWx1ZT0nXCIgKyBlc2NhcGVkICsgXCInXCIgK1xuXHRcdFx0XHRcdFx0KCBjb25maWdbIHZhbC5pZCBdID09PSB2YWwudmFsdWVbIGogXSA/XG5cdFx0XHRcdFx0XHRcdCggc2VsZWN0aW9uID0gdHJ1ZSApICYmIFwiIHNlbGVjdGVkPSdzZWxlY3RlZCdcIiA6IFwiXCIgKSArXG5cdFx0XHRcdFx0XHRcIj5cIiArIGVzY2FwZWQgKyBcIjwvb3B0aW9uPlwiO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRmb3IgKCBqIGluIHZhbC52YWx1ZSApIHtcblx0XHRcdFx0XHRpZiAoIGhhc093bi5jYWxsKCB2YWwudmFsdWUsIGogKSApIHtcblx0XHRcdFx0XHRcdHVybENvbmZpZ0h0bWwgKz0gXCI8b3B0aW9uIHZhbHVlPSdcIiArIGVzY2FwZVRleHQoIGogKSArIFwiJ1wiICtcblx0XHRcdFx0XHRcdFx0KCBjb25maWdbIHZhbC5pZCBdID09PSBqID9cblx0XHRcdFx0XHRcdFx0XHQoIHNlbGVjdGlvbiA9IHRydWUgKSAmJiBcIiBzZWxlY3RlZD0nc2VsZWN0ZWQnXCIgOiBcIlwiICkgK1xuXHRcdFx0XHRcdFx0XHRcIj5cIiArIGVzY2FwZVRleHQoIHZhbC52YWx1ZVsgaiBdICkgKyBcIjwvb3B0aW9uPlwiO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0aWYgKCBjb25maWdbIHZhbC5pZCBdICYmICFzZWxlY3Rpb24gKSB7XG5cdFx0XHRcdGVzY2FwZWQgPSBlc2NhcGVUZXh0KCBjb25maWdbIHZhbC5pZCBdICk7XG5cdFx0XHRcdHVybENvbmZpZ0h0bWwgKz0gXCI8b3B0aW9uIHZhbHVlPSdcIiArIGVzY2FwZWQgK1xuXHRcdFx0XHRcdFwiJyBzZWxlY3RlZD0nc2VsZWN0ZWQnIGRpc2FibGVkPSdkaXNhYmxlZCc+XCIgKyBlc2NhcGVkICsgXCI8L29wdGlvbj5cIjtcblx0XHRcdH1cblx0XHRcdHVybENvbmZpZ0h0bWwgKz0gXCI8L3NlbGVjdD5cIjtcblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gdXJsQ29uZmlnSHRtbDtcbn1cblxuLy8gSGFuZGxlIFwiY2xpY2tcIiBldmVudHMgb24gdG9vbGJhciBjaGVja2JveGVzIGFuZCBcImNoYW5nZVwiIGZvciBzZWxlY3QgbWVudXMuXG4vLyBVcGRhdGVzIHRoZSBVUkwgd2l0aCB0aGUgbmV3IHN0YXRlIG9mIGBjb25maWcudXJsQ29uZmlnYCB2YWx1ZXMuXG5mdW5jdGlvbiB0b29sYmFyQ2hhbmdlZCgpIHtcblx0dmFyIHVwZGF0ZWRVcmwsIHZhbHVlLCB0ZXN0cyxcblx0XHRmaWVsZCA9IHRoaXMsXG5cdFx0cGFyYW1zID0ge307XG5cblx0Ly8gRGV0ZWN0IGlmIGZpZWxkIGlzIGEgc2VsZWN0IG1lbnUgb3IgYSBjaGVja2JveFxuXHRpZiAoIFwic2VsZWN0ZWRJbmRleFwiIGluIGZpZWxkICkge1xuXHRcdHZhbHVlID0gZmllbGQub3B0aW9uc1sgZmllbGQuc2VsZWN0ZWRJbmRleCBdLnZhbHVlIHx8IHVuZGVmaW5lZDtcblx0fSBlbHNlIHtcblx0XHR2YWx1ZSA9IGZpZWxkLmNoZWNrZWQgPyAoIGZpZWxkLmRlZmF1bHRWYWx1ZSB8fCB0cnVlICkgOiB1bmRlZmluZWQ7XG5cdH1cblxuXHRwYXJhbXNbIGZpZWxkLm5hbWUgXSA9IHZhbHVlO1xuXHR1cGRhdGVkVXJsID0gc2V0VXJsKCBwYXJhbXMgKTtcblxuXHQvLyBDaGVjayBpZiB3ZSBjYW4gYXBwbHkgdGhlIGNoYW5nZSB3aXRob3V0IGEgcGFnZSByZWZyZXNoXG5cdGlmICggXCJoaWRlcGFzc2VkXCIgPT09IGZpZWxkLm5hbWUgJiYgXCJyZXBsYWNlU3RhdGVcIiBpbiB3aW5kb3cuaGlzdG9yeSApIHtcblx0XHRRVW5pdC51cmxQYXJhbXNbIGZpZWxkLm5hbWUgXSA9IHZhbHVlO1xuXHRcdGNvbmZpZ1sgZmllbGQubmFtZSBdID0gdmFsdWUgfHwgZmFsc2U7XG5cdFx0dGVzdHMgPSBpZCggXCJxdW5pdC10ZXN0c1wiICk7XG5cdFx0aWYgKCB0ZXN0cyApIHtcblx0XHRcdHRvZ2dsZUNsYXNzKCB0ZXN0cywgXCJoaWRlcGFzc1wiLCB2YWx1ZSB8fCBmYWxzZSApO1xuXHRcdH1cblx0XHR3aW5kb3cuaGlzdG9yeS5yZXBsYWNlU3RhdGUoIG51bGwsIFwiXCIsIHVwZGF0ZWRVcmwgKTtcblx0fSBlbHNlIHtcblx0XHR3aW5kb3cubG9jYXRpb24gPSB1cGRhdGVkVXJsO1xuXHR9XG59XG5cbmZ1bmN0aW9uIHNldFVybCggcGFyYW1zICkge1xuXHR2YXIga2V5LCBhcnJWYWx1ZSwgaSxcblx0XHRxdWVyeXN0cmluZyA9IFwiP1wiLFxuXHRcdGxvY2F0aW9uID0gd2luZG93LmxvY2F0aW9uO1xuXG5cdHBhcmFtcyA9IFFVbml0LmV4dGVuZCggUVVuaXQuZXh0ZW5kKCB7fSwgUVVuaXQudXJsUGFyYW1zICksIHBhcmFtcyApO1xuXG5cdGZvciAoIGtleSBpbiBwYXJhbXMgKSB7XG5cblx0XHQvLyBTa2lwIGluaGVyaXRlZCBvciB1bmRlZmluZWQgcHJvcGVydGllc1xuXHRcdGlmICggaGFzT3duLmNhbGwoIHBhcmFtcywga2V5ICkgJiYgcGFyYW1zWyBrZXkgXSAhPT0gdW5kZWZpbmVkICkge1xuXG5cdFx0XHQvLyBPdXRwdXQgYSBwYXJhbWV0ZXIgZm9yIGVhY2ggdmFsdWUgb2YgdGhpcyBrZXkgKGJ1dCB1c3VhbGx5IGp1c3Qgb25lKVxuXHRcdFx0YXJyVmFsdWUgPSBbXS5jb25jYXQoIHBhcmFtc1sga2V5IF0gKTtcblx0XHRcdGZvciAoIGkgPSAwOyBpIDwgYXJyVmFsdWUubGVuZ3RoOyBpKysgKSB7XG5cdFx0XHRcdHF1ZXJ5c3RyaW5nICs9IGVuY29kZVVSSUNvbXBvbmVudCgga2V5ICk7XG5cdFx0XHRcdGlmICggYXJyVmFsdWVbIGkgXSAhPT0gdHJ1ZSApIHtcblx0XHRcdFx0XHRxdWVyeXN0cmluZyArPSBcIj1cIiArIGVuY29kZVVSSUNvbXBvbmVudCggYXJyVmFsdWVbIGkgXSApO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHF1ZXJ5c3RyaW5nICs9IFwiJlwiO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXHRyZXR1cm4gbG9jYXRpb24ucHJvdG9jb2wgKyBcIi8vXCIgKyBsb2NhdGlvbi5ob3N0ICtcblx0XHRsb2NhdGlvbi5wYXRobmFtZSArIHF1ZXJ5c3RyaW5nLnNsaWNlKCAwLCAtMSApO1xufVxuXG5mdW5jdGlvbiBhcHBseVVybFBhcmFtcygpIHtcblx0dmFyIHNlbGVjdGVkTW9kdWxlLFxuXHRcdG1vZHVsZXNMaXN0ID0gaWQoIFwicXVuaXQtbW9kdWxlZmlsdGVyXCIgKSxcblx0XHRmaWx0ZXIgPSBpZCggXCJxdW5pdC1maWx0ZXItaW5wdXRcIiApLnZhbHVlO1xuXG5cdHNlbGVjdGVkTW9kdWxlID0gbW9kdWxlc0xpc3QgP1xuXHRcdGRlY29kZVVSSUNvbXBvbmVudCggbW9kdWxlc0xpc3Qub3B0aW9uc1sgbW9kdWxlc0xpc3Quc2VsZWN0ZWRJbmRleCBdLnZhbHVlICkgOlxuXHRcdHVuZGVmaW5lZDtcblxuXHR3aW5kb3cubG9jYXRpb24gPSBzZXRVcmwoIHtcblx0XHRtb2R1bGU6ICggc2VsZWN0ZWRNb2R1bGUgPT09IFwiXCIgKSA/IHVuZGVmaW5lZCA6IHNlbGVjdGVkTW9kdWxlLFxuXHRcdGZpbHRlcjogKCBmaWx0ZXIgPT09IFwiXCIgKSA/IHVuZGVmaW5lZCA6IGZpbHRlcixcblxuXHRcdC8vIFJlbW92ZSBtb2R1bGVJZCBhbmQgdGVzdElkIGZpbHRlcnNcblx0XHRtb2R1bGVJZDogdW5kZWZpbmVkLFxuXHRcdHRlc3RJZDogdW5kZWZpbmVkXG5cdH0gKTtcbn1cblxuZnVuY3Rpb24gdG9vbGJhclVybENvbmZpZ0NvbnRhaW5lcigpIHtcblx0dmFyIHVybENvbmZpZ0NvbnRhaW5lciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoIFwic3BhblwiICk7XG5cblx0dXJsQ29uZmlnQ29udGFpbmVyLmlubmVySFRNTCA9IGdldFVybENvbmZpZ0h0bWwoKTtcblx0YWRkQ2xhc3MoIHVybENvbmZpZ0NvbnRhaW5lciwgXCJxdW5pdC11cmwtY29uZmlnXCIgKTtcblxuXHQvLyBGb3Igb2xkSUUgc3VwcG9ydDpcblx0Ly8gKiBBZGQgaGFuZGxlcnMgdG8gdGhlIGluZGl2aWR1YWwgZWxlbWVudHMgaW5zdGVhZCBvZiB0aGUgY29udGFpbmVyXG5cdC8vICogVXNlIFwiY2xpY2tcIiBpbnN0ZWFkIG9mIFwiY2hhbmdlXCIgZm9yIGNoZWNrYm94ZXNcblx0YWRkRXZlbnRzKCB1cmxDb25maWdDb250YWluZXIuZ2V0RWxlbWVudHNCeVRhZ05hbWUoIFwiaW5wdXRcIiApLCBcImNsaWNrXCIsIHRvb2xiYXJDaGFuZ2VkICk7XG5cdGFkZEV2ZW50cyggdXJsQ29uZmlnQ29udGFpbmVyLmdldEVsZW1lbnRzQnlUYWdOYW1lKCBcInNlbGVjdFwiICksIFwiY2hhbmdlXCIsIHRvb2xiYXJDaGFuZ2VkICk7XG5cblx0cmV0dXJuIHVybENvbmZpZ0NvbnRhaW5lcjtcbn1cblxuZnVuY3Rpb24gdG9vbGJhckxvb3NlRmlsdGVyKCkge1xuXHR2YXIgZmlsdGVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCggXCJmb3JtXCIgKSxcblx0XHRsYWJlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoIFwibGFiZWxcIiApLFxuXHRcdGlucHV0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCggXCJpbnB1dFwiICksXG5cdFx0YnV0dG9uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCggXCJidXR0b25cIiApO1xuXG5cdGFkZENsYXNzKCBmaWx0ZXIsIFwicXVuaXQtZmlsdGVyXCIgKTtcblxuXHRsYWJlbC5pbm5lckhUTUwgPSBcIkZpbHRlcjogXCI7XG5cblx0aW5wdXQudHlwZSA9IFwidGV4dFwiO1xuXHRpbnB1dC52YWx1ZSA9IGNvbmZpZy5maWx0ZXIgfHwgXCJcIjtcblx0aW5wdXQubmFtZSA9IFwiZmlsdGVyXCI7XG5cdGlucHV0LmlkID0gXCJxdW5pdC1maWx0ZXItaW5wdXRcIjtcblxuXHRidXR0b24uaW5uZXJIVE1MID0gXCJHb1wiO1xuXG5cdGxhYmVsLmFwcGVuZENoaWxkKCBpbnB1dCApO1xuXG5cdGZpbHRlci5hcHBlbmRDaGlsZCggbGFiZWwgKTtcblx0ZmlsdGVyLmFwcGVuZENoaWxkKCBidXR0b24gKTtcblx0YWRkRXZlbnQoIGZpbHRlciwgXCJzdWJtaXRcIiwgZnVuY3Rpb24oIGV2ICkge1xuXHRcdGFwcGx5VXJsUGFyYW1zKCk7XG5cblx0XHRpZiAoIGV2ICYmIGV2LnByZXZlbnREZWZhdWx0ICkge1xuXHRcdFx0ZXYucHJldmVudERlZmF1bHQoKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gZmFsc2U7XG5cdH0gKTtcblxuXHRyZXR1cm4gZmlsdGVyO1xufVxuXG5mdW5jdGlvbiB0b29sYmFyTW9kdWxlRmlsdGVySHRtbCgpIHtcblx0dmFyIGksXG5cdFx0bW9kdWxlRmlsdGVySHRtbCA9IFwiXCI7XG5cblx0aWYgKCAhbW9kdWxlc0xpc3QubGVuZ3RoICkge1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXG5cdG1vZHVsZUZpbHRlckh0bWwgKz0gXCI8bGFiZWwgZm9yPSdxdW5pdC1tb2R1bGVmaWx0ZXInPk1vZHVsZTogPC9sYWJlbD5cIiArXG5cdFx0XCI8c2VsZWN0IGlkPSdxdW5pdC1tb2R1bGVmaWx0ZXInIG5hbWU9J21vZHVsZWZpbHRlcic+PG9wdGlvbiB2YWx1ZT0nJyBcIiArXG5cdFx0KCBRVW5pdC51cmxQYXJhbXMubW9kdWxlID09PSB1bmRlZmluZWQgPyBcInNlbGVjdGVkPSdzZWxlY3RlZCdcIiA6IFwiXCIgKSArXG5cdFx0XCI+PCBBbGwgTW9kdWxlcyA+PC9vcHRpb24+XCI7XG5cblx0Zm9yICggaSA9IDA7IGkgPCBtb2R1bGVzTGlzdC5sZW5ndGg7IGkrKyApIHtcblx0XHRtb2R1bGVGaWx0ZXJIdG1sICs9IFwiPG9wdGlvbiB2YWx1ZT0nXCIgK1xuXHRcdFx0ZXNjYXBlVGV4dCggZW5jb2RlVVJJQ29tcG9uZW50KCBtb2R1bGVzTGlzdFsgaSBdICkgKSArIFwiJyBcIiArXG5cdFx0XHQoIFFVbml0LnVybFBhcmFtcy5tb2R1bGUgPT09IG1vZHVsZXNMaXN0WyBpIF0gPyBcInNlbGVjdGVkPSdzZWxlY3RlZCdcIiA6IFwiXCIgKSArXG5cdFx0XHRcIj5cIiArIGVzY2FwZVRleHQoIG1vZHVsZXNMaXN0WyBpIF0gKSArIFwiPC9vcHRpb24+XCI7XG5cdH1cblx0bW9kdWxlRmlsdGVySHRtbCArPSBcIjwvc2VsZWN0PlwiO1xuXG5cdHJldHVybiBtb2R1bGVGaWx0ZXJIdG1sO1xufVxuXG5mdW5jdGlvbiB0b29sYmFyTW9kdWxlRmlsdGVyKCkge1xuXHR2YXIgdG9vbGJhciA9IGlkKCBcInF1bml0LXRlc3RydW5uZXItdG9vbGJhclwiICksXG5cdFx0bW9kdWxlRmlsdGVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCggXCJzcGFuXCIgKSxcblx0XHRtb2R1bGVGaWx0ZXJIdG1sID0gdG9vbGJhck1vZHVsZUZpbHRlckh0bWwoKTtcblxuXHRpZiAoICF0b29sYmFyIHx8ICFtb2R1bGVGaWx0ZXJIdG1sICkge1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXG5cdG1vZHVsZUZpbHRlci5zZXRBdHRyaWJ1dGUoIFwiaWRcIiwgXCJxdW5pdC1tb2R1bGVmaWx0ZXItY29udGFpbmVyXCIgKTtcblx0bW9kdWxlRmlsdGVyLmlubmVySFRNTCA9IG1vZHVsZUZpbHRlckh0bWw7XG5cblx0YWRkRXZlbnQoIG1vZHVsZUZpbHRlci5sYXN0Q2hpbGQsIFwiY2hhbmdlXCIsIGFwcGx5VXJsUGFyYW1zICk7XG5cblx0dG9vbGJhci5hcHBlbmRDaGlsZCggbW9kdWxlRmlsdGVyICk7XG59XG5cbmZ1bmN0aW9uIGFwcGVuZFRvb2xiYXIoKSB7XG5cdHZhciB0b29sYmFyID0gaWQoIFwicXVuaXQtdGVzdHJ1bm5lci10b29sYmFyXCIgKTtcblxuXHRpZiAoIHRvb2xiYXIgKSB7XG5cdFx0dG9vbGJhci5hcHBlbmRDaGlsZCggdG9vbGJhclVybENvbmZpZ0NvbnRhaW5lcigpICk7XG5cdFx0dG9vbGJhci5hcHBlbmRDaGlsZCggdG9vbGJhckxvb3NlRmlsdGVyKCkgKTtcblx0XHR0b29sYmFyTW9kdWxlRmlsdGVyKCk7XG5cdH1cbn1cblxuZnVuY3Rpb24gYXBwZW5kSGVhZGVyKCkge1xuXHR2YXIgaGVhZGVyID0gaWQoIFwicXVuaXQtaGVhZGVyXCIgKTtcblxuXHRpZiAoIGhlYWRlciApIHtcblx0XHRoZWFkZXIuaW5uZXJIVE1MID0gXCI8YSBocmVmPSdcIiArIGVzY2FwZVRleHQoIHVuZmlsdGVyZWRVcmwgKSArIFwiJz5cIiArIGhlYWRlci5pbm5lckhUTUwgK1xuXHRcdFx0XCI8L2E+IFwiO1xuXHR9XG59XG5cbmZ1bmN0aW9uIGFwcGVuZEJhbm5lcigpIHtcblx0dmFyIGJhbm5lciA9IGlkKCBcInF1bml0LWJhbm5lclwiICk7XG5cblx0aWYgKCBiYW5uZXIgKSB7XG5cdFx0YmFubmVyLmNsYXNzTmFtZSA9IFwiXCI7XG5cdH1cbn1cblxuZnVuY3Rpb24gYXBwZW5kVGVzdFJlc3VsdHMoKSB7XG5cdHZhciB0ZXN0cyA9IGlkKCBcInF1bml0LXRlc3RzXCIgKSxcblx0XHRyZXN1bHQgPSBpZCggXCJxdW5pdC10ZXN0cmVzdWx0XCIgKTtcblxuXHRpZiAoIHJlc3VsdCApIHtcblx0XHRyZXN1bHQucGFyZW50Tm9kZS5yZW1vdmVDaGlsZCggcmVzdWx0ICk7XG5cdH1cblxuXHRpZiAoIHRlc3RzICkge1xuXHRcdHRlc3RzLmlubmVySFRNTCA9IFwiXCI7XG5cdFx0cmVzdWx0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCggXCJwXCIgKTtcblx0XHRyZXN1bHQuaWQgPSBcInF1bml0LXRlc3RyZXN1bHRcIjtcblx0XHRyZXN1bHQuY2xhc3NOYW1lID0gXCJyZXN1bHRcIjtcblx0XHR0ZXN0cy5wYXJlbnROb2RlLmluc2VydEJlZm9yZSggcmVzdWx0LCB0ZXN0cyApO1xuXHRcdHJlc3VsdC5pbm5lckhUTUwgPSBcIlJ1bm5pbmcuLi48YnIgLz4mIzE2MDtcIjtcblx0fVxufVxuXG5mdW5jdGlvbiBzdG9yZUZpeHR1cmUoKSB7XG5cdHZhciBmaXh0dXJlID0gaWQoIFwicXVuaXQtZml4dHVyZVwiICk7XG5cdGlmICggZml4dHVyZSApIHtcblx0XHRjb25maWcuZml4dHVyZSA9IGZpeHR1cmUuaW5uZXJIVE1MO1xuXHR9XG59XG5cbmZ1bmN0aW9uIGFwcGVuZEZpbHRlcmVkVGVzdCgpIHtcblx0dmFyIHRlc3RJZCA9IFFVbml0LmNvbmZpZy50ZXN0SWQ7XG5cdGlmICggIXRlc3RJZCB8fCB0ZXN0SWQubGVuZ3RoIDw9IDAgKSB7XG5cdFx0cmV0dXJuIFwiXCI7XG5cdH1cblx0cmV0dXJuIFwiPGRpdiBpZD0ncXVuaXQtZmlsdGVyZWRUZXN0Jz5SZXJ1bm5pbmcgc2VsZWN0ZWQgdGVzdHM6IFwiICtcblx0XHRlc2NhcGVUZXh0KCB0ZXN0SWQuam9pbiggXCIsIFwiICkgKSArXG5cdFx0XCIgPGEgaWQ9J3F1bml0LWNsZWFyRmlsdGVyJyBocmVmPSdcIiArXG5cdFx0ZXNjYXBlVGV4dCggdW5maWx0ZXJlZFVybCApICtcblx0XHRcIic+UnVuIGFsbCB0ZXN0czwvYT48L2Rpdj5cIjtcbn1cblxuZnVuY3Rpb24gYXBwZW5kVXNlckFnZW50KCkge1xuXHR2YXIgdXNlckFnZW50ID0gaWQoIFwicXVuaXQtdXNlckFnZW50XCIgKTtcblxuXHRpZiAoIHVzZXJBZ2VudCApIHtcblx0XHR1c2VyQWdlbnQuaW5uZXJIVE1MID0gXCJcIjtcblx0XHR1c2VyQWdlbnQuYXBwZW5kQ2hpbGQoXG5cdFx0XHRkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShcblx0XHRcdFx0XCJRVW5pdCBcIiArIFFVbml0LnZlcnNpb24gKyBcIjsgXCIgKyBuYXZpZ2F0b3IudXNlckFnZW50XG5cdFx0XHQpXG5cdFx0KTtcblx0fVxufVxuXG5mdW5jdGlvbiBhcHBlbmRJbnRlcmZhY2UoKSB7XG5cdHZhciBxdW5pdCA9IGlkKCBcInF1bml0XCIgKTtcblxuXHRpZiAoIHF1bml0ICkge1xuXHRcdHF1bml0LmlubmVySFRNTCA9XG5cdFx0XHRcIjxoMSBpZD0ncXVuaXQtaGVhZGVyJz5cIiArIGVzY2FwZVRleHQoIGRvY3VtZW50LnRpdGxlICkgKyBcIjwvaDE+XCIgK1xuXHRcdFx0XCI8aDIgaWQ9J3F1bml0LWJhbm5lcic+PC9oMj5cIiArXG5cdFx0XHRcIjxkaXYgaWQ9J3F1bml0LXRlc3RydW5uZXItdG9vbGJhcic+PC9kaXY+XCIgK1xuXHRcdFx0YXBwZW5kRmlsdGVyZWRUZXN0KCkgK1xuXHRcdFx0XCI8aDIgaWQ9J3F1bml0LXVzZXJBZ2VudCc+PC9oMj5cIiArXG5cdFx0XHRcIjxvbCBpZD0ncXVuaXQtdGVzdHMnPjwvb2w+XCI7XG5cdH1cblxuXHRhcHBlbmRIZWFkZXIoKTtcblx0YXBwZW5kQmFubmVyKCk7XG5cdGFwcGVuZFRlc3RSZXN1bHRzKCk7XG5cdGFwcGVuZFVzZXJBZ2VudCgpO1xuXHRhcHBlbmRUb29sYmFyKCk7XG59XG5cbmZ1bmN0aW9uIGFwcGVuZFRlc3RzTGlzdCggbW9kdWxlcyApIHtcblx0dmFyIGksIGwsIHgsIHosIHRlc3QsIG1vZHVsZU9iajtcblxuXHRmb3IgKCBpID0gMCwgbCA9IG1vZHVsZXMubGVuZ3RoOyBpIDwgbDsgaSsrICkge1xuXHRcdG1vZHVsZU9iaiA9IG1vZHVsZXNbIGkgXTtcblxuXHRcdGZvciAoIHggPSAwLCB6ID0gbW9kdWxlT2JqLnRlc3RzLmxlbmd0aDsgeCA8IHo7IHgrKyApIHtcblx0XHRcdHRlc3QgPSBtb2R1bGVPYmoudGVzdHNbIHggXTtcblxuXHRcdFx0YXBwZW5kVGVzdCggdGVzdC5uYW1lLCB0ZXN0LnRlc3RJZCwgbW9kdWxlT2JqLm5hbWUgKTtcblx0XHR9XG5cdH1cbn1cblxuZnVuY3Rpb24gYXBwZW5kVGVzdCggbmFtZSwgdGVzdElkLCBtb2R1bGVOYW1lICkge1xuXHR2YXIgdGl0bGUsIHJlcnVuVHJpZ2dlciwgdGVzdEJsb2NrLCBhc3NlcnRMaXN0LFxuXHRcdHRlc3RzID0gaWQoIFwicXVuaXQtdGVzdHNcIiApO1xuXG5cdGlmICggIXRlc3RzICkge1xuXHRcdHJldHVybjtcblx0fVxuXG5cdHRpdGxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCggXCJzdHJvbmdcIiApO1xuXHR0aXRsZS5pbm5lckhUTUwgPSBnZXROYW1lSHRtbCggbmFtZSwgbW9kdWxlTmFtZSApO1xuXG5cdHJlcnVuVHJpZ2dlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoIFwiYVwiICk7XG5cdHJlcnVuVHJpZ2dlci5pbm5lckhUTUwgPSBcIlJlcnVuXCI7XG5cdHJlcnVuVHJpZ2dlci5ocmVmID0gc2V0VXJsKCB7IHRlc3RJZDogdGVzdElkIH0gKTtcblxuXHR0ZXN0QmxvY2sgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCBcImxpXCIgKTtcblx0dGVzdEJsb2NrLmFwcGVuZENoaWxkKCB0aXRsZSApO1xuXHR0ZXN0QmxvY2suYXBwZW5kQ2hpbGQoIHJlcnVuVHJpZ2dlciApO1xuXHR0ZXN0QmxvY2suaWQgPSBcInF1bml0LXRlc3Qtb3V0cHV0LVwiICsgdGVzdElkO1xuXG5cdGFzc2VydExpc3QgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCBcIm9sXCIgKTtcblx0YXNzZXJ0TGlzdC5jbGFzc05hbWUgPSBcInF1bml0LWFzc2VydC1saXN0XCI7XG5cblx0dGVzdEJsb2NrLmFwcGVuZENoaWxkKCBhc3NlcnRMaXN0ICk7XG5cblx0dGVzdHMuYXBwZW5kQ2hpbGQoIHRlc3RCbG9jayApO1xufVxuXG4vLyBIVE1MIFJlcG9ydGVyIGluaXRpYWxpemF0aW9uIGFuZCBsb2FkXG5RVW5pdC5iZWdpbiggZnVuY3Rpb24oIGRldGFpbHMgKSB7XG5cdHZhciBpLCBtb2R1bGVPYmosIHRlc3RzO1xuXG5cdC8vIFNvcnQgbW9kdWxlcyBieSBuYW1lIGZvciB0aGUgcGlja2VyXG5cdGZvciAoIGkgPSAwOyBpIDwgZGV0YWlscy5tb2R1bGVzLmxlbmd0aDsgaSsrICkge1xuXHRcdG1vZHVsZU9iaiA9IGRldGFpbHMubW9kdWxlc1sgaSBdO1xuXHRcdGlmICggbW9kdWxlT2JqLm5hbWUgKSB7XG5cdFx0XHRtb2R1bGVzTGlzdC5wdXNoKCBtb2R1bGVPYmoubmFtZSApO1xuXHRcdH1cblx0fVxuXHRtb2R1bGVzTGlzdC5zb3J0KCBmdW5jdGlvbiggYSwgYiApIHtcblx0XHRyZXR1cm4gYS5sb2NhbGVDb21wYXJlKCBiICk7XG5cdH0gKTtcblxuXHQvLyBDYXB0dXJlIGZpeHR1cmUgSFRNTCBmcm9tIHRoZSBwYWdlXG5cdHN0b3JlRml4dHVyZSgpO1xuXG5cdC8vIEluaXRpYWxpemUgUVVuaXQgZWxlbWVudHNcblx0YXBwZW5kSW50ZXJmYWNlKCk7XG5cdGFwcGVuZFRlc3RzTGlzdCggZGV0YWlscy5tb2R1bGVzICk7XG5cdHRlc3RzID0gaWQoIFwicXVuaXQtdGVzdHNcIiApO1xuXHRpZiAoIHRlc3RzICYmIGNvbmZpZy5oaWRlcGFzc2VkICkge1xuXHRcdGFkZENsYXNzKCB0ZXN0cywgXCJoaWRlcGFzc1wiICk7XG5cdH1cbn0gKTtcblxuUVVuaXQuZG9uZSggZnVuY3Rpb24oIGRldGFpbHMgKSB7XG5cdHZhciBpLCBrZXksXG5cdFx0YmFubmVyID0gaWQoIFwicXVuaXQtYmFubmVyXCIgKSxcblx0XHR0ZXN0cyA9IGlkKCBcInF1bml0LXRlc3RzXCIgKSxcblx0XHRodG1sID0gW1xuXHRcdFx0XCJUZXN0cyBjb21wbGV0ZWQgaW4gXCIsXG5cdFx0XHRkZXRhaWxzLnJ1bnRpbWUsXG5cdFx0XHRcIiBtaWxsaXNlY29uZHMuPGJyIC8+XCIsXG5cdFx0XHRcIjxzcGFuIGNsYXNzPSdwYXNzZWQnPlwiLFxuXHRcdFx0ZGV0YWlscy5wYXNzZWQsXG5cdFx0XHRcIjwvc3Bhbj4gYXNzZXJ0aW9ucyBvZiA8c3BhbiBjbGFzcz0ndG90YWwnPlwiLFxuXHRcdFx0ZGV0YWlscy50b3RhbCxcblx0XHRcdFwiPC9zcGFuPiBwYXNzZWQsIDxzcGFuIGNsYXNzPSdmYWlsZWQnPlwiLFxuXHRcdFx0ZGV0YWlscy5mYWlsZWQsXG5cdFx0XHRcIjwvc3Bhbj4gZmFpbGVkLlwiXG5cdFx0XS5qb2luKCBcIlwiICk7XG5cblx0aWYgKCBiYW5uZXIgKSB7XG5cdFx0YmFubmVyLmNsYXNzTmFtZSA9IGRldGFpbHMuZmFpbGVkID8gXCJxdW5pdC1mYWlsXCIgOiBcInF1bml0LXBhc3NcIjtcblx0fVxuXG5cdGlmICggdGVzdHMgKSB7XG5cdFx0aWQoIFwicXVuaXQtdGVzdHJlc3VsdFwiICkuaW5uZXJIVE1MID0gaHRtbDtcblx0fVxuXG5cdGlmICggY29uZmlnLmFsdGVydGl0bGUgJiYgZG9jdW1lbnQudGl0bGUgKSB7XG5cblx0XHQvLyBTaG93IOKcliBmb3IgZ29vZCwg4pyUIGZvciBiYWQgc3VpdGUgcmVzdWx0IGluIHRpdGxlXG5cdFx0Ly8gdXNlIGVzY2FwZSBzZXF1ZW5jZXMgaW4gY2FzZSBmaWxlIGdldHMgbG9hZGVkIHdpdGggbm9uLXV0Zi04LWNoYXJzZXRcblx0XHRkb2N1bWVudC50aXRsZSA9IFtcblx0XHRcdCggZGV0YWlscy5mYWlsZWQgPyBcIlxcdTI3MTZcIiA6IFwiXFx1MjcxNFwiICksXG5cdFx0XHRkb2N1bWVudC50aXRsZS5yZXBsYWNlKCAvXltcXHUyNzE0XFx1MjcxNl0gL2ksIFwiXCIgKVxuXHRcdF0uam9pbiggXCIgXCIgKTtcblx0fVxuXG5cdC8vIENsZWFyIG93biBzZXNzaW9uU3RvcmFnZSBpdGVtcyBpZiBhbGwgdGVzdHMgcGFzc2VkXG5cdGlmICggY29uZmlnLnJlb3JkZXIgJiYgZGVmaW5lZC5zZXNzaW9uU3RvcmFnZSAmJiBkZXRhaWxzLmZhaWxlZCA9PT0gMCApIHtcblx0XHRmb3IgKCBpID0gMDsgaSA8IHNlc3Npb25TdG9yYWdlLmxlbmd0aDsgaSsrICkge1xuXHRcdFx0a2V5ID0gc2Vzc2lvblN0b3JhZ2Uua2V5KCBpKysgKTtcblx0XHRcdGlmICgga2V5LmluZGV4T2YoIFwicXVuaXQtdGVzdC1cIiApID09PSAwICkge1xuXHRcdFx0XHRzZXNzaW9uU3RvcmFnZS5yZW1vdmVJdGVtKCBrZXkgKTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHQvLyBTY3JvbGwgYmFjayB0byB0b3AgdG8gc2hvdyByZXN1bHRzXG5cdGlmICggY29uZmlnLnNjcm9sbHRvcCAmJiB3aW5kb3cuc2Nyb2xsVG8gKSB7XG5cdFx0d2luZG93LnNjcm9sbFRvKCAwLCAwICk7XG5cdH1cbn0gKTtcblxuZnVuY3Rpb24gZ2V0TmFtZUh0bWwoIG5hbWUsIG1vZHVsZSApIHtcblx0dmFyIG5hbWVIdG1sID0gXCJcIjtcblxuXHRpZiAoIG1vZHVsZSApIHtcblx0XHRuYW1lSHRtbCA9IFwiPHNwYW4gY2xhc3M9J21vZHVsZS1uYW1lJz5cIiArIGVzY2FwZVRleHQoIG1vZHVsZSApICsgXCI8L3NwYW4+OiBcIjtcblx0fVxuXG5cdG5hbWVIdG1sICs9IFwiPHNwYW4gY2xhc3M9J3Rlc3QtbmFtZSc+XCIgKyBlc2NhcGVUZXh0KCBuYW1lICkgKyBcIjwvc3Bhbj5cIjtcblxuXHRyZXR1cm4gbmFtZUh0bWw7XG59XG5cblFVbml0LnRlc3RTdGFydCggZnVuY3Rpb24oIGRldGFpbHMgKSB7XG5cdHZhciBydW5uaW5nLCB0ZXN0QmxvY2ssIGJhZDtcblxuXHR0ZXN0QmxvY2sgPSBpZCggXCJxdW5pdC10ZXN0LW91dHB1dC1cIiArIGRldGFpbHMudGVzdElkICk7XG5cdGlmICggdGVzdEJsb2NrICkge1xuXHRcdHRlc3RCbG9jay5jbGFzc05hbWUgPSBcInJ1bm5pbmdcIjtcblx0fSBlbHNlIHtcblxuXHRcdC8vIFJlcG9ydCBsYXRlciByZWdpc3RlcmVkIHRlc3RzXG5cdFx0YXBwZW5kVGVzdCggZGV0YWlscy5uYW1lLCBkZXRhaWxzLnRlc3RJZCwgZGV0YWlscy5tb2R1bGUgKTtcblx0fVxuXG5cdHJ1bm5pbmcgPSBpZCggXCJxdW5pdC10ZXN0cmVzdWx0XCIgKTtcblx0aWYgKCBydW5uaW5nICkge1xuXHRcdGJhZCA9IFFVbml0LmNvbmZpZy5yZW9yZGVyICYmIGRlZmluZWQuc2Vzc2lvblN0b3JhZ2UgJiZcblx0XHRcdCtzZXNzaW9uU3RvcmFnZS5nZXRJdGVtKCBcInF1bml0LXRlc3QtXCIgKyBkZXRhaWxzLm1vZHVsZSArIFwiLVwiICsgZGV0YWlscy5uYW1lICk7XG5cblx0XHRydW5uaW5nLmlubmVySFRNTCA9ICggYmFkID9cblx0XHRcdFwiUmVydW5uaW5nIHByZXZpb3VzbHkgZmFpbGVkIHRlc3Q6IDxiciAvPlwiIDpcblx0XHRcdFwiUnVubmluZzogPGJyIC8+XCIgKSArXG5cdFx0XHRnZXROYW1lSHRtbCggZGV0YWlscy5uYW1lLCBkZXRhaWxzLm1vZHVsZSApO1xuXHR9XG5cbn0gKTtcblxuZnVuY3Rpb24gc3RyaXBIdG1sKCBzdHJpbmcgKSB7XG5cblx0Ly8gU3RyaXAgdGFncywgaHRtbCBlbnRpdHkgYW5kIHdoaXRlc3BhY2VzXG5cdHJldHVybiBzdHJpbmcucmVwbGFjZSggLzxcXC8/W14+XSsoPnwkKS9nLCBcIlwiICkucmVwbGFjZSggL1xcJnF1b3Q7L2csIFwiXCIgKS5yZXBsYWNlKCAvXFxzKy9nLCBcIlwiICk7XG59XG5cblFVbml0LmxvZyggZnVuY3Rpb24oIGRldGFpbHMgKSB7XG5cdHZhciBhc3NlcnRMaXN0LCBhc3NlcnRMaSxcblx0XHRtZXNzYWdlLCBleHBlY3RlZCwgYWN0dWFsLCBkaWZmLFxuXHRcdHNob3dEaWZmID0gZmFsc2UsXG5cdFx0dGVzdEl0ZW0gPSBpZCggXCJxdW5pdC10ZXN0LW91dHB1dC1cIiArIGRldGFpbHMudGVzdElkICk7XG5cblx0aWYgKCAhdGVzdEl0ZW0gKSB7XG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0bWVzc2FnZSA9IGVzY2FwZVRleHQoIGRldGFpbHMubWVzc2FnZSApIHx8ICggZGV0YWlscy5yZXN1bHQgPyBcIm9rYXlcIiA6IFwiZmFpbGVkXCIgKTtcblx0bWVzc2FnZSA9IFwiPHNwYW4gY2xhc3M9J3Rlc3QtbWVzc2FnZSc+XCIgKyBtZXNzYWdlICsgXCI8L3NwYW4+XCI7XG5cdG1lc3NhZ2UgKz0gXCI8c3BhbiBjbGFzcz0ncnVudGltZSc+QCBcIiArIGRldGFpbHMucnVudGltZSArIFwiIG1zPC9zcGFuPlwiO1xuXG5cdC8vIFRoZSBwdXNoRmFpbHVyZSBkb2Vzbid0IHByb3ZpZGUgZGV0YWlscy5leHBlY3RlZFxuXHQvLyB3aGVuIGl0IGNhbGxzLCBpdCdzIGltcGxpY2l0IHRvIGFsc28gbm90IHNob3cgZXhwZWN0ZWQgYW5kIGRpZmYgc3R1ZmZcblx0Ly8gQWxzbywgd2UgbmVlZCB0byBjaGVjayBkZXRhaWxzLmV4cGVjdGVkIGV4aXN0ZW5jZSwgYXMgaXQgY2FuIGV4aXN0IGFuZCBiZSB1bmRlZmluZWRcblx0aWYgKCAhZGV0YWlscy5yZXN1bHQgJiYgaGFzT3duLmNhbGwoIGRldGFpbHMsIFwiZXhwZWN0ZWRcIiApICkge1xuXHRcdGlmICggZGV0YWlscy5uZWdhdGl2ZSApIHtcblx0XHRcdGV4cGVjdGVkID0gXCJOT1QgXCIgKyBRVW5pdC5kdW1wLnBhcnNlKCBkZXRhaWxzLmV4cGVjdGVkICk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGV4cGVjdGVkID0gUVVuaXQuZHVtcC5wYXJzZSggZGV0YWlscy5leHBlY3RlZCApO1xuXHRcdH1cblxuXHRcdGFjdHVhbCA9IFFVbml0LmR1bXAucGFyc2UoIGRldGFpbHMuYWN0dWFsICk7XG5cdFx0bWVzc2FnZSArPSBcIjx0YWJsZT48dHIgY2xhc3M9J3Rlc3QtZXhwZWN0ZWQnPjx0aD5FeHBlY3RlZDogPC90aD48dGQ+PHByZT5cIiArXG5cdFx0XHRlc2NhcGVUZXh0KCBleHBlY3RlZCApICtcblx0XHRcdFwiPC9wcmU+PC90ZD48L3RyPlwiO1xuXG5cdFx0aWYgKCBhY3R1YWwgIT09IGV4cGVjdGVkICkge1xuXG5cdFx0XHRtZXNzYWdlICs9IFwiPHRyIGNsYXNzPSd0ZXN0LWFjdHVhbCc+PHRoPlJlc3VsdDogPC90aD48dGQ+PHByZT5cIiArXG5cdFx0XHRcdGVzY2FwZVRleHQoIGFjdHVhbCApICsgXCI8L3ByZT48L3RkPjwvdHI+XCI7XG5cblx0XHRcdC8vIERvbid0IHNob3cgZGlmZiBpZiBhY3R1YWwgb3IgZXhwZWN0ZWQgYXJlIGJvb2xlYW5zXG5cdFx0XHRpZiAoICEoIC9eKHRydWV8ZmFsc2UpJC8udGVzdCggYWN0dWFsICkgKSAmJlxuXHRcdFx0XHRcdCEoIC9eKHRydWV8ZmFsc2UpJC8udGVzdCggZXhwZWN0ZWQgKSApICkge1xuXHRcdFx0XHRkaWZmID0gUVVuaXQuZGlmZiggZXhwZWN0ZWQsIGFjdHVhbCApO1xuXHRcdFx0XHRzaG93RGlmZiA9IHN0cmlwSHRtbCggZGlmZiApLmxlbmd0aCAhPT1cblx0XHRcdFx0XHRzdHJpcEh0bWwoIGV4cGVjdGVkICkubGVuZ3RoICtcblx0XHRcdFx0XHRzdHJpcEh0bWwoIGFjdHVhbCApLmxlbmd0aDtcblx0XHRcdH1cblxuXHRcdFx0Ly8gRG9uJ3Qgc2hvdyBkaWZmIGlmIGV4cGVjdGVkIGFuZCBhY3R1YWwgYXJlIHRvdGFsbHkgZGlmZmVyZW50XG5cdFx0XHRpZiAoIHNob3dEaWZmICkge1xuXHRcdFx0XHRtZXNzYWdlICs9IFwiPHRyIGNsYXNzPSd0ZXN0LWRpZmYnPjx0aD5EaWZmOiA8L3RoPjx0ZD48cHJlPlwiICtcblx0XHRcdFx0XHRkaWZmICsgXCI8L3ByZT48L3RkPjwvdHI+XCI7XG5cdFx0XHR9XG5cdFx0fSBlbHNlIGlmICggZXhwZWN0ZWQuaW5kZXhPZiggXCJbb2JqZWN0IEFycmF5XVwiICkgIT09IC0xIHx8XG5cdFx0XHRcdGV4cGVjdGVkLmluZGV4T2YoIFwiW29iamVjdCBPYmplY3RdXCIgKSAhPT0gLTEgKSB7XG5cdFx0XHRtZXNzYWdlICs9IFwiPHRyIGNsYXNzPSd0ZXN0LW1lc3NhZ2UnPjx0aD5NZXNzYWdlOiA8L3RoPjx0ZD5cIiArXG5cdFx0XHRcdFwiRGlmZiBzdXBwcmVzc2VkIGFzIHRoZSBkZXB0aCBvZiBvYmplY3QgaXMgbW9yZSB0aGFuIGN1cnJlbnQgbWF4IGRlcHRoIChcIiArXG5cdFx0XHRcdFFVbml0LmNvbmZpZy5tYXhEZXB0aCArIFwiKS48cD5IaW50OiBVc2UgPGNvZGU+UVVuaXQuZHVtcC5tYXhEZXB0aDwvY29kZT4gdG8gXCIgK1xuXHRcdFx0XHRcIiBydW4gd2l0aCBhIGhpZ2hlciBtYXggZGVwdGggb3IgPGEgaHJlZj0nXCIgK1xuXHRcdFx0XHRlc2NhcGVUZXh0KCBzZXRVcmwoIHsgbWF4RGVwdGg6IC0xIH0gKSApICsgXCInPlwiICtcblx0XHRcdFx0XCJSZXJ1bjwvYT4gd2l0aG91dCBtYXggZGVwdGguPC9wPjwvdGQ+PC90cj5cIjtcblx0XHR9IGVsc2Uge1xuXHRcdFx0bWVzc2FnZSArPSBcIjx0ciBjbGFzcz0ndGVzdC1tZXNzYWdlJz48dGg+TWVzc2FnZTogPC90aD48dGQ+XCIgK1xuXHRcdFx0XHRcIkRpZmYgc3VwcHJlc3NlZCBhcyB0aGUgZXhwZWN0ZWQgYW5kIGFjdHVhbCByZXN1bHRzIGhhdmUgYW4gZXF1aXZhbGVudFwiICtcblx0XHRcdFx0XCIgc2VyaWFsaXphdGlvbjwvdGQ+PC90cj5cIjtcblx0XHR9XG5cblx0XHRpZiAoIGRldGFpbHMuc291cmNlICkge1xuXHRcdFx0bWVzc2FnZSArPSBcIjx0ciBjbGFzcz0ndGVzdC1zb3VyY2UnPjx0aD5Tb3VyY2U6IDwvdGg+PHRkPjxwcmU+XCIgK1xuXHRcdFx0XHRlc2NhcGVUZXh0KCBkZXRhaWxzLnNvdXJjZSApICsgXCI8L3ByZT48L3RkPjwvdHI+XCI7XG5cdFx0fVxuXG5cdFx0bWVzc2FnZSArPSBcIjwvdGFibGU+XCI7XG5cblx0Ly8gVGhpcyBvY2N1cnMgd2hlbiBwdXNoRmFpbHVyZSBpcyBzZXQgYW5kIHdlIGhhdmUgYW4gZXh0cmFjdGVkIHN0YWNrIHRyYWNlXG5cdH0gZWxzZSBpZiAoICFkZXRhaWxzLnJlc3VsdCAmJiBkZXRhaWxzLnNvdXJjZSApIHtcblx0XHRtZXNzYWdlICs9IFwiPHRhYmxlPlwiICtcblx0XHRcdFwiPHRyIGNsYXNzPSd0ZXN0LXNvdXJjZSc+PHRoPlNvdXJjZTogPC90aD48dGQ+PHByZT5cIiArXG5cdFx0XHRlc2NhcGVUZXh0KCBkZXRhaWxzLnNvdXJjZSApICsgXCI8L3ByZT48L3RkPjwvdHI+XCIgK1xuXHRcdFx0XCI8L3RhYmxlPlwiO1xuXHR9XG5cblx0YXNzZXJ0TGlzdCA9IHRlc3RJdGVtLmdldEVsZW1lbnRzQnlUYWdOYW1lKCBcIm9sXCIgKVsgMCBdO1xuXG5cdGFzc2VydExpID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCggXCJsaVwiICk7XG5cdGFzc2VydExpLmNsYXNzTmFtZSA9IGRldGFpbHMucmVzdWx0ID8gXCJwYXNzXCIgOiBcImZhaWxcIjtcblx0YXNzZXJ0TGkuaW5uZXJIVE1MID0gbWVzc2FnZTtcblx0YXNzZXJ0TGlzdC5hcHBlbmRDaGlsZCggYXNzZXJ0TGkgKTtcbn0gKTtcblxuUVVuaXQudGVzdERvbmUoIGZ1bmN0aW9uKCBkZXRhaWxzICkge1xuXHR2YXIgdGVzdFRpdGxlLCB0aW1lLCB0ZXN0SXRlbSwgYXNzZXJ0TGlzdCxcblx0XHRnb29kLCBiYWQsIHRlc3RDb3VudHMsIHNraXBwZWQsIHNvdXJjZU5hbWUsXG5cdFx0dGVzdHMgPSBpZCggXCJxdW5pdC10ZXN0c1wiICk7XG5cblx0aWYgKCAhdGVzdHMgKSB7XG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0dGVzdEl0ZW0gPSBpZCggXCJxdW5pdC10ZXN0LW91dHB1dC1cIiArIGRldGFpbHMudGVzdElkICk7XG5cblx0YXNzZXJ0TGlzdCA9IHRlc3RJdGVtLmdldEVsZW1lbnRzQnlUYWdOYW1lKCBcIm9sXCIgKVsgMCBdO1xuXG5cdGdvb2QgPSBkZXRhaWxzLnBhc3NlZDtcblx0YmFkID0gZGV0YWlscy5mYWlsZWQ7XG5cblx0Ly8gU3RvcmUgcmVzdWx0IHdoZW4gcG9zc2libGVcblx0aWYgKCBjb25maWcucmVvcmRlciAmJiBkZWZpbmVkLnNlc3Npb25TdG9yYWdlICkge1xuXHRcdGlmICggYmFkICkge1xuXHRcdFx0c2Vzc2lvblN0b3JhZ2Uuc2V0SXRlbSggXCJxdW5pdC10ZXN0LVwiICsgZGV0YWlscy5tb2R1bGUgKyBcIi1cIiArIGRldGFpbHMubmFtZSwgYmFkICk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHNlc3Npb25TdG9yYWdlLnJlbW92ZUl0ZW0oIFwicXVuaXQtdGVzdC1cIiArIGRldGFpbHMubW9kdWxlICsgXCItXCIgKyBkZXRhaWxzLm5hbWUgKTtcblx0XHR9XG5cdH1cblxuXHRpZiAoIGJhZCA9PT0gMCApIHtcblxuXHRcdC8vIENvbGxhcHNlIHRoZSBwYXNzaW5nIHRlc3RzXG5cdFx0YWRkQ2xhc3MoIGFzc2VydExpc3QsIFwicXVuaXQtY29sbGFwc2VkXCIgKTtcblx0fSBlbHNlIGlmICggYmFkICYmIGNvbmZpZy5jb2xsYXBzZSAmJiAhY29sbGFwc2VOZXh0ICkge1xuXG5cdFx0Ly8gU2tpcCBjb2xsYXBzaW5nIHRoZSBmaXJzdCBmYWlsaW5nIHRlc3Rcblx0XHRjb2xsYXBzZU5leHQgPSB0cnVlO1xuXHR9IGVsc2Uge1xuXG5cdFx0Ly8gQ29sbGFwc2UgcmVtYWluaW5nIHRlc3RzXG5cdFx0YWRkQ2xhc3MoIGFzc2VydExpc3QsIFwicXVuaXQtY29sbGFwc2VkXCIgKTtcblx0fVxuXG5cdC8vIFRoZSB0ZXN0SXRlbS5maXJzdENoaWxkIGlzIHRoZSB0ZXN0IG5hbWVcblx0dGVzdFRpdGxlID0gdGVzdEl0ZW0uZmlyc3RDaGlsZDtcblxuXHR0ZXN0Q291bnRzID0gYmFkID9cblx0XHRcIjxiIGNsYXNzPSdmYWlsZWQnPlwiICsgYmFkICsgXCI8L2I+LCBcIiArIFwiPGIgY2xhc3M9J3Bhc3NlZCc+XCIgKyBnb29kICsgXCI8L2I+LCBcIiA6XG5cdFx0XCJcIjtcblxuXHR0ZXN0VGl0bGUuaW5uZXJIVE1MICs9IFwiIDxiIGNsYXNzPSdjb3VudHMnPihcIiArIHRlc3RDb3VudHMgK1xuXHRcdGRldGFpbHMuYXNzZXJ0aW9ucy5sZW5ndGggKyBcIik8L2I+XCI7XG5cblx0aWYgKCBkZXRhaWxzLnNraXBwZWQgKSB7XG5cdFx0dGVzdEl0ZW0uY2xhc3NOYW1lID0gXCJza2lwcGVkXCI7XG5cdFx0c2tpcHBlZCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoIFwiZW1cIiApO1xuXHRcdHNraXBwZWQuY2xhc3NOYW1lID0gXCJxdW5pdC1za2lwcGVkLWxhYmVsXCI7XG5cdFx0c2tpcHBlZC5pbm5lckhUTUwgPSBcInNraXBwZWRcIjtcblx0XHR0ZXN0SXRlbS5pbnNlcnRCZWZvcmUoIHNraXBwZWQsIHRlc3RUaXRsZSApO1xuXHR9IGVsc2Uge1xuXHRcdGFkZEV2ZW50KCB0ZXN0VGl0bGUsIFwiY2xpY2tcIiwgZnVuY3Rpb24oKSB7XG5cdFx0XHR0b2dnbGVDbGFzcyggYXNzZXJ0TGlzdCwgXCJxdW5pdC1jb2xsYXBzZWRcIiApO1xuXHRcdH0gKTtcblxuXHRcdHRlc3RJdGVtLmNsYXNzTmFtZSA9IGJhZCA/IFwiZmFpbFwiIDogXCJwYXNzXCI7XG5cblx0XHR0aW1lID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCggXCJzcGFuXCIgKTtcblx0XHR0aW1lLmNsYXNzTmFtZSA9IFwicnVudGltZVwiO1xuXHRcdHRpbWUuaW5uZXJIVE1MID0gZGV0YWlscy5ydW50aW1lICsgXCIgbXNcIjtcblx0XHR0ZXN0SXRlbS5pbnNlcnRCZWZvcmUoIHRpbWUsIGFzc2VydExpc3QgKTtcblx0fVxuXG5cdC8vIFNob3cgdGhlIHNvdXJjZSBvZiB0aGUgdGVzdCB3aGVuIHNob3dpbmcgYXNzZXJ0aW9uc1xuXHRpZiAoIGRldGFpbHMuc291cmNlICkge1xuXHRcdHNvdXJjZU5hbWUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCBcInBcIiApO1xuXHRcdHNvdXJjZU5hbWUuaW5uZXJIVE1MID0gXCI8c3Ryb25nPlNvdXJjZTogPC9zdHJvbmc+XCIgKyBkZXRhaWxzLnNvdXJjZTtcblx0XHRhZGRDbGFzcyggc291cmNlTmFtZSwgXCJxdW5pdC1zb3VyY2VcIiApO1xuXHRcdGlmICggYmFkID09PSAwICkge1xuXHRcdFx0YWRkQ2xhc3MoIHNvdXJjZU5hbWUsIFwicXVuaXQtY29sbGFwc2VkXCIgKTtcblx0XHR9XG5cdFx0YWRkRXZlbnQoIHRlc3RUaXRsZSwgXCJjbGlja1wiLCBmdW5jdGlvbigpIHtcblx0XHRcdHRvZ2dsZUNsYXNzKCBzb3VyY2VOYW1lLCBcInF1bml0LWNvbGxhcHNlZFwiICk7XG5cdFx0fSApO1xuXHRcdHRlc3RJdGVtLmFwcGVuZENoaWxkKCBzb3VyY2VOYW1lICk7XG5cdH1cbn0gKTtcblxuLy8gQXZvaWQgcmVhZHlTdGF0ZSBpc3N1ZSB3aXRoIHBoYW50b21qc1xuLy8gUmVmOiAjODE4XG52YXIgbm90UGhhbnRvbSA9ICggZnVuY3Rpb24oIHAgKSB7XG5cdHJldHVybiAhKCBwICYmIHAudmVyc2lvbiAmJiBwLnZlcnNpb24ubWFqb3IgPiAwICk7XG59ICkoIHdpbmRvdy5waGFudG9tICk7XG5cbmlmICggbm90UGhhbnRvbSAmJiBkb2N1bWVudC5yZWFkeVN0YXRlID09PSBcImNvbXBsZXRlXCIgKSB7XG5cdFFVbml0LmxvYWQoKTtcbn0gZWxzZSB7XG5cdGFkZEV2ZW50KCB3aW5kb3csIFwibG9hZFwiLCBRVW5pdC5sb2FkICk7XG59XG5cbi8qXG4gKiBUaGlzIGZpbGUgaXMgYSBtb2RpZmllZCB2ZXJzaW9uIG9mIGdvb2dsZS1kaWZmLW1hdGNoLXBhdGNoJ3MgSmF2YVNjcmlwdCBpbXBsZW1lbnRhdGlvblxuICogKGh0dHBzOi8vY29kZS5nb29nbGUuY29tL3AvZ29vZ2xlLWRpZmYtbWF0Y2gtcGF0Y2gvc291cmNlL2Jyb3dzZS90cnVuay9qYXZhc2NyaXB0L2RpZmZfbWF0Y2hfcGF0Y2hfdW5jb21wcmVzc2VkLmpzKSxcbiAqIG1vZGlmaWNhdGlvbnMgYXJlIGxpY2Vuc2VkIGFzIG1vcmUgZnVsbHkgc2V0IGZvcnRoIGluIExJQ0VOU0UudHh0LlxuICpcbiAqIFRoZSBvcmlnaW5hbCBzb3VyY2Ugb2YgZ29vZ2xlLWRpZmYtbWF0Y2gtcGF0Y2ggaXMgYXR0cmlidXRhYmxlIGFuZCBsaWNlbnNlZCBhcyBmb2xsb3dzOlxuICpcbiAqIENvcHlyaWdodCAyMDA2IEdvb2dsZSBJbmMuXG4gKiBodHRwczovL2NvZGUuZ29vZ2xlLmNvbS9wL2dvb2dsZS1kaWZmLW1hdGNoLXBhdGNoL1xuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiBodHRwczovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqXG4gKiBNb3JlIEluZm86XG4gKiAgaHR0cHM6Ly9jb2RlLmdvb2dsZS5jb20vcC9nb29nbGUtZGlmZi1tYXRjaC1wYXRjaC9cbiAqXG4gKiBVc2FnZTogUVVuaXQuZGlmZihleHBlY3RlZCwgYWN0dWFsKVxuICpcbiAqL1xuUVVuaXQuZGlmZiA9ICggZnVuY3Rpb24oKSB7XG5cdGZ1bmN0aW9uIERpZmZNYXRjaFBhdGNoKCkge1xuXHR9XG5cblx0Ly8gIERJRkYgRlVOQ1RJT05TXG5cblx0LyoqXG5cdCAqIFRoZSBkYXRhIHN0cnVjdHVyZSByZXByZXNlbnRpbmcgYSBkaWZmIGlzIGFuIGFycmF5IG9mIHR1cGxlczpcblx0ICogW1tESUZGX0RFTEVURSwgJ0hlbGxvJ10sIFtESUZGX0lOU0VSVCwgJ0dvb2RieWUnXSwgW0RJRkZfRVFVQUwsICcgd29ybGQuJ11dXG5cdCAqIHdoaWNoIG1lYW5zOiBkZWxldGUgJ0hlbGxvJywgYWRkICdHb29kYnllJyBhbmQga2VlcCAnIHdvcmxkLidcblx0ICovXG5cdHZhciBESUZGX0RFTEVURSA9IC0xLFxuXHRcdERJRkZfSU5TRVJUID0gMSxcblx0XHRESUZGX0VRVUFMID0gMDtcblxuXHQvKipcblx0ICogRmluZCB0aGUgZGlmZmVyZW5jZXMgYmV0d2VlbiB0d28gdGV4dHMuICBTaW1wbGlmaWVzIHRoZSBwcm9ibGVtIGJ5IHN0cmlwcGluZ1xuXHQgKiBhbnkgY29tbW9uIHByZWZpeCBvciBzdWZmaXggb2ZmIHRoZSB0ZXh0cyBiZWZvcmUgZGlmZmluZy5cblx0ICogQHBhcmFtIHtzdHJpbmd9IHRleHQxIE9sZCBzdHJpbmcgdG8gYmUgZGlmZmVkLlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gdGV4dDIgTmV3IHN0cmluZyB0byBiZSBkaWZmZWQuXG5cdCAqIEBwYXJhbSB7Ym9vbGVhbj19IG9wdENoZWNrbGluZXMgT3B0aW9uYWwgc3BlZWR1cCBmbGFnLiBJZiBwcmVzZW50IGFuZCBmYWxzZSxcblx0ICogICAgIHRoZW4gZG9uJ3QgcnVuIGEgbGluZS1sZXZlbCBkaWZmIGZpcnN0IHRvIGlkZW50aWZ5IHRoZSBjaGFuZ2VkIGFyZWFzLlxuXHQgKiAgICAgRGVmYXVsdHMgdG8gdHJ1ZSwgd2hpY2ggZG9lcyBhIGZhc3Rlciwgc2xpZ2h0bHkgbGVzcyBvcHRpbWFsIGRpZmYuXG5cdCAqIEByZXR1cm4geyFBcnJheS48IURpZmZNYXRjaFBhdGNoLkRpZmY+fSBBcnJheSBvZiBkaWZmIHR1cGxlcy5cblx0ICovXG5cdERpZmZNYXRjaFBhdGNoLnByb3RvdHlwZS5EaWZmTWFpbiA9IGZ1bmN0aW9uKCB0ZXh0MSwgdGV4dDIsIG9wdENoZWNrbGluZXMgKSB7XG5cdFx0dmFyIGRlYWRsaW5lLCBjaGVja2xpbmVzLCBjb21tb25sZW5ndGgsXG5cdFx0XHRjb21tb25wcmVmaXgsIGNvbW1vbnN1ZmZpeCwgZGlmZnM7XG5cblx0XHQvLyBUaGUgZGlmZiBtdXN0IGJlIGNvbXBsZXRlIGluIHVwIHRvIDEgc2Vjb25kLlxuXHRcdGRlYWRsaW5lID0gKCBuZXcgRGF0ZSgpICkuZ2V0VGltZSgpICsgMTAwMDtcblxuXHRcdC8vIENoZWNrIGZvciBudWxsIGlucHV0cy5cblx0XHRpZiAoIHRleHQxID09PSBudWxsIHx8IHRleHQyID09PSBudWxsICkge1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCBcIk51bGwgaW5wdXQuIChEaWZmTWFpbilcIiApO1xuXHRcdH1cblxuXHRcdC8vIENoZWNrIGZvciBlcXVhbGl0eSAoc3BlZWR1cCkuXG5cdFx0aWYgKCB0ZXh0MSA9PT0gdGV4dDIgKSB7XG5cdFx0XHRpZiAoIHRleHQxICkge1xuXHRcdFx0XHRyZXR1cm4gW1xuXHRcdFx0XHRcdFsgRElGRl9FUVVBTCwgdGV4dDEgXVxuXHRcdFx0XHRdO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIFtdO1xuXHRcdH1cblxuXHRcdGlmICggdHlwZW9mIG9wdENoZWNrbGluZXMgPT09IFwidW5kZWZpbmVkXCIgKSB7XG5cdFx0XHRvcHRDaGVja2xpbmVzID0gdHJ1ZTtcblx0XHR9XG5cblx0XHRjaGVja2xpbmVzID0gb3B0Q2hlY2tsaW5lcztcblxuXHRcdC8vIFRyaW0gb2ZmIGNvbW1vbiBwcmVmaXggKHNwZWVkdXApLlxuXHRcdGNvbW1vbmxlbmd0aCA9IHRoaXMuZGlmZkNvbW1vblByZWZpeCggdGV4dDEsIHRleHQyICk7XG5cdFx0Y29tbW9ucHJlZml4ID0gdGV4dDEuc3Vic3RyaW5nKCAwLCBjb21tb25sZW5ndGggKTtcblx0XHR0ZXh0MSA9IHRleHQxLnN1YnN0cmluZyggY29tbW9ubGVuZ3RoICk7XG5cdFx0dGV4dDIgPSB0ZXh0Mi5zdWJzdHJpbmcoIGNvbW1vbmxlbmd0aCApO1xuXG5cdFx0Ly8gVHJpbSBvZmYgY29tbW9uIHN1ZmZpeCAoc3BlZWR1cCkuXG5cdFx0Y29tbW9ubGVuZ3RoID0gdGhpcy5kaWZmQ29tbW9uU3VmZml4KCB0ZXh0MSwgdGV4dDIgKTtcblx0XHRjb21tb25zdWZmaXggPSB0ZXh0MS5zdWJzdHJpbmcoIHRleHQxLmxlbmd0aCAtIGNvbW1vbmxlbmd0aCApO1xuXHRcdHRleHQxID0gdGV4dDEuc3Vic3RyaW5nKCAwLCB0ZXh0MS5sZW5ndGggLSBjb21tb25sZW5ndGggKTtcblx0XHR0ZXh0MiA9IHRleHQyLnN1YnN0cmluZyggMCwgdGV4dDIubGVuZ3RoIC0gY29tbW9ubGVuZ3RoICk7XG5cblx0XHQvLyBDb21wdXRlIHRoZSBkaWZmIG9uIHRoZSBtaWRkbGUgYmxvY2suXG5cdFx0ZGlmZnMgPSB0aGlzLmRpZmZDb21wdXRlKCB0ZXh0MSwgdGV4dDIsIGNoZWNrbGluZXMsIGRlYWRsaW5lICk7XG5cblx0XHQvLyBSZXN0b3JlIHRoZSBwcmVmaXggYW5kIHN1ZmZpeC5cblx0XHRpZiAoIGNvbW1vbnByZWZpeCApIHtcblx0XHRcdGRpZmZzLnVuc2hpZnQoIFsgRElGRl9FUVVBTCwgY29tbW9ucHJlZml4IF0gKTtcblx0XHR9XG5cdFx0aWYgKCBjb21tb25zdWZmaXggKSB7XG5cdFx0XHRkaWZmcy5wdXNoKCBbIERJRkZfRVFVQUwsIGNvbW1vbnN1ZmZpeCBdICk7XG5cdFx0fVxuXHRcdHRoaXMuZGlmZkNsZWFudXBNZXJnZSggZGlmZnMgKTtcblx0XHRyZXR1cm4gZGlmZnM7XG5cdH07XG5cblx0LyoqXG5cdCAqIFJlZHVjZSB0aGUgbnVtYmVyIG9mIGVkaXRzIGJ5IGVsaW1pbmF0aW5nIG9wZXJhdGlvbmFsbHkgdHJpdmlhbCBlcXVhbGl0aWVzLlxuXHQgKiBAcGFyYW0geyFBcnJheS48IURpZmZNYXRjaFBhdGNoLkRpZmY+fSBkaWZmcyBBcnJheSBvZiBkaWZmIHR1cGxlcy5cblx0ICovXG5cdERpZmZNYXRjaFBhdGNoLnByb3RvdHlwZS5kaWZmQ2xlYW51cEVmZmljaWVuY3kgPSBmdW5jdGlvbiggZGlmZnMgKSB7XG5cdFx0dmFyIGNoYW5nZXMsIGVxdWFsaXRpZXMsIGVxdWFsaXRpZXNMZW5ndGgsIGxhc3RlcXVhbGl0eSxcblx0XHRcdHBvaW50ZXIsIHByZUlucywgcHJlRGVsLCBwb3N0SW5zLCBwb3N0RGVsO1xuXHRcdGNoYW5nZXMgPSBmYWxzZTtcblx0XHRlcXVhbGl0aWVzID0gW107IC8vIFN0YWNrIG9mIGluZGljZXMgd2hlcmUgZXF1YWxpdGllcyBhcmUgZm91bmQuXG5cdFx0ZXF1YWxpdGllc0xlbmd0aCA9IDA7IC8vIEtlZXBpbmcgb3VyIG93biBsZW5ndGggdmFyIGlzIGZhc3RlciBpbiBKUy5cblx0XHQvKiogQHR5cGUgez9zdHJpbmd9ICovXG5cdFx0bGFzdGVxdWFsaXR5ID0gbnVsbDtcblxuXHRcdC8vIEFsd2F5cyBlcXVhbCB0byBkaWZmc1tlcXVhbGl0aWVzW2VxdWFsaXRpZXNMZW5ndGggLSAxXV1bMV1cblx0XHRwb2ludGVyID0gMDsgLy8gSW5kZXggb2YgY3VycmVudCBwb3NpdGlvbi5cblxuXHRcdC8vIElzIHRoZXJlIGFuIGluc2VydGlvbiBvcGVyYXRpb24gYmVmb3JlIHRoZSBsYXN0IGVxdWFsaXR5LlxuXHRcdHByZUlucyA9IGZhbHNlO1xuXG5cdFx0Ly8gSXMgdGhlcmUgYSBkZWxldGlvbiBvcGVyYXRpb24gYmVmb3JlIHRoZSBsYXN0IGVxdWFsaXR5LlxuXHRcdHByZURlbCA9IGZhbHNlO1xuXG5cdFx0Ly8gSXMgdGhlcmUgYW4gaW5zZXJ0aW9uIG9wZXJhdGlvbiBhZnRlciB0aGUgbGFzdCBlcXVhbGl0eS5cblx0XHRwb3N0SW5zID0gZmFsc2U7XG5cblx0XHQvLyBJcyB0aGVyZSBhIGRlbGV0aW9uIG9wZXJhdGlvbiBhZnRlciB0aGUgbGFzdCBlcXVhbGl0eS5cblx0XHRwb3N0RGVsID0gZmFsc2U7XG5cdFx0d2hpbGUgKCBwb2ludGVyIDwgZGlmZnMubGVuZ3RoICkge1xuXG5cdFx0XHQvLyBFcXVhbGl0eSBmb3VuZC5cblx0XHRcdGlmICggZGlmZnNbIHBvaW50ZXIgXVsgMCBdID09PSBESUZGX0VRVUFMICkge1xuXHRcdFx0XHRpZiAoIGRpZmZzWyBwb2ludGVyIF1bIDEgXS5sZW5ndGggPCA0ICYmICggcG9zdElucyB8fCBwb3N0RGVsICkgKSB7XG5cblx0XHRcdFx0XHQvLyBDYW5kaWRhdGUgZm91bmQuXG5cdFx0XHRcdFx0ZXF1YWxpdGllc1sgZXF1YWxpdGllc0xlbmd0aCsrIF0gPSBwb2ludGVyO1xuXHRcdFx0XHRcdHByZUlucyA9IHBvc3RJbnM7XG5cdFx0XHRcdFx0cHJlRGVsID0gcG9zdERlbDtcblx0XHRcdFx0XHRsYXN0ZXF1YWxpdHkgPSBkaWZmc1sgcG9pbnRlciBdWyAxIF07XG5cdFx0XHRcdH0gZWxzZSB7XG5cblx0XHRcdFx0XHQvLyBOb3QgYSBjYW5kaWRhdGUsIGFuZCBjYW4gbmV2ZXIgYmVjb21lIG9uZS5cblx0XHRcdFx0XHRlcXVhbGl0aWVzTGVuZ3RoID0gMDtcblx0XHRcdFx0XHRsYXN0ZXF1YWxpdHkgPSBudWxsO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHBvc3RJbnMgPSBwb3N0RGVsID0gZmFsc2U7XG5cblx0XHRcdC8vIEFuIGluc2VydGlvbiBvciBkZWxldGlvbi5cblx0XHRcdH0gZWxzZSB7XG5cblx0XHRcdFx0aWYgKCBkaWZmc1sgcG9pbnRlciBdWyAwIF0gPT09IERJRkZfREVMRVRFICkge1xuXHRcdFx0XHRcdHBvc3REZWwgPSB0cnVlO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHBvc3RJbnMgPSB0cnVlO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Lypcblx0XHRcdFx0ICogRml2ZSB0eXBlcyB0byBiZSBzcGxpdDpcblx0XHRcdFx0ICogPGlucz5BPC9pbnM+PGRlbD5CPC9kZWw+WFk8aW5zPkM8L2lucz48ZGVsPkQ8L2RlbD5cblx0XHRcdFx0ICogPGlucz5BPC9pbnM+WDxpbnM+QzwvaW5zPjxkZWw+RDwvZGVsPlxuXHRcdFx0XHQgKiA8aW5zPkE8L2lucz48ZGVsPkI8L2RlbD5YPGlucz5DPC9pbnM+XG5cdFx0XHRcdCAqIDxpbnM+QTwvZGVsPlg8aW5zPkM8L2lucz48ZGVsPkQ8L2RlbD5cblx0XHRcdFx0ICogPGlucz5BPC9pbnM+PGRlbD5CPC9kZWw+WDxkZWw+QzwvZGVsPlxuXHRcdFx0XHQgKi9cblx0XHRcdFx0aWYgKCBsYXN0ZXF1YWxpdHkgJiYgKCAoIHByZUlucyAmJiBwcmVEZWwgJiYgcG9zdElucyAmJiBwb3N0RGVsICkgfHxcblx0XHRcdFx0XHRcdCggKCBsYXN0ZXF1YWxpdHkubGVuZ3RoIDwgMiApICYmXG5cdFx0XHRcdFx0XHQoIHByZUlucyArIHByZURlbCArIHBvc3RJbnMgKyBwb3N0RGVsICkgPT09IDMgKSApICkge1xuXG5cdFx0XHRcdFx0Ly8gRHVwbGljYXRlIHJlY29yZC5cblx0XHRcdFx0XHRkaWZmcy5zcGxpY2UoXG5cdFx0XHRcdFx0XHRlcXVhbGl0aWVzWyBlcXVhbGl0aWVzTGVuZ3RoIC0gMSBdLFxuXHRcdFx0XHRcdFx0MCxcblx0XHRcdFx0XHRcdFsgRElGRl9ERUxFVEUsIGxhc3RlcXVhbGl0eSBdXG5cdFx0XHRcdFx0KTtcblxuXHRcdFx0XHRcdC8vIENoYW5nZSBzZWNvbmQgY29weSB0byBpbnNlcnQuXG5cdFx0XHRcdFx0ZGlmZnNbIGVxdWFsaXRpZXNbIGVxdWFsaXRpZXNMZW5ndGggLSAxIF0gKyAxIF1bIDAgXSA9IERJRkZfSU5TRVJUO1xuXHRcdFx0XHRcdGVxdWFsaXRpZXNMZW5ndGgtLTsgLy8gVGhyb3cgYXdheSB0aGUgZXF1YWxpdHkgd2UganVzdCBkZWxldGVkO1xuXHRcdFx0XHRcdGxhc3RlcXVhbGl0eSA9IG51bGw7XG5cdFx0XHRcdFx0aWYgKCBwcmVJbnMgJiYgcHJlRGVsICkge1xuXG5cdFx0XHRcdFx0XHQvLyBObyBjaGFuZ2VzIG1hZGUgd2hpY2ggY291bGQgYWZmZWN0IHByZXZpb3VzIGVudHJ5LCBrZWVwIGdvaW5nLlxuXHRcdFx0XHRcdFx0cG9zdElucyA9IHBvc3REZWwgPSB0cnVlO1xuXHRcdFx0XHRcdFx0ZXF1YWxpdGllc0xlbmd0aCA9IDA7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdGVxdWFsaXRpZXNMZW5ndGgtLTsgLy8gVGhyb3cgYXdheSB0aGUgcHJldmlvdXMgZXF1YWxpdHkuXG5cdFx0XHRcdFx0XHRwb2ludGVyID0gZXF1YWxpdGllc0xlbmd0aCA+IDAgPyBlcXVhbGl0aWVzWyBlcXVhbGl0aWVzTGVuZ3RoIC0gMSBdIDogLTE7XG5cdFx0XHRcdFx0XHRwb3N0SW5zID0gcG9zdERlbCA9IGZhbHNlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRjaGFuZ2VzID0gdHJ1ZTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0cG9pbnRlcisrO1xuXHRcdH1cblxuXHRcdGlmICggY2hhbmdlcyApIHtcblx0XHRcdHRoaXMuZGlmZkNsZWFudXBNZXJnZSggZGlmZnMgKTtcblx0XHR9XG5cdH07XG5cblx0LyoqXG5cdCAqIENvbnZlcnQgYSBkaWZmIGFycmF5IGludG8gYSBwcmV0dHkgSFRNTCByZXBvcnQuXG5cdCAqIEBwYXJhbSB7IUFycmF5LjwhRGlmZk1hdGNoUGF0Y2guRGlmZj59IGRpZmZzIEFycmF5IG9mIGRpZmYgdHVwbGVzLlxuXHQgKiBAcGFyYW0ge2ludGVnZXJ9IHN0cmluZyB0byBiZSBiZWF1dGlmaWVkLlxuXHQgKiBAcmV0dXJuIHtzdHJpbmd9IEhUTUwgcmVwcmVzZW50YXRpb24uXG5cdCAqL1xuXHREaWZmTWF0Y2hQYXRjaC5wcm90b3R5cGUuZGlmZlByZXR0eUh0bWwgPSBmdW5jdGlvbiggZGlmZnMgKSB7XG5cdFx0dmFyIG9wLCBkYXRhLCB4LFxuXHRcdFx0aHRtbCA9IFtdO1xuXHRcdGZvciAoIHggPSAwOyB4IDwgZGlmZnMubGVuZ3RoOyB4KysgKSB7XG5cdFx0XHRvcCA9IGRpZmZzWyB4IF1bIDAgXTsgLy8gT3BlcmF0aW9uIChpbnNlcnQsIGRlbGV0ZSwgZXF1YWwpXG5cdFx0XHRkYXRhID0gZGlmZnNbIHggXVsgMSBdOyAvLyBUZXh0IG9mIGNoYW5nZS5cblx0XHRcdHN3aXRjaCAoIG9wICkge1xuXHRcdFx0Y2FzZSBESUZGX0lOU0VSVDpcblx0XHRcdFx0aHRtbFsgeCBdID0gXCI8aW5zPlwiICsgZXNjYXBlVGV4dCggZGF0YSApICsgXCI8L2lucz5cIjtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlIERJRkZfREVMRVRFOlxuXHRcdFx0XHRodG1sWyB4IF0gPSBcIjxkZWw+XCIgKyBlc2NhcGVUZXh0KCBkYXRhICkgKyBcIjwvZGVsPlwiO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgRElGRl9FUVVBTDpcblx0XHRcdFx0aHRtbFsgeCBdID0gXCI8c3Bhbj5cIiArIGVzY2FwZVRleHQoIGRhdGEgKSArIFwiPC9zcGFuPlwiO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIGh0bWwuam9pbiggXCJcIiApO1xuXHR9O1xuXG5cdC8qKlxuXHQgKiBEZXRlcm1pbmUgdGhlIGNvbW1vbiBwcmVmaXggb2YgdHdvIHN0cmluZ3MuXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0MSBGaXJzdCBzdHJpbmcuXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0MiBTZWNvbmQgc3RyaW5nLlxuXHQgKiBAcmV0dXJuIHtudW1iZXJ9IFRoZSBudW1iZXIgb2YgY2hhcmFjdGVycyBjb21tb24gdG8gdGhlIHN0YXJ0IG9mIGVhY2hcblx0ICogICAgIHN0cmluZy5cblx0ICovXG5cdERpZmZNYXRjaFBhdGNoLnByb3RvdHlwZS5kaWZmQ29tbW9uUHJlZml4ID0gZnVuY3Rpb24oIHRleHQxLCB0ZXh0MiApIHtcblx0XHR2YXIgcG9pbnRlcm1pZCwgcG9pbnRlcm1heCwgcG9pbnRlcm1pbiwgcG9pbnRlcnN0YXJ0O1xuXG5cdFx0Ly8gUXVpY2sgY2hlY2sgZm9yIGNvbW1vbiBudWxsIGNhc2VzLlxuXHRcdGlmICggIXRleHQxIHx8ICF0ZXh0MiB8fCB0ZXh0MS5jaGFyQXQoIDAgKSAhPT0gdGV4dDIuY2hhckF0KCAwICkgKSB7XG5cdFx0XHRyZXR1cm4gMDtcblx0XHR9XG5cblx0XHQvLyBCaW5hcnkgc2VhcmNoLlxuXHRcdC8vIFBlcmZvcm1hbmNlIGFuYWx5c2lzOiBodHRwczovL25laWwuZnJhc2VyLm5hbWUvbmV3cy8yMDA3LzEwLzA5L1xuXHRcdHBvaW50ZXJtaW4gPSAwO1xuXHRcdHBvaW50ZXJtYXggPSBNYXRoLm1pbiggdGV4dDEubGVuZ3RoLCB0ZXh0Mi5sZW5ndGggKTtcblx0XHRwb2ludGVybWlkID0gcG9pbnRlcm1heDtcblx0XHRwb2ludGVyc3RhcnQgPSAwO1xuXHRcdHdoaWxlICggcG9pbnRlcm1pbiA8IHBvaW50ZXJtaWQgKSB7XG5cdFx0XHRpZiAoIHRleHQxLnN1YnN0cmluZyggcG9pbnRlcnN0YXJ0LCBwb2ludGVybWlkICkgPT09XG5cdFx0XHRcdFx0dGV4dDIuc3Vic3RyaW5nKCBwb2ludGVyc3RhcnQsIHBvaW50ZXJtaWQgKSApIHtcblx0XHRcdFx0cG9pbnRlcm1pbiA9IHBvaW50ZXJtaWQ7XG5cdFx0XHRcdHBvaW50ZXJzdGFydCA9IHBvaW50ZXJtaW47XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRwb2ludGVybWF4ID0gcG9pbnRlcm1pZDtcblx0XHRcdH1cblx0XHRcdHBvaW50ZXJtaWQgPSBNYXRoLmZsb29yKCAoIHBvaW50ZXJtYXggLSBwb2ludGVybWluICkgLyAyICsgcG9pbnRlcm1pbiApO1xuXHRcdH1cblx0XHRyZXR1cm4gcG9pbnRlcm1pZDtcblx0fTtcblxuXHQvKipcblx0ICogRGV0ZXJtaW5lIHRoZSBjb21tb24gc3VmZml4IG9mIHR3byBzdHJpbmdzLlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gdGV4dDEgRmlyc3Qgc3RyaW5nLlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gdGV4dDIgU2Vjb25kIHN0cmluZy5cblx0ICogQHJldHVybiB7bnVtYmVyfSBUaGUgbnVtYmVyIG9mIGNoYXJhY3RlcnMgY29tbW9uIHRvIHRoZSBlbmQgb2YgZWFjaCBzdHJpbmcuXG5cdCAqL1xuXHREaWZmTWF0Y2hQYXRjaC5wcm90b3R5cGUuZGlmZkNvbW1vblN1ZmZpeCA9IGZ1bmN0aW9uKCB0ZXh0MSwgdGV4dDIgKSB7XG5cdFx0dmFyIHBvaW50ZXJtaWQsIHBvaW50ZXJtYXgsIHBvaW50ZXJtaW4sIHBvaW50ZXJlbmQ7XG5cblx0XHQvLyBRdWljayBjaGVjayBmb3IgY29tbW9uIG51bGwgY2FzZXMuXG5cdFx0aWYgKCAhdGV4dDEgfHxcblx0XHRcdFx0IXRleHQyIHx8XG5cdFx0XHRcdHRleHQxLmNoYXJBdCggdGV4dDEubGVuZ3RoIC0gMSApICE9PSB0ZXh0Mi5jaGFyQXQoIHRleHQyLmxlbmd0aCAtIDEgKSApIHtcblx0XHRcdHJldHVybiAwO1xuXHRcdH1cblxuXHRcdC8vIEJpbmFyeSBzZWFyY2guXG5cdFx0Ly8gUGVyZm9ybWFuY2UgYW5hbHlzaXM6IGh0dHBzOi8vbmVpbC5mcmFzZXIubmFtZS9uZXdzLzIwMDcvMTAvMDkvXG5cdFx0cG9pbnRlcm1pbiA9IDA7XG5cdFx0cG9pbnRlcm1heCA9IE1hdGgubWluKCB0ZXh0MS5sZW5ndGgsIHRleHQyLmxlbmd0aCApO1xuXHRcdHBvaW50ZXJtaWQgPSBwb2ludGVybWF4O1xuXHRcdHBvaW50ZXJlbmQgPSAwO1xuXHRcdHdoaWxlICggcG9pbnRlcm1pbiA8IHBvaW50ZXJtaWQgKSB7XG5cdFx0XHRpZiAoIHRleHQxLnN1YnN0cmluZyggdGV4dDEubGVuZ3RoIC0gcG9pbnRlcm1pZCwgdGV4dDEubGVuZ3RoIC0gcG9pbnRlcmVuZCApID09PVxuXHRcdFx0XHRcdHRleHQyLnN1YnN0cmluZyggdGV4dDIubGVuZ3RoIC0gcG9pbnRlcm1pZCwgdGV4dDIubGVuZ3RoIC0gcG9pbnRlcmVuZCApICkge1xuXHRcdFx0XHRwb2ludGVybWluID0gcG9pbnRlcm1pZDtcblx0XHRcdFx0cG9pbnRlcmVuZCA9IHBvaW50ZXJtaW47XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRwb2ludGVybWF4ID0gcG9pbnRlcm1pZDtcblx0XHRcdH1cblx0XHRcdHBvaW50ZXJtaWQgPSBNYXRoLmZsb29yKCAoIHBvaW50ZXJtYXggLSBwb2ludGVybWluICkgLyAyICsgcG9pbnRlcm1pbiApO1xuXHRcdH1cblx0XHRyZXR1cm4gcG9pbnRlcm1pZDtcblx0fTtcblxuXHQvKipcblx0ICogRmluZCB0aGUgZGlmZmVyZW5jZXMgYmV0d2VlbiB0d28gdGV4dHMuICBBc3N1bWVzIHRoYXQgdGhlIHRleHRzIGRvIG5vdFxuXHQgKiBoYXZlIGFueSBjb21tb24gcHJlZml4IG9yIHN1ZmZpeC5cblx0ICogQHBhcmFtIHtzdHJpbmd9IHRleHQxIE9sZCBzdHJpbmcgdG8gYmUgZGlmZmVkLlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gdGV4dDIgTmV3IHN0cmluZyB0byBiZSBkaWZmZWQuXG5cdCAqIEBwYXJhbSB7Ym9vbGVhbn0gY2hlY2tsaW5lcyBTcGVlZHVwIGZsYWcuICBJZiBmYWxzZSwgdGhlbiBkb24ndCBydW4gYVxuXHQgKiAgICAgbGluZS1sZXZlbCBkaWZmIGZpcnN0IHRvIGlkZW50aWZ5IHRoZSBjaGFuZ2VkIGFyZWFzLlxuXHQgKiAgICAgSWYgdHJ1ZSwgdGhlbiBydW4gYSBmYXN0ZXIsIHNsaWdodGx5IGxlc3Mgb3B0aW1hbCBkaWZmLlxuXHQgKiBAcGFyYW0ge251bWJlcn0gZGVhZGxpbmUgVGltZSB3aGVuIHRoZSBkaWZmIHNob3VsZCBiZSBjb21wbGV0ZSBieS5cblx0ICogQHJldHVybiB7IUFycmF5LjwhRGlmZk1hdGNoUGF0Y2guRGlmZj59IEFycmF5IG9mIGRpZmYgdHVwbGVzLlxuXHQgKiBAcHJpdmF0ZVxuXHQgKi9cblx0RGlmZk1hdGNoUGF0Y2gucHJvdG90eXBlLmRpZmZDb21wdXRlID0gZnVuY3Rpb24oIHRleHQxLCB0ZXh0MiwgY2hlY2tsaW5lcywgZGVhZGxpbmUgKSB7XG5cdFx0dmFyIGRpZmZzLCBsb25ndGV4dCwgc2hvcnR0ZXh0LCBpLCBobSxcblx0XHRcdHRleHQxQSwgdGV4dDJBLCB0ZXh0MUIsIHRleHQyQixcblx0XHRcdG1pZENvbW1vbiwgZGlmZnNBLCBkaWZmc0I7XG5cblx0XHRpZiAoICF0ZXh0MSApIHtcblxuXHRcdFx0Ly8gSnVzdCBhZGQgc29tZSB0ZXh0IChzcGVlZHVwKS5cblx0XHRcdHJldHVybiBbXG5cdFx0XHRcdFsgRElGRl9JTlNFUlQsIHRleHQyIF1cblx0XHRcdF07XG5cdFx0fVxuXG5cdFx0aWYgKCAhdGV4dDIgKSB7XG5cblx0XHRcdC8vIEp1c3QgZGVsZXRlIHNvbWUgdGV4dCAoc3BlZWR1cCkuXG5cdFx0XHRyZXR1cm4gW1xuXHRcdFx0XHRbIERJRkZfREVMRVRFLCB0ZXh0MSBdXG5cdFx0XHRdO1xuXHRcdH1cblxuXHRcdGxvbmd0ZXh0ID0gdGV4dDEubGVuZ3RoID4gdGV4dDIubGVuZ3RoID8gdGV4dDEgOiB0ZXh0Mjtcblx0XHRzaG9ydHRleHQgPSB0ZXh0MS5sZW5ndGggPiB0ZXh0Mi5sZW5ndGggPyB0ZXh0MiA6IHRleHQxO1xuXHRcdGkgPSBsb25ndGV4dC5pbmRleE9mKCBzaG9ydHRleHQgKTtcblx0XHRpZiAoIGkgIT09IC0xICkge1xuXG5cdFx0XHQvLyBTaG9ydGVyIHRleHQgaXMgaW5zaWRlIHRoZSBsb25nZXIgdGV4dCAoc3BlZWR1cCkuXG5cdFx0XHRkaWZmcyA9IFtcblx0XHRcdFx0WyBESUZGX0lOU0VSVCwgbG9uZ3RleHQuc3Vic3RyaW5nKCAwLCBpICkgXSxcblx0XHRcdFx0WyBESUZGX0VRVUFMLCBzaG9ydHRleHQgXSxcblx0XHRcdFx0WyBESUZGX0lOU0VSVCwgbG9uZ3RleHQuc3Vic3RyaW5nKCBpICsgc2hvcnR0ZXh0Lmxlbmd0aCApIF1cblx0XHRcdF07XG5cblx0XHRcdC8vIFN3YXAgaW5zZXJ0aW9ucyBmb3IgZGVsZXRpb25zIGlmIGRpZmYgaXMgcmV2ZXJzZWQuXG5cdFx0XHRpZiAoIHRleHQxLmxlbmd0aCA+IHRleHQyLmxlbmd0aCApIHtcblx0XHRcdFx0ZGlmZnNbIDAgXVsgMCBdID0gZGlmZnNbIDIgXVsgMCBdID0gRElGRl9ERUxFVEU7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gZGlmZnM7XG5cdFx0fVxuXG5cdFx0aWYgKCBzaG9ydHRleHQubGVuZ3RoID09PSAxICkge1xuXG5cdFx0XHQvLyBTaW5nbGUgY2hhcmFjdGVyIHN0cmluZy5cblx0XHRcdC8vIEFmdGVyIHRoZSBwcmV2aW91cyBzcGVlZHVwLCB0aGUgY2hhcmFjdGVyIGNhbid0IGJlIGFuIGVxdWFsaXR5LlxuXHRcdFx0cmV0dXJuIFtcblx0XHRcdFx0WyBESUZGX0RFTEVURSwgdGV4dDEgXSxcblx0XHRcdFx0WyBESUZGX0lOU0VSVCwgdGV4dDIgXVxuXHRcdFx0XTtcblx0XHR9XG5cblx0XHQvLyBDaGVjayB0byBzZWUgaWYgdGhlIHByb2JsZW0gY2FuIGJlIHNwbGl0IGluIHR3by5cblx0XHRobSA9IHRoaXMuZGlmZkhhbGZNYXRjaCggdGV4dDEsIHRleHQyICk7XG5cdFx0aWYgKCBobSApIHtcblxuXHRcdFx0Ly8gQSBoYWxmLW1hdGNoIHdhcyBmb3VuZCwgc29ydCBvdXQgdGhlIHJldHVybiBkYXRhLlxuXHRcdFx0dGV4dDFBID0gaG1bIDAgXTtcblx0XHRcdHRleHQxQiA9IGhtWyAxIF07XG5cdFx0XHR0ZXh0MkEgPSBobVsgMiBdO1xuXHRcdFx0dGV4dDJCID0gaG1bIDMgXTtcblx0XHRcdG1pZENvbW1vbiA9IGhtWyA0IF07XG5cblx0XHRcdC8vIFNlbmQgYm90aCBwYWlycyBvZmYgZm9yIHNlcGFyYXRlIHByb2Nlc3NpbmcuXG5cdFx0XHRkaWZmc0EgPSB0aGlzLkRpZmZNYWluKCB0ZXh0MUEsIHRleHQyQSwgY2hlY2tsaW5lcywgZGVhZGxpbmUgKTtcblx0XHRcdGRpZmZzQiA9IHRoaXMuRGlmZk1haW4oIHRleHQxQiwgdGV4dDJCLCBjaGVja2xpbmVzLCBkZWFkbGluZSApO1xuXG5cdFx0XHQvLyBNZXJnZSB0aGUgcmVzdWx0cy5cblx0XHRcdHJldHVybiBkaWZmc0EuY29uY2F0KCBbXG5cdFx0XHRcdFsgRElGRl9FUVVBTCwgbWlkQ29tbW9uIF1cblx0XHRcdF0sIGRpZmZzQiApO1xuXHRcdH1cblxuXHRcdGlmICggY2hlY2tsaW5lcyAmJiB0ZXh0MS5sZW5ndGggPiAxMDAgJiYgdGV4dDIubGVuZ3RoID4gMTAwICkge1xuXHRcdFx0cmV0dXJuIHRoaXMuZGlmZkxpbmVNb2RlKCB0ZXh0MSwgdGV4dDIsIGRlYWRsaW5lICk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRoaXMuZGlmZkJpc2VjdCggdGV4dDEsIHRleHQyLCBkZWFkbGluZSApO1xuXHR9O1xuXG5cdC8qKlxuXHQgKiBEbyB0aGUgdHdvIHRleHRzIHNoYXJlIGEgc3Vic3RyaW5nIHdoaWNoIGlzIGF0IGxlYXN0IGhhbGYgdGhlIGxlbmd0aCBvZiB0aGVcblx0ICogbG9uZ2VyIHRleHQ/XG5cdCAqIFRoaXMgc3BlZWR1cCBjYW4gcHJvZHVjZSBub24tbWluaW1hbCBkaWZmcy5cblx0ICogQHBhcmFtIHtzdHJpbmd9IHRleHQxIEZpcnN0IHN0cmluZy5cblx0ICogQHBhcmFtIHtzdHJpbmd9IHRleHQyIFNlY29uZCBzdHJpbmcuXG5cdCAqIEByZXR1cm4ge0FycmF5LjxzdHJpbmc+fSBGaXZlIGVsZW1lbnQgQXJyYXksIGNvbnRhaW5pbmcgdGhlIHByZWZpeCBvZlxuXHQgKiAgICAgdGV4dDEsIHRoZSBzdWZmaXggb2YgdGV4dDEsIHRoZSBwcmVmaXggb2YgdGV4dDIsIHRoZSBzdWZmaXggb2Zcblx0ICogICAgIHRleHQyIGFuZCB0aGUgY29tbW9uIG1pZGRsZS4gIE9yIG51bGwgaWYgdGhlcmUgd2FzIG5vIG1hdGNoLlxuXHQgKiBAcHJpdmF0ZVxuXHQgKi9cblx0RGlmZk1hdGNoUGF0Y2gucHJvdG90eXBlLmRpZmZIYWxmTWF0Y2ggPSBmdW5jdGlvbiggdGV4dDEsIHRleHQyICkge1xuXHRcdHZhciBsb25ndGV4dCwgc2hvcnR0ZXh0LCBkbXAsXG5cdFx0XHR0ZXh0MUEsIHRleHQyQiwgdGV4dDJBLCB0ZXh0MUIsIG1pZENvbW1vbixcblx0XHRcdGhtMSwgaG0yLCBobTtcblxuXHRcdGxvbmd0ZXh0ID0gdGV4dDEubGVuZ3RoID4gdGV4dDIubGVuZ3RoID8gdGV4dDEgOiB0ZXh0Mjtcblx0XHRzaG9ydHRleHQgPSB0ZXh0MS5sZW5ndGggPiB0ZXh0Mi5sZW5ndGggPyB0ZXh0MiA6IHRleHQxO1xuXHRcdGlmICggbG9uZ3RleHQubGVuZ3RoIDwgNCB8fCBzaG9ydHRleHQubGVuZ3RoICogMiA8IGxvbmd0ZXh0Lmxlbmd0aCApIHtcblx0XHRcdHJldHVybiBudWxsOyAvLyBQb2ludGxlc3MuXG5cdFx0fVxuXHRcdGRtcCA9IHRoaXM7IC8vICd0aGlzJyBiZWNvbWVzICd3aW5kb3cnIGluIGEgY2xvc3VyZS5cblxuXHRcdC8qKlxuXHRcdCAqIERvZXMgYSBzdWJzdHJpbmcgb2Ygc2hvcnR0ZXh0IGV4aXN0IHdpdGhpbiBsb25ndGV4dCBzdWNoIHRoYXQgdGhlIHN1YnN0cmluZ1xuXHRcdCAqIGlzIGF0IGxlYXN0IGhhbGYgdGhlIGxlbmd0aCBvZiBsb25ndGV4dD9cblx0XHQgKiBDbG9zdXJlLCBidXQgZG9lcyBub3QgcmVmZXJlbmNlIGFueSBleHRlcm5hbCB2YXJpYWJsZXMuXG5cdFx0ICogQHBhcmFtIHtzdHJpbmd9IGxvbmd0ZXh0IExvbmdlciBzdHJpbmcuXG5cdFx0ICogQHBhcmFtIHtzdHJpbmd9IHNob3J0dGV4dCBTaG9ydGVyIHN0cmluZy5cblx0XHQgKiBAcGFyYW0ge251bWJlcn0gaSBTdGFydCBpbmRleCBvZiBxdWFydGVyIGxlbmd0aCBzdWJzdHJpbmcgd2l0aGluIGxvbmd0ZXh0LlxuXHRcdCAqIEByZXR1cm4ge0FycmF5LjxzdHJpbmc+fSBGaXZlIGVsZW1lbnQgQXJyYXksIGNvbnRhaW5pbmcgdGhlIHByZWZpeCBvZlxuXHRcdCAqICAgICBsb25ndGV4dCwgdGhlIHN1ZmZpeCBvZiBsb25ndGV4dCwgdGhlIHByZWZpeCBvZiBzaG9ydHRleHQsIHRoZSBzdWZmaXhcblx0XHQgKiAgICAgb2Ygc2hvcnR0ZXh0IGFuZCB0aGUgY29tbW9uIG1pZGRsZS4gIE9yIG51bGwgaWYgdGhlcmUgd2FzIG5vIG1hdGNoLlxuXHRcdCAqIEBwcml2YXRlXG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gZGlmZkhhbGZNYXRjaEkoIGxvbmd0ZXh0LCBzaG9ydHRleHQsIGkgKSB7XG5cdFx0XHR2YXIgc2VlZCwgaiwgYmVzdENvbW1vbiwgcHJlZml4TGVuZ3RoLCBzdWZmaXhMZW5ndGgsXG5cdFx0XHRcdGJlc3RMb25ndGV4dEEsIGJlc3RMb25ndGV4dEIsIGJlc3RTaG9ydHRleHRBLCBiZXN0U2hvcnR0ZXh0QjtcblxuXHRcdFx0Ly8gU3RhcnQgd2l0aCBhIDEvNCBsZW5ndGggc3Vic3RyaW5nIGF0IHBvc2l0aW9uIGkgYXMgYSBzZWVkLlxuXHRcdFx0c2VlZCA9IGxvbmd0ZXh0LnN1YnN0cmluZyggaSwgaSArIE1hdGguZmxvb3IoIGxvbmd0ZXh0Lmxlbmd0aCAvIDQgKSApO1xuXHRcdFx0aiA9IC0xO1xuXHRcdFx0YmVzdENvbW1vbiA9IFwiXCI7XG5cdFx0XHR3aGlsZSAoICggaiA9IHNob3J0dGV4dC5pbmRleE9mKCBzZWVkLCBqICsgMSApICkgIT09IC0xICkge1xuXHRcdFx0XHRwcmVmaXhMZW5ndGggPSBkbXAuZGlmZkNvbW1vblByZWZpeCggbG9uZ3RleHQuc3Vic3RyaW5nKCBpICksXG5cdFx0XHRcdFx0c2hvcnR0ZXh0LnN1YnN0cmluZyggaiApICk7XG5cdFx0XHRcdHN1ZmZpeExlbmd0aCA9IGRtcC5kaWZmQ29tbW9uU3VmZml4KCBsb25ndGV4dC5zdWJzdHJpbmcoIDAsIGkgKSxcblx0XHRcdFx0XHRzaG9ydHRleHQuc3Vic3RyaW5nKCAwLCBqICkgKTtcblx0XHRcdFx0aWYgKCBiZXN0Q29tbW9uLmxlbmd0aCA8IHN1ZmZpeExlbmd0aCArIHByZWZpeExlbmd0aCApIHtcblx0XHRcdFx0XHRiZXN0Q29tbW9uID0gc2hvcnR0ZXh0LnN1YnN0cmluZyggaiAtIHN1ZmZpeExlbmd0aCwgaiApICtcblx0XHRcdFx0XHRcdHNob3J0dGV4dC5zdWJzdHJpbmcoIGosIGogKyBwcmVmaXhMZW5ndGggKTtcblx0XHRcdFx0XHRiZXN0TG9uZ3RleHRBID0gbG9uZ3RleHQuc3Vic3RyaW5nKCAwLCBpIC0gc3VmZml4TGVuZ3RoICk7XG5cdFx0XHRcdFx0YmVzdExvbmd0ZXh0QiA9IGxvbmd0ZXh0LnN1YnN0cmluZyggaSArIHByZWZpeExlbmd0aCApO1xuXHRcdFx0XHRcdGJlc3RTaG9ydHRleHRBID0gc2hvcnR0ZXh0LnN1YnN0cmluZyggMCwgaiAtIHN1ZmZpeExlbmd0aCApO1xuXHRcdFx0XHRcdGJlc3RTaG9ydHRleHRCID0gc2hvcnR0ZXh0LnN1YnN0cmluZyggaiArIHByZWZpeExlbmd0aCApO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRpZiAoIGJlc3RDb21tb24ubGVuZ3RoICogMiA+PSBsb25ndGV4dC5sZW5ndGggKSB7XG5cdFx0XHRcdHJldHVybiBbIGJlc3RMb25ndGV4dEEsIGJlc3RMb25ndGV4dEIsXG5cdFx0XHRcdFx0YmVzdFNob3J0dGV4dEEsIGJlc3RTaG9ydHRleHRCLCBiZXN0Q29tbW9uXG5cdFx0XHRcdF07XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRyZXR1cm4gbnVsbDtcblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBGaXJzdCBjaGVjayBpZiB0aGUgc2Vjb25kIHF1YXJ0ZXIgaXMgdGhlIHNlZWQgZm9yIGEgaGFsZi1tYXRjaC5cblx0XHRobTEgPSBkaWZmSGFsZk1hdGNoSSggbG9uZ3RleHQsIHNob3J0dGV4dCxcblx0XHRcdE1hdGguY2VpbCggbG9uZ3RleHQubGVuZ3RoIC8gNCApICk7XG5cblx0XHQvLyBDaGVjayBhZ2FpbiBiYXNlZCBvbiB0aGUgdGhpcmQgcXVhcnRlci5cblx0XHRobTIgPSBkaWZmSGFsZk1hdGNoSSggbG9uZ3RleHQsIHNob3J0dGV4dCxcblx0XHRcdE1hdGguY2VpbCggbG9uZ3RleHQubGVuZ3RoIC8gMiApICk7XG5cdFx0aWYgKCAhaG0xICYmICFobTIgKSB7XG5cdFx0XHRyZXR1cm4gbnVsbDtcblx0XHR9IGVsc2UgaWYgKCAhaG0yICkge1xuXHRcdFx0aG0gPSBobTE7XG5cdFx0fSBlbHNlIGlmICggIWhtMSApIHtcblx0XHRcdGhtID0gaG0yO1xuXHRcdH0gZWxzZSB7XG5cblx0XHRcdC8vIEJvdGggbWF0Y2hlZC4gIFNlbGVjdCB0aGUgbG9uZ2VzdC5cblx0XHRcdGhtID0gaG0xWyA0IF0ubGVuZ3RoID4gaG0yWyA0IF0ubGVuZ3RoID8gaG0xIDogaG0yO1xuXHRcdH1cblxuXHRcdC8vIEEgaGFsZi1tYXRjaCB3YXMgZm91bmQsIHNvcnQgb3V0IHRoZSByZXR1cm4gZGF0YS5cblx0XHR0ZXh0MUEsIHRleHQxQiwgdGV4dDJBLCB0ZXh0MkI7XG5cdFx0aWYgKCB0ZXh0MS5sZW5ndGggPiB0ZXh0Mi5sZW5ndGggKSB7XG5cdFx0XHR0ZXh0MUEgPSBobVsgMCBdO1xuXHRcdFx0dGV4dDFCID0gaG1bIDEgXTtcblx0XHRcdHRleHQyQSA9IGhtWyAyIF07XG5cdFx0XHR0ZXh0MkIgPSBobVsgMyBdO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0ZXh0MkEgPSBobVsgMCBdO1xuXHRcdFx0dGV4dDJCID0gaG1bIDEgXTtcblx0XHRcdHRleHQxQSA9IGhtWyAyIF07XG5cdFx0XHR0ZXh0MUIgPSBobVsgMyBdO1xuXHRcdH1cblx0XHRtaWRDb21tb24gPSBobVsgNCBdO1xuXHRcdHJldHVybiBbIHRleHQxQSwgdGV4dDFCLCB0ZXh0MkEsIHRleHQyQiwgbWlkQ29tbW9uIF07XG5cdH07XG5cblx0LyoqXG5cdCAqIERvIGEgcXVpY2sgbGluZS1sZXZlbCBkaWZmIG9uIGJvdGggc3RyaW5ncywgdGhlbiByZWRpZmYgdGhlIHBhcnRzIGZvclxuXHQgKiBncmVhdGVyIGFjY3VyYWN5LlxuXHQgKiBUaGlzIHNwZWVkdXAgY2FuIHByb2R1Y2Ugbm9uLW1pbmltYWwgZGlmZnMuXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0MSBPbGQgc3RyaW5nIHRvIGJlIGRpZmZlZC5cblx0ICogQHBhcmFtIHtzdHJpbmd9IHRleHQyIE5ldyBzdHJpbmcgdG8gYmUgZGlmZmVkLlxuXHQgKiBAcGFyYW0ge251bWJlcn0gZGVhZGxpbmUgVGltZSB3aGVuIHRoZSBkaWZmIHNob3VsZCBiZSBjb21wbGV0ZSBieS5cblx0ICogQHJldHVybiB7IUFycmF5LjwhRGlmZk1hdGNoUGF0Y2guRGlmZj59IEFycmF5IG9mIGRpZmYgdHVwbGVzLlxuXHQgKiBAcHJpdmF0ZVxuXHQgKi9cblx0RGlmZk1hdGNoUGF0Y2gucHJvdG90eXBlLmRpZmZMaW5lTW9kZSA9IGZ1bmN0aW9uKCB0ZXh0MSwgdGV4dDIsIGRlYWRsaW5lICkge1xuXHRcdHZhciBhLCBkaWZmcywgbGluZWFycmF5LCBwb2ludGVyLCBjb3VudEluc2VydCxcblx0XHRcdGNvdW50RGVsZXRlLCB0ZXh0SW5zZXJ0LCB0ZXh0RGVsZXRlLCBqO1xuXG5cdFx0Ly8gU2NhbiB0aGUgdGV4dCBvbiBhIGxpbmUtYnktbGluZSBiYXNpcyBmaXJzdC5cblx0XHRhID0gdGhpcy5kaWZmTGluZXNUb0NoYXJzKCB0ZXh0MSwgdGV4dDIgKTtcblx0XHR0ZXh0MSA9IGEuY2hhcnMxO1xuXHRcdHRleHQyID0gYS5jaGFyczI7XG5cdFx0bGluZWFycmF5ID0gYS5saW5lQXJyYXk7XG5cblx0XHRkaWZmcyA9IHRoaXMuRGlmZk1haW4oIHRleHQxLCB0ZXh0MiwgZmFsc2UsIGRlYWRsaW5lICk7XG5cblx0XHQvLyBDb252ZXJ0IHRoZSBkaWZmIGJhY2sgdG8gb3JpZ2luYWwgdGV4dC5cblx0XHR0aGlzLmRpZmZDaGFyc1RvTGluZXMoIGRpZmZzLCBsaW5lYXJyYXkgKTtcblxuXHRcdC8vIEVsaW1pbmF0ZSBmcmVhayBtYXRjaGVzIChlLmcuIGJsYW5rIGxpbmVzKVxuXHRcdHRoaXMuZGlmZkNsZWFudXBTZW1hbnRpYyggZGlmZnMgKTtcblxuXHRcdC8vIFJlZGlmZiBhbnkgcmVwbGFjZW1lbnQgYmxvY2tzLCB0aGlzIHRpbWUgY2hhcmFjdGVyLWJ5LWNoYXJhY3Rlci5cblx0XHQvLyBBZGQgYSBkdW1teSBlbnRyeSBhdCB0aGUgZW5kLlxuXHRcdGRpZmZzLnB1c2goIFsgRElGRl9FUVVBTCwgXCJcIiBdICk7XG5cdFx0cG9pbnRlciA9IDA7XG5cdFx0Y291bnREZWxldGUgPSAwO1xuXHRcdGNvdW50SW5zZXJ0ID0gMDtcblx0XHR0ZXh0RGVsZXRlID0gXCJcIjtcblx0XHR0ZXh0SW5zZXJ0ID0gXCJcIjtcblx0XHR3aGlsZSAoIHBvaW50ZXIgPCBkaWZmcy5sZW5ndGggKSB7XG5cdFx0XHRzd2l0Y2ggKCBkaWZmc1sgcG9pbnRlciBdWyAwIF0gKSB7XG5cdFx0XHRjYXNlIERJRkZfSU5TRVJUOlxuXHRcdFx0XHRjb3VudEluc2VydCsrO1xuXHRcdFx0XHR0ZXh0SW5zZXJ0ICs9IGRpZmZzWyBwb2ludGVyIF1bIDEgXTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlIERJRkZfREVMRVRFOlxuXHRcdFx0XHRjb3VudERlbGV0ZSsrO1xuXHRcdFx0XHR0ZXh0RGVsZXRlICs9IGRpZmZzWyBwb2ludGVyIF1bIDEgXTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlIERJRkZfRVFVQUw6XG5cblx0XHRcdFx0Ly8gVXBvbiByZWFjaGluZyBhbiBlcXVhbGl0eSwgY2hlY2sgZm9yIHByaW9yIHJlZHVuZGFuY2llcy5cblx0XHRcdFx0aWYgKCBjb3VudERlbGV0ZSA+PSAxICYmIGNvdW50SW5zZXJ0ID49IDEgKSB7XG5cblx0XHRcdFx0XHQvLyBEZWxldGUgdGhlIG9mZmVuZGluZyByZWNvcmRzIGFuZCBhZGQgdGhlIG1lcmdlZCBvbmVzLlxuXHRcdFx0XHRcdGRpZmZzLnNwbGljZSggcG9pbnRlciAtIGNvdW50RGVsZXRlIC0gY291bnRJbnNlcnQsXG5cdFx0XHRcdFx0XHRjb3VudERlbGV0ZSArIGNvdW50SW5zZXJ0ICk7XG5cdFx0XHRcdFx0cG9pbnRlciA9IHBvaW50ZXIgLSBjb3VudERlbGV0ZSAtIGNvdW50SW5zZXJ0O1xuXHRcdFx0XHRcdGEgPSB0aGlzLkRpZmZNYWluKCB0ZXh0RGVsZXRlLCB0ZXh0SW5zZXJ0LCBmYWxzZSwgZGVhZGxpbmUgKTtcblx0XHRcdFx0XHRmb3IgKCBqID0gYS5sZW5ndGggLSAxOyBqID49IDA7IGotLSApIHtcblx0XHRcdFx0XHRcdGRpZmZzLnNwbGljZSggcG9pbnRlciwgMCwgYVsgaiBdICk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHBvaW50ZXIgPSBwb2ludGVyICsgYS5sZW5ndGg7XG5cdFx0XHRcdH1cblx0XHRcdFx0Y291bnRJbnNlcnQgPSAwO1xuXHRcdFx0XHRjb3VudERlbGV0ZSA9IDA7XG5cdFx0XHRcdHRleHREZWxldGUgPSBcIlwiO1xuXHRcdFx0XHR0ZXh0SW5zZXJ0ID0gXCJcIjtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHR9XG5cdFx0XHRwb2ludGVyKys7XG5cdFx0fVxuXHRcdGRpZmZzLnBvcCgpOyAvLyBSZW1vdmUgdGhlIGR1bW15IGVudHJ5IGF0IHRoZSBlbmQuXG5cblx0XHRyZXR1cm4gZGlmZnM7XG5cdH07XG5cblx0LyoqXG5cdCAqIEZpbmQgdGhlICdtaWRkbGUgc25ha2UnIG9mIGEgZGlmZiwgc3BsaXQgdGhlIHByb2JsZW0gaW4gdHdvXG5cdCAqIGFuZCByZXR1cm4gdGhlIHJlY3Vyc2l2ZWx5IGNvbnN0cnVjdGVkIGRpZmYuXG5cdCAqIFNlZSBNeWVycyAxOTg2IHBhcGVyOiBBbiBPKE5EKSBEaWZmZXJlbmNlIEFsZ29yaXRobSBhbmQgSXRzIFZhcmlhdGlvbnMuXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0MSBPbGQgc3RyaW5nIHRvIGJlIGRpZmZlZC5cblx0ICogQHBhcmFtIHtzdHJpbmd9IHRleHQyIE5ldyBzdHJpbmcgdG8gYmUgZGlmZmVkLlxuXHQgKiBAcGFyYW0ge251bWJlcn0gZGVhZGxpbmUgVGltZSBhdCB3aGljaCB0byBiYWlsIGlmIG5vdCB5ZXQgY29tcGxldGUuXG5cdCAqIEByZXR1cm4geyFBcnJheS48IURpZmZNYXRjaFBhdGNoLkRpZmY+fSBBcnJheSBvZiBkaWZmIHR1cGxlcy5cblx0ICogQHByaXZhdGVcblx0ICovXG5cdERpZmZNYXRjaFBhdGNoLnByb3RvdHlwZS5kaWZmQmlzZWN0ID0gZnVuY3Rpb24oIHRleHQxLCB0ZXh0MiwgZGVhZGxpbmUgKSB7XG5cdFx0dmFyIHRleHQxTGVuZ3RoLCB0ZXh0Mkxlbmd0aCwgbWF4RCwgdk9mZnNldCwgdkxlbmd0aCxcblx0XHRcdHYxLCB2MiwgeCwgZGVsdGEsIGZyb250LCBrMXN0YXJ0LCBrMWVuZCwgazJzdGFydCxcblx0XHRcdGsyZW5kLCBrMk9mZnNldCwgazFPZmZzZXQsIHgxLCB4MiwgeTEsIHkyLCBkLCBrMSwgazI7XG5cblx0XHQvLyBDYWNoZSB0aGUgdGV4dCBsZW5ndGhzIHRvIHByZXZlbnQgbXVsdGlwbGUgY2FsbHMuXG5cdFx0dGV4dDFMZW5ndGggPSB0ZXh0MS5sZW5ndGg7XG5cdFx0dGV4dDJMZW5ndGggPSB0ZXh0Mi5sZW5ndGg7XG5cdFx0bWF4RCA9IE1hdGguY2VpbCggKCB0ZXh0MUxlbmd0aCArIHRleHQyTGVuZ3RoICkgLyAyICk7XG5cdFx0dk9mZnNldCA9IG1heEQ7XG5cdFx0dkxlbmd0aCA9IDIgKiBtYXhEO1xuXHRcdHYxID0gbmV3IEFycmF5KCB2TGVuZ3RoICk7XG5cdFx0djIgPSBuZXcgQXJyYXkoIHZMZW5ndGggKTtcblxuXHRcdC8vIFNldHRpbmcgYWxsIGVsZW1lbnRzIHRvIC0xIGlzIGZhc3RlciBpbiBDaHJvbWUgJiBGaXJlZm94IHRoYW4gbWl4aW5nXG5cdFx0Ly8gaW50ZWdlcnMgYW5kIHVuZGVmaW5lZC5cblx0XHRmb3IgKCB4ID0gMDsgeCA8IHZMZW5ndGg7IHgrKyApIHtcblx0XHRcdHYxWyB4IF0gPSAtMTtcblx0XHRcdHYyWyB4IF0gPSAtMTtcblx0XHR9XG5cdFx0djFbIHZPZmZzZXQgKyAxIF0gPSAwO1xuXHRcdHYyWyB2T2Zmc2V0ICsgMSBdID0gMDtcblx0XHRkZWx0YSA9IHRleHQxTGVuZ3RoIC0gdGV4dDJMZW5ndGg7XG5cblx0XHQvLyBJZiB0aGUgdG90YWwgbnVtYmVyIG9mIGNoYXJhY3RlcnMgaXMgb2RkLCB0aGVuIHRoZSBmcm9udCBwYXRoIHdpbGwgY29sbGlkZVxuXHRcdC8vIHdpdGggdGhlIHJldmVyc2UgcGF0aC5cblx0XHRmcm9udCA9ICggZGVsdGEgJSAyICE9PSAwICk7XG5cblx0XHQvLyBPZmZzZXRzIGZvciBzdGFydCBhbmQgZW5kIG9mIGsgbG9vcC5cblx0XHQvLyBQcmV2ZW50cyBtYXBwaW5nIG9mIHNwYWNlIGJleW9uZCB0aGUgZ3JpZC5cblx0XHRrMXN0YXJ0ID0gMDtcblx0XHRrMWVuZCA9IDA7XG5cdFx0azJzdGFydCA9IDA7XG5cdFx0azJlbmQgPSAwO1xuXHRcdGZvciAoIGQgPSAwOyBkIDwgbWF4RDsgZCsrICkge1xuXG5cdFx0XHQvLyBCYWlsIG91dCBpZiBkZWFkbGluZSBpcyByZWFjaGVkLlxuXHRcdFx0aWYgKCAoIG5ldyBEYXRlKCkgKS5nZXRUaW1lKCkgPiBkZWFkbGluZSApIHtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHR9XG5cblx0XHRcdC8vIFdhbGsgdGhlIGZyb250IHBhdGggb25lIHN0ZXAuXG5cdFx0XHRmb3IgKCBrMSA9IC1kICsgazFzdGFydDsgazEgPD0gZCAtIGsxZW5kOyBrMSArPSAyICkge1xuXHRcdFx0XHRrMU9mZnNldCA9IHZPZmZzZXQgKyBrMTtcblx0XHRcdFx0aWYgKCBrMSA9PT0gLWQgfHwgKCBrMSAhPT0gZCAmJiB2MVsgazFPZmZzZXQgLSAxIF0gPCB2MVsgazFPZmZzZXQgKyAxIF0gKSApIHtcblx0XHRcdFx0XHR4MSA9IHYxWyBrMU9mZnNldCArIDEgXTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHR4MSA9IHYxWyBrMU9mZnNldCAtIDEgXSArIDE7XG5cdFx0XHRcdH1cblx0XHRcdFx0eTEgPSB4MSAtIGsxO1xuXHRcdFx0XHR3aGlsZSAoIHgxIDwgdGV4dDFMZW5ndGggJiYgeTEgPCB0ZXh0Mkxlbmd0aCAmJlxuXHRcdFx0XHRcdHRleHQxLmNoYXJBdCggeDEgKSA9PT0gdGV4dDIuY2hhckF0KCB5MSApICkge1xuXHRcdFx0XHRcdHgxKys7XG5cdFx0XHRcdFx0eTErKztcblx0XHRcdFx0fVxuXHRcdFx0XHR2MVsgazFPZmZzZXQgXSA9IHgxO1xuXHRcdFx0XHRpZiAoIHgxID4gdGV4dDFMZW5ndGggKSB7XG5cblx0XHRcdFx0XHQvLyBSYW4gb2ZmIHRoZSByaWdodCBvZiB0aGUgZ3JhcGguXG5cdFx0XHRcdFx0azFlbmQgKz0gMjtcblx0XHRcdFx0fSBlbHNlIGlmICggeTEgPiB0ZXh0Mkxlbmd0aCApIHtcblxuXHRcdFx0XHRcdC8vIFJhbiBvZmYgdGhlIGJvdHRvbSBvZiB0aGUgZ3JhcGguXG5cdFx0XHRcdFx0azFzdGFydCArPSAyO1xuXHRcdFx0XHR9IGVsc2UgaWYgKCBmcm9udCApIHtcblx0XHRcdFx0XHRrMk9mZnNldCA9IHZPZmZzZXQgKyBkZWx0YSAtIGsxO1xuXHRcdFx0XHRcdGlmICggazJPZmZzZXQgPj0gMCAmJiBrMk9mZnNldCA8IHZMZW5ndGggJiYgdjJbIGsyT2Zmc2V0IF0gIT09IC0xICkge1xuXG5cdFx0XHRcdFx0XHQvLyBNaXJyb3IgeDIgb250byB0b3AtbGVmdCBjb29yZGluYXRlIHN5c3RlbS5cblx0XHRcdFx0XHRcdHgyID0gdGV4dDFMZW5ndGggLSB2MlsgazJPZmZzZXQgXTtcblx0XHRcdFx0XHRcdGlmICggeDEgPj0geDIgKSB7XG5cblx0XHRcdFx0XHRcdFx0Ly8gT3ZlcmxhcCBkZXRlY3RlZC5cblx0XHRcdFx0XHRcdFx0cmV0dXJuIHRoaXMuZGlmZkJpc2VjdFNwbGl0KCB0ZXh0MSwgdGV4dDIsIHgxLCB5MSwgZGVhZGxpbmUgKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0Ly8gV2FsayB0aGUgcmV2ZXJzZSBwYXRoIG9uZSBzdGVwLlxuXHRcdFx0Zm9yICggazIgPSAtZCArIGsyc3RhcnQ7IGsyIDw9IGQgLSBrMmVuZDsgazIgKz0gMiApIHtcblx0XHRcdFx0azJPZmZzZXQgPSB2T2Zmc2V0ICsgazI7XG5cdFx0XHRcdGlmICggazIgPT09IC1kIHx8ICggazIgIT09IGQgJiYgdjJbIGsyT2Zmc2V0IC0gMSBdIDwgdjJbIGsyT2Zmc2V0ICsgMSBdICkgKSB7XG5cdFx0XHRcdFx0eDIgPSB2MlsgazJPZmZzZXQgKyAxIF07XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0eDIgPSB2MlsgazJPZmZzZXQgLSAxIF0gKyAxO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHkyID0geDIgLSBrMjtcblx0XHRcdFx0d2hpbGUgKCB4MiA8IHRleHQxTGVuZ3RoICYmIHkyIDwgdGV4dDJMZW5ndGggJiZcblx0XHRcdFx0XHR0ZXh0MS5jaGFyQXQoIHRleHQxTGVuZ3RoIC0geDIgLSAxICkgPT09XG5cdFx0XHRcdFx0dGV4dDIuY2hhckF0KCB0ZXh0Mkxlbmd0aCAtIHkyIC0gMSApICkge1xuXHRcdFx0XHRcdHgyKys7XG5cdFx0XHRcdFx0eTIrKztcblx0XHRcdFx0fVxuXHRcdFx0XHR2MlsgazJPZmZzZXQgXSA9IHgyO1xuXHRcdFx0XHRpZiAoIHgyID4gdGV4dDFMZW5ndGggKSB7XG5cblx0XHRcdFx0XHQvLyBSYW4gb2ZmIHRoZSBsZWZ0IG9mIHRoZSBncmFwaC5cblx0XHRcdFx0XHRrMmVuZCArPSAyO1xuXHRcdFx0XHR9IGVsc2UgaWYgKCB5MiA+IHRleHQyTGVuZ3RoICkge1xuXG5cdFx0XHRcdFx0Ly8gUmFuIG9mZiB0aGUgdG9wIG9mIHRoZSBncmFwaC5cblx0XHRcdFx0XHRrMnN0YXJ0ICs9IDI7XG5cdFx0XHRcdH0gZWxzZSBpZiAoICFmcm9udCApIHtcblx0XHRcdFx0XHRrMU9mZnNldCA9IHZPZmZzZXQgKyBkZWx0YSAtIGsyO1xuXHRcdFx0XHRcdGlmICggazFPZmZzZXQgPj0gMCAmJiBrMU9mZnNldCA8IHZMZW5ndGggJiYgdjFbIGsxT2Zmc2V0IF0gIT09IC0xICkge1xuXHRcdFx0XHRcdFx0eDEgPSB2MVsgazFPZmZzZXQgXTtcblx0XHRcdFx0XHRcdHkxID0gdk9mZnNldCArIHgxIC0gazFPZmZzZXQ7XG5cblx0XHRcdFx0XHRcdC8vIE1pcnJvciB4MiBvbnRvIHRvcC1sZWZ0IGNvb3JkaW5hdGUgc3lzdGVtLlxuXHRcdFx0XHRcdFx0eDIgPSB0ZXh0MUxlbmd0aCAtIHgyO1xuXHRcdFx0XHRcdFx0aWYgKCB4MSA+PSB4MiApIHtcblxuXHRcdFx0XHRcdFx0XHQvLyBPdmVybGFwIGRldGVjdGVkLlxuXHRcdFx0XHRcdFx0XHRyZXR1cm4gdGhpcy5kaWZmQmlzZWN0U3BsaXQoIHRleHQxLCB0ZXh0MiwgeDEsIHkxLCBkZWFkbGluZSApO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIERpZmYgdG9vayB0b28gbG9uZyBhbmQgaGl0IHRoZSBkZWFkbGluZSBvclxuXHRcdC8vIG51bWJlciBvZiBkaWZmcyBlcXVhbHMgbnVtYmVyIG9mIGNoYXJhY3RlcnMsIG5vIGNvbW1vbmFsaXR5IGF0IGFsbC5cblx0XHRyZXR1cm4gW1xuXHRcdFx0WyBESUZGX0RFTEVURSwgdGV4dDEgXSxcblx0XHRcdFsgRElGRl9JTlNFUlQsIHRleHQyIF1cblx0XHRdO1xuXHR9O1xuXG5cdC8qKlxuXHQgKiBHaXZlbiB0aGUgbG9jYXRpb24gb2YgdGhlICdtaWRkbGUgc25ha2UnLCBzcGxpdCB0aGUgZGlmZiBpbiB0d28gcGFydHNcblx0ICogYW5kIHJlY3Vyc2UuXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0MSBPbGQgc3RyaW5nIHRvIGJlIGRpZmZlZC5cblx0ICogQHBhcmFtIHtzdHJpbmd9IHRleHQyIE5ldyBzdHJpbmcgdG8gYmUgZGlmZmVkLlxuXHQgKiBAcGFyYW0ge251bWJlcn0geCBJbmRleCBvZiBzcGxpdCBwb2ludCBpbiB0ZXh0MS5cblx0ICogQHBhcmFtIHtudW1iZXJ9IHkgSW5kZXggb2Ygc3BsaXQgcG9pbnQgaW4gdGV4dDIuXG5cdCAqIEBwYXJhbSB7bnVtYmVyfSBkZWFkbGluZSBUaW1lIGF0IHdoaWNoIHRvIGJhaWwgaWYgbm90IHlldCBjb21wbGV0ZS5cblx0ICogQHJldHVybiB7IUFycmF5LjwhRGlmZk1hdGNoUGF0Y2guRGlmZj59IEFycmF5IG9mIGRpZmYgdHVwbGVzLlxuXHQgKiBAcHJpdmF0ZVxuXHQgKi9cblx0RGlmZk1hdGNoUGF0Y2gucHJvdG90eXBlLmRpZmZCaXNlY3RTcGxpdCA9IGZ1bmN0aW9uKCB0ZXh0MSwgdGV4dDIsIHgsIHksIGRlYWRsaW5lICkge1xuXHRcdHZhciB0ZXh0MWEsIHRleHQxYiwgdGV4dDJhLCB0ZXh0MmIsIGRpZmZzLCBkaWZmc2I7XG5cdFx0dGV4dDFhID0gdGV4dDEuc3Vic3RyaW5nKCAwLCB4ICk7XG5cdFx0dGV4dDJhID0gdGV4dDIuc3Vic3RyaW5nKCAwLCB5ICk7XG5cdFx0dGV4dDFiID0gdGV4dDEuc3Vic3RyaW5nKCB4ICk7XG5cdFx0dGV4dDJiID0gdGV4dDIuc3Vic3RyaW5nKCB5ICk7XG5cblx0XHQvLyBDb21wdXRlIGJvdGggZGlmZnMgc2VyaWFsbHkuXG5cdFx0ZGlmZnMgPSB0aGlzLkRpZmZNYWluKCB0ZXh0MWEsIHRleHQyYSwgZmFsc2UsIGRlYWRsaW5lICk7XG5cdFx0ZGlmZnNiID0gdGhpcy5EaWZmTWFpbiggdGV4dDFiLCB0ZXh0MmIsIGZhbHNlLCBkZWFkbGluZSApO1xuXG5cdFx0cmV0dXJuIGRpZmZzLmNvbmNhdCggZGlmZnNiICk7XG5cdH07XG5cblx0LyoqXG5cdCAqIFJlZHVjZSB0aGUgbnVtYmVyIG9mIGVkaXRzIGJ5IGVsaW1pbmF0aW5nIHNlbWFudGljYWxseSB0cml2aWFsIGVxdWFsaXRpZXMuXG5cdCAqIEBwYXJhbSB7IUFycmF5LjwhRGlmZk1hdGNoUGF0Y2guRGlmZj59IGRpZmZzIEFycmF5IG9mIGRpZmYgdHVwbGVzLlxuXHQgKi9cblx0RGlmZk1hdGNoUGF0Y2gucHJvdG90eXBlLmRpZmZDbGVhbnVwU2VtYW50aWMgPSBmdW5jdGlvbiggZGlmZnMgKSB7XG5cdFx0dmFyIGNoYW5nZXMsIGVxdWFsaXRpZXMsIGVxdWFsaXRpZXNMZW5ndGgsIGxhc3RlcXVhbGl0eSxcblx0XHRcdHBvaW50ZXIsIGxlbmd0aEluc2VydGlvbnMyLCBsZW5ndGhEZWxldGlvbnMyLCBsZW5ndGhJbnNlcnRpb25zMSxcblx0XHRcdGxlbmd0aERlbGV0aW9uczEsIGRlbGV0aW9uLCBpbnNlcnRpb24sIG92ZXJsYXBMZW5ndGgxLCBvdmVybGFwTGVuZ3RoMjtcblx0XHRjaGFuZ2VzID0gZmFsc2U7XG5cdFx0ZXF1YWxpdGllcyA9IFtdOyAvLyBTdGFjayBvZiBpbmRpY2VzIHdoZXJlIGVxdWFsaXRpZXMgYXJlIGZvdW5kLlxuXHRcdGVxdWFsaXRpZXNMZW5ndGggPSAwOyAvLyBLZWVwaW5nIG91ciBvd24gbGVuZ3RoIHZhciBpcyBmYXN0ZXIgaW4gSlMuXG5cdFx0LyoqIEB0eXBlIHs/c3RyaW5nfSAqL1xuXHRcdGxhc3RlcXVhbGl0eSA9IG51bGw7XG5cblx0XHQvLyBBbHdheXMgZXF1YWwgdG8gZGlmZnNbZXF1YWxpdGllc1tlcXVhbGl0aWVzTGVuZ3RoIC0gMV1dWzFdXG5cdFx0cG9pbnRlciA9IDA7IC8vIEluZGV4IG9mIGN1cnJlbnQgcG9zaXRpb24uXG5cblx0XHQvLyBOdW1iZXIgb2YgY2hhcmFjdGVycyB0aGF0IGNoYW5nZWQgcHJpb3IgdG8gdGhlIGVxdWFsaXR5LlxuXHRcdGxlbmd0aEluc2VydGlvbnMxID0gMDtcblx0XHRsZW5ndGhEZWxldGlvbnMxID0gMDtcblxuXHRcdC8vIE51bWJlciBvZiBjaGFyYWN0ZXJzIHRoYXQgY2hhbmdlZCBhZnRlciB0aGUgZXF1YWxpdHkuXG5cdFx0bGVuZ3RoSW5zZXJ0aW9uczIgPSAwO1xuXHRcdGxlbmd0aERlbGV0aW9uczIgPSAwO1xuXHRcdHdoaWxlICggcG9pbnRlciA8IGRpZmZzLmxlbmd0aCApIHtcblx0XHRcdGlmICggZGlmZnNbIHBvaW50ZXIgXVsgMCBdID09PSBESUZGX0VRVUFMICkgeyAvLyBFcXVhbGl0eSBmb3VuZC5cblx0XHRcdFx0ZXF1YWxpdGllc1sgZXF1YWxpdGllc0xlbmd0aCsrIF0gPSBwb2ludGVyO1xuXHRcdFx0XHRsZW5ndGhJbnNlcnRpb25zMSA9IGxlbmd0aEluc2VydGlvbnMyO1xuXHRcdFx0XHRsZW5ndGhEZWxldGlvbnMxID0gbGVuZ3RoRGVsZXRpb25zMjtcblx0XHRcdFx0bGVuZ3RoSW5zZXJ0aW9uczIgPSAwO1xuXHRcdFx0XHRsZW5ndGhEZWxldGlvbnMyID0gMDtcblx0XHRcdFx0bGFzdGVxdWFsaXR5ID0gZGlmZnNbIHBvaW50ZXIgXVsgMSBdO1xuXHRcdFx0fSBlbHNlIHsgLy8gQW4gaW5zZXJ0aW9uIG9yIGRlbGV0aW9uLlxuXHRcdFx0XHRpZiAoIGRpZmZzWyBwb2ludGVyIF1bIDAgXSA9PT0gRElGRl9JTlNFUlQgKSB7XG5cdFx0XHRcdFx0bGVuZ3RoSW5zZXJ0aW9uczIgKz0gZGlmZnNbIHBvaW50ZXIgXVsgMSBdLmxlbmd0aDtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRsZW5ndGhEZWxldGlvbnMyICs9IGRpZmZzWyBwb2ludGVyIF1bIDEgXS5sZW5ndGg7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLyBFbGltaW5hdGUgYW4gZXF1YWxpdHkgdGhhdCBpcyBzbWFsbGVyIG9yIGVxdWFsIHRvIHRoZSBlZGl0cyBvbiBib3RoXG5cdFx0XHRcdC8vIHNpZGVzIG9mIGl0LlxuXHRcdFx0XHRpZiAoIGxhc3RlcXVhbGl0eSAmJiAoIGxhc3RlcXVhbGl0eS5sZW5ndGggPD1cblx0XHRcdFx0XHRcdE1hdGgubWF4KCBsZW5ndGhJbnNlcnRpb25zMSwgbGVuZ3RoRGVsZXRpb25zMSApICkgJiZcblx0XHRcdFx0XHRcdCggbGFzdGVxdWFsaXR5Lmxlbmd0aCA8PSBNYXRoLm1heCggbGVuZ3RoSW5zZXJ0aW9uczIsXG5cdFx0XHRcdFx0XHRcdGxlbmd0aERlbGV0aW9uczIgKSApICkge1xuXG5cdFx0XHRcdFx0Ly8gRHVwbGljYXRlIHJlY29yZC5cblx0XHRcdFx0XHRkaWZmcy5zcGxpY2UoXG5cdFx0XHRcdFx0XHRlcXVhbGl0aWVzWyBlcXVhbGl0aWVzTGVuZ3RoIC0gMSBdLFxuXHRcdFx0XHRcdFx0MCxcblx0XHRcdFx0XHRcdFsgRElGRl9ERUxFVEUsIGxhc3RlcXVhbGl0eSBdXG5cdFx0XHRcdFx0KTtcblxuXHRcdFx0XHRcdC8vIENoYW5nZSBzZWNvbmQgY29weSB0byBpbnNlcnQuXG5cdFx0XHRcdFx0ZGlmZnNbIGVxdWFsaXRpZXNbIGVxdWFsaXRpZXNMZW5ndGggLSAxIF0gKyAxIF1bIDAgXSA9IERJRkZfSU5TRVJUO1xuXG5cdFx0XHRcdFx0Ly8gVGhyb3cgYXdheSB0aGUgZXF1YWxpdHkgd2UganVzdCBkZWxldGVkLlxuXHRcdFx0XHRcdGVxdWFsaXRpZXNMZW5ndGgtLTtcblxuXHRcdFx0XHRcdC8vIFRocm93IGF3YXkgdGhlIHByZXZpb3VzIGVxdWFsaXR5IChpdCBuZWVkcyB0byBiZSByZWV2YWx1YXRlZCkuXG5cdFx0XHRcdFx0ZXF1YWxpdGllc0xlbmd0aC0tO1xuXHRcdFx0XHRcdHBvaW50ZXIgPSBlcXVhbGl0aWVzTGVuZ3RoID4gMCA/IGVxdWFsaXRpZXNbIGVxdWFsaXRpZXNMZW5ndGggLSAxIF0gOiAtMTtcblxuXHRcdFx0XHRcdC8vIFJlc2V0IHRoZSBjb3VudGVycy5cblx0XHRcdFx0XHRsZW5ndGhJbnNlcnRpb25zMSA9IDA7XG5cdFx0XHRcdFx0bGVuZ3RoRGVsZXRpb25zMSA9IDA7XG5cdFx0XHRcdFx0bGVuZ3RoSW5zZXJ0aW9uczIgPSAwO1xuXHRcdFx0XHRcdGxlbmd0aERlbGV0aW9uczIgPSAwO1xuXHRcdFx0XHRcdGxhc3RlcXVhbGl0eSA9IG51bGw7XG5cdFx0XHRcdFx0Y2hhbmdlcyA9IHRydWU7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdHBvaW50ZXIrKztcblx0XHR9XG5cblx0XHQvLyBOb3JtYWxpemUgdGhlIGRpZmYuXG5cdFx0aWYgKCBjaGFuZ2VzICkge1xuXHRcdFx0dGhpcy5kaWZmQ2xlYW51cE1lcmdlKCBkaWZmcyApO1xuXHRcdH1cblxuXHRcdC8vIEZpbmQgYW55IG92ZXJsYXBzIGJldHdlZW4gZGVsZXRpb25zIGFuZCBpbnNlcnRpb25zLlxuXHRcdC8vIGUuZzogPGRlbD5hYmN4eHg8L2RlbD48aW5zPnh4eGRlZjwvaW5zPlxuXHRcdC8vICAgLT4gPGRlbD5hYmM8L2RlbD54eHg8aW5zPmRlZjwvaW5zPlxuXHRcdC8vIGUuZzogPGRlbD54eHhhYmM8L2RlbD48aW5zPmRlZnh4eDwvaW5zPlxuXHRcdC8vICAgLT4gPGlucz5kZWY8L2lucz54eHg8ZGVsPmFiYzwvZGVsPlxuXHRcdC8vIE9ubHkgZXh0cmFjdCBhbiBvdmVybGFwIGlmIGl0IGlzIGFzIGJpZyBhcyB0aGUgZWRpdCBhaGVhZCBvciBiZWhpbmQgaXQuXG5cdFx0cG9pbnRlciA9IDE7XG5cdFx0d2hpbGUgKCBwb2ludGVyIDwgZGlmZnMubGVuZ3RoICkge1xuXHRcdFx0aWYgKCBkaWZmc1sgcG9pbnRlciAtIDEgXVsgMCBdID09PSBESUZGX0RFTEVURSAmJlxuXHRcdFx0XHRcdGRpZmZzWyBwb2ludGVyIF1bIDAgXSA9PT0gRElGRl9JTlNFUlQgKSB7XG5cdFx0XHRcdGRlbGV0aW9uID0gZGlmZnNbIHBvaW50ZXIgLSAxIF1bIDEgXTtcblx0XHRcdFx0aW5zZXJ0aW9uID0gZGlmZnNbIHBvaW50ZXIgXVsgMSBdO1xuXHRcdFx0XHRvdmVybGFwTGVuZ3RoMSA9IHRoaXMuZGlmZkNvbW1vbk92ZXJsYXAoIGRlbGV0aW9uLCBpbnNlcnRpb24gKTtcblx0XHRcdFx0b3ZlcmxhcExlbmd0aDIgPSB0aGlzLmRpZmZDb21tb25PdmVybGFwKCBpbnNlcnRpb24sIGRlbGV0aW9uICk7XG5cdFx0XHRcdGlmICggb3ZlcmxhcExlbmd0aDEgPj0gb3ZlcmxhcExlbmd0aDIgKSB7XG5cdFx0XHRcdFx0aWYgKCBvdmVybGFwTGVuZ3RoMSA+PSBkZWxldGlvbi5sZW5ndGggLyAyIHx8XG5cdFx0XHRcdFx0XHRcdG92ZXJsYXBMZW5ndGgxID49IGluc2VydGlvbi5sZW5ndGggLyAyICkge1xuXG5cdFx0XHRcdFx0XHQvLyBPdmVybGFwIGZvdW5kLiAgSW5zZXJ0IGFuIGVxdWFsaXR5IGFuZCB0cmltIHRoZSBzdXJyb3VuZGluZyBlZGl0cy5cblx0XHRcdFx0XHRcdGRpZmZzLnNwbGljZShcblx0XHRcdFx0XHRcdFx0cG9pbnRlcixcblx0XHRcdFx0XHRcdFx0MCxcblx0XHRcdFx0XHRcdFx0WyBESUZGX0VRVUFMLCBpbnNlcnRpb24uc3Vic3RyaW5nKCAwLCBvdmVybGFwTGVuZ3RoMSApIF1cblx0XHRcdFx0XHRcdCk7XG5cdFx0XHRcdFx0XHRkaWZmc1sgcG9pbnRlciAtIDEgXVsgMSBdID1cblx0XHRcdFx0XHRcdFx0ZGVsZXRpb24uc3Vic3RyaW5nKCAwLCBkZWxldGlvbi5sZW5ndGggLSBvdmVybGFwTGVuZ3RoMSApO1xuXHRcdFx0XHRcdFx0ZGlmZnNbIHBvaW50ZXIgKyAxIF1bIDEgXSA9IGluc2VydGlvbi5zdWJzdHJpbmcoIG92ZXJsYXBMZW5ndGgxICk7XG5cdFx0XHRcdFx0XHRwb2ludGVyKys7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGlmICggb3ZlcmxhcExlbmd0aDIgPj0gZGVsZXRpb24ubGVuZ3RoIC8gMiB8fFxuXHRcdFx0XHRcdFx0XHRvdmVybGFwTGVuZ3RoMiA+PSBpbnNlcnRpb24ubGVuZ3RoIC8gMiApIHtcblxuXHRcdFx0XHRcdFx0Ly8gUmV2ZXJzZSBvdmVybGFwIGZvdW5kLlxuXHRcdFx0XHRcdFx0Ly8gSW5zZXJ0IGFuIGVxdWFsaXR5IGFuZCBzd2FwIGFuZCB0cmltIHRoZSBzdXJyb3VuZGluZyBlZGl0cy5cblx0XHRcdFx0XHRcdGRpZmZzLnNwbGljZShcblx0XHRcdFx0XHRcdFx0cG9pbnRlcixcblx0XHRcdFx0XHRcdFx0MCxcblx0XHRcdFx0XHRcdFx0WyBESUZGX0VRVUFMLCBkZWxldGlvbi5zdWJzdHJpbmcoIDAsIG92ZXJsYXBMZW5ndGgyICkgXVxuXHRcdFx0XHRcdFx0KTtcblxuXHRcdFx0XHRcdFx0ZGlmZnNbIHBvaW50ZXIgLSAxIF1bIDAgXSA9IERJRkZfSU5TRVJUO1xuXHRcdFx0XHRcdFx0ZGlmZnNbIHBvaW50ZXIgLSAxIF1bIDEgXSA9XG5cdFx0XHRcdFx0XHRcdGluc2VydGlvbi5zdWJzdHJpbmcoIDAsIGluc2VydGlvbi5sZW5ndGggLSBvdmVybGFwTGVuZ3RoMiApO1xuXHRcdFx0XHRcdFx0ZGlmZnNbIHBvaW50ZXIgKyAxIF1bIDAgXSA9IERJRkZfREVMRVRFO1xuXHRcdFx0XHRcdFx0ZGlmZnNbIHBvaW50ZXIgKyAxIF1bIDEgXSA9XG5cdFx0XHRcdFx0XHRcdGRlbGV0aW9uLnN1YnN0cmluZyggb3ZlcmxhcExlbmd0aDIgKTtcblx0XHRcdFx0XHRcdHBvaW50ZXIrKztcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0cG9pbnRlcisrO1xuXHRcdFx0fVxuXHRcdFx0cG9pbnRlcisrO1xuXHRcdH1cblx0fTtcblxuXHQvKipcblx0ICogRGV0ZXJtaW5lIGlmIHRoZSBzdWZmaXggb2Ygb25lIHN0cmluZyBpcyB0aGUgcHJlZml4IG9mIGFub3RoZXIuXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0MSBGaXJzdCBzdHJpbmcuXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0MiBTZWNvbmQgc3RyaW5nLlxuXHQgKiBAcmV0dXJuIHtudW1iZXJ9IFRoZSBudW1iZXIgb2YgY2hhcmFjdGVycyBjb21tb24gdG8gdGhlIGVuZCBvZiB0aGUgZmlyc3Rcblx0ICogICAgIHN0cmluZyBhbmQgdGhlIHN0YXJ0IG9mIHRoZSBzZWNvbmQgc3RyaW5nLlxuXHQgKiBAcHJpdmF0ZVxuXHQgKi9cblx0RGlmZk1hdGNoUGF0Y2gucHJvdG90eXBlLmRpZmZDb21tb25PdmVybGFwID0gZnVuY3Rpb24oIHRleHQxLCB0ZXh0MiApIHtcblx0XHR2YXIgdGV4dDFMZW5ndGgsIHRleHQyTGVuZ3RoLCB0ZXh0TGVuZ3RoLFxuXHRcdFx0YmVzdCwgbGVuZ3RoLCBwYXR0ZXJuLCBmb3VuZDtcblxuXHRcdC8vIENhY2hlIHRoZSB0ZXh0IGxlbmd0aHMgdG8gcHJldmVudCBtdWx0aXBsZSBjYWxscy5cblx0XHR0ZXh0MUxlbmd0aCA9IHRleHQxLmxlbmd0aDtcblx0XHR0ZXh0Mkxlbmd0aCA9IHRleHQyLmxlbmd0aDtcblxuXHRcdC8vIEVsaW1pbmF0ZSB0aGUgbnVsbCBjYXNlLlxuXHRcdGlmICggdGV4dDFMZW5ndGggPT09IDAgfHwgdGV4dDJMZW5ndGggPT09IDAgKSB7XG5cdFx0XHRyZXR1cm4gMDtcblx0XHR9XG5cblx0XHQvLyBUcnVuY2F0ZSB0aGUgbG9uZ2VyIHN0cmluZy5cblx0XHRpZiAoIHRleHQxTGVuZ3RoID4gdGV4dDJMZW5ndGggKSB7XG5cdFx0XHR0ZXh0MSA9IHRleHQxLnN1YnN0cmluZyggdGV4dDFMZW5ndGggLSB0ZXh0Mkxlbmd0aCApO1xuXHRcdH0gZWxzZSBpZiAoIHRleHQxTGVuZ3RoIDwgdGV4dDJMZW5ndGggKSB7XG5cdFx0XHR0ZXh0MiA9IHRleHQyLnN1YnN0cmluZyggMCwgdGV4dDFMZW5ndGggKTtcblx0XHR9XG5cdFx0dGV4dExlbmd0aCA9IE1hdGgubWluKCB0ZXh0MUxlbmd0aCwgdGV4dDJMZW5ndGggKTtcblxuXHRcdC8vIFF1aWNrIGNoZWNrIGZvciB0aGUgd29yc3QgY2FzZS5cblx0XHRpZiAoIHRleHQxID09PSB0ZXh0MiApIHtcblx0XHRcdHJldHVybiB0ZXh0TGVuZ3RoO1xuXHRcdH1cblxuXHRcdC8vIFN0YXJ0IGJ5IGxvb2tpbmcgZm9yIGEgc2luZ2xlIGNoYXJhY3RlciBtYXRjaFxuXHRcdC8vIGFuZCBpbmNyZWFzZSBsZW5ndGggdW50aWwgbm8gbWF0Y2ggaXMgZm91bmQuXG5cdFx0Ly8gUGVyZm9ybWFuY2UgYW5hbHlzaXM6IGh0dHBzOi8vbmVpbC5mcmFzZXIubmFtZS9uZXdzLzIwMTAvMTEvMDQvXG5cdFx0YmVzdCA9IDA7XG5cdFx0bGVuZ3RoID0gMTtcblx0XHR3aGlsZSAoIHRydWUgKSB7XG5cdFx0XHRwYXR0ZXJuID0gdGV4dDEuc3Vic3RyaW5nKCB0ZXh0TGVuZ3RoIC0gbGVuZ3RoICk7XG5cdFx0XHRmb3VuZCA9IHRleHQyLmluZGV4T2YoIHBhdHRlcm4gKTtcblx0XHRcdGlmICggZm91bmQgPT09IC0xICkge1xuXHRcdFx0XHRyZXR1cm4gYmVzdDtcblx0XHRcdH1cblx0XHRcdGxlbmd0aCArPSBmb3VuZDtcblx0XHRcdGlmICggZm91bmQgPT09IDAgfHwgdGV4dDEuc3Vic3RyaW5nKCB0ZXh0TGVuZ3RoIC0gbGVuZ3RoICkgPT09XG5cdFx0XHRcdFx0dGV4dDIuc3Vic3RyaW5nKCAwLCBsZW5ndGggKSApIHtcblx0XHRcdFx0YmVzdCA9IGxlbmd0aDtcblx0XHRcdFx0bGVuZ3RoKys7XG5cdFx0XHR9XG5cdFx0fVxuXHR9O1xuXG5cdC8qKlxuXHQgKiBTcGxpdCB0d28gdGV4dHMgaW50byBhbiBhcnJheSBvZiBzdHJpbmdzLiAgUmVkdWNlIHRoZSB0ZXh0cyB0byBhIHN0cmluZyBvZlxuXHQgKiBoYXNoZXMgd2hlcmUgZWFjaCBVbmljb2RlIGNoYXJhY3RlciByZXByZXNlbnRzIG9uZSBsaW5lLlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gdGV4dDEgRmlyc3Qgc3RyaW5nLlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gdGV4dDIgU2Vjb25kIHN0cmluZy5cblx0ICogQHJldHVybiB7e2NoYXJzMTogc3RyaW5nLCBjaGFyczI6IHN0cmluZywgbGluZUFycmF5OiAhQXJyYXkuPHN0cmluZz59fVxuXHQgKiAgICAgQW4gb2JqZWN0IGNvbnRhaW5pbmcgdGhlIGVuY29kZWQgdGV4dDEsIHRoZSBlbmNvZGVkIHRleHQyIGFuZFxuXHQgKiAgICAgdGhlIGFycmF5IG9mIHVuaXF1ZSBzdHJpbmdzLlxuXHQgKiAgICAgVGhlIHplcm90aCBlbGVtZW50IG9mIHRoZSBhcnJheSBvZiB1bmlxdWUgc3RyaW5ncyBpcyBpbnRlbnRpb25hbGx5IGJsYW5rLlxuXHQgKiBAcHJpdmF0ZVxuXHQgKi9cblx0RGlmZk1hdGNoUGF0Y2gucHJvdG90eXBlLmRpZmZMaW5lc1RvQ2hhcnMgPSBmdW5jdGlvbiggdGV4dDEsIHRleHQyICkge1xuXHRcdHZhciBsaW5lQXJyYXksIGxpbmVIYXNoLCBjaGFyczEsIGNoYXJzMjtcblx0XHRsaW5lQXJyYXkgPSBbXTsgLy8gRS5nLiBsaW5lQXJyYXlbNF0gPT09ICdIZWxsb1xcbidcblx0XHRsaW5lSGFzaCA9IHt9OyAgLy8gRS5nLiBsaW5lSGFzaFsnSGVsbG9cXG4nXSA9PT0gNFxuXG5cdFx0Ly8gJ1xceDAwJyBpcyBhIHZhbGlkIGNoYXJhY3RlciwgYnV0IHZhcmlvdXMgZGVidWdnZXJzIGRvbid0IGxpa2UgaXQuXG5cdFx0Ly8gU28gd2UnbGwgaW5zZXJ0IGEganVuayBlbnRyeSB0byBhdm9pZCBnZW5lcmF0aW5nIGEgbnVsbCBjaGFyYWN0ZXIuXG5cdFx0bGluZUFycmF5WyAwIF0gPSBcIlwiO1xuXG5cdFx0LyoqXG5cdFx0ICogU3BsaXQgYSB0ZXh0IGludG8gYW4gYXJyYXkgb2Ygc3RyaW5ncy4gIFJlZHVjZSB0aGUgdGV4dHMgdG8gYSBzdHJpbmcgb2Zcblx0XHQgKiBoYXNoZXMgd2hlcmUgZWFjaCBVbmljb2RlIGNoYXJhY3RlciByZXByZXNlbnRzIG9uZSBsaW5lLlxuXHRcdCAqIE1vZGlmaWVzIGxpbmVhcnJheSBhbmQgbGluZWhhc2ggdGhyb3VnaCBiZWluZyBhIGNsb3N1cmUuXG5cdFx0ICogQHBhcmFtIHtzdHJpbmd9IHRleHQgU3RyaW5nIHRvIGVuY29kZS5cblx0XHQgKiBAcmV0dXJuIHtzdHJpbmd9IEVuY29kZWQgc3RyaW5nLlxuXHRcdCAqIEBwcml2YXRlXG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gZGlmZkxpbmVzVG9DaGFyc011bmdlKCB0ZXh0ICkge1xuXHRcdFx0dmFyIGNoYXJzLCBsaW5lU3RhcnQsIGxpbmVFbmQsIGxpbmVBcnJheUxlbmd0aCwgbGluZTtcblx0XHRcdGNoYXJzID0gXCJcIjtcblxuXHRcdFx0Ly8gV2FsayB0aGUgdGV4dCwgcHVsbGluZyBvdXQgYSBzdWJzdHJpbmcgZm9yIGVhY2ggbGluZS5cblx0XHRcdC8vIHRleHQuc3BsaXQoJ1xcbicpIHdvdWxkIHdvdWxkIHRlbXBvcmFyaWx5IGRvdWJsZSBvdXIgbWVtb3J5IGZvb3RwcmludC5cblx0XHRcdC8vIE1vZGlmeWluZyB0ZXh0IHdvdWxkIGNyZWF0ZSBtYW55IGxhcmdlIHN0cmluZ3MgdG8gZ2FyYmFnZSBjb2xsZWN0LlxuXHRcdFx0bGluZVN0YXJ0ID0gMDtcblx0XHRcdGxpbmVFbmQgPSAtMTtcblxuXHRcdFx0Ly8gS2VlcGluZyBvdXIgb3duIGxlbmd0aCB2YXJpYWJsZSBpcyBmYXN0ZXIgdGhhbiBsb29raW5nIGl0IHVwLlxuXHRcdFx0bGluZUFycmF5TGVuZ3RoID0gbGluZUFycmF5Lmxlbmd0aDtcblx0XHRcdHdoaWxlICggbGluZUVuZCA8IHRleHQubGVuZ3RoIC0gMSApIHtcblx0XHRcdFx0bGluZUVuZCA9IHRleHQuaW5kZXhPZiggXCJcXG5cIiwgbGluZVN0YXJ0ICk7XG5cdFx0XHRcdGlmICggbGluZUVuZCA9PT0gLTEgKSB7XG5cdFx0XHRcdFx0bGluZUVuZCA9IHRleHQubGVuZ3RoIC0gMTtcblx0XHRcdFx0fVxuXHRcdFx0XHRsaW5lID0gdGV4dC5zdWJzdHJpbmcoIGxpbmVTdGFydCwgbGluZUVuZCArIDEgKTtcblx0XHRcdFx0bGluZVN0YXJ0ID0gbGluZUVuZCArIDE7XG5cblx0XHRcdFx0aWYgKCBsaW5lSGFzaC5oYXNPd25Qcm9wZXJ0eSA/IGxpbmVIYXNoLmhhc093blByb3BlcnR5KCBsaW5lICkgOlxuXHRcdFx0XHRcdFx0XHQoIGxpbmVIYXNoWyBsaW5lIF0gIT09IHVuZGVmaW5lZCApICkge1xuXHRcdFx0XHRcdGNoYXJzICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoIGxpbmVIYXNoWyBsaW5lIF0gKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRjaGFycyArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKCBsaW5lQXJyYXlMZW5ndGggKTtcblx0XHRcdFx0XHRsaW5lSGFzaFsgbGluZSBdID0gbGluZUFycmF5TGVuZ3RoO1xuXHRcdFx0XHRcdGxpbmVBcnJheVsgbGluZUFycmF5TGVuZ3RoKysgXSA9IGxpbmU7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdHJldHVybiBjaGFycztcblx0XHR9XG5cblx0XHRjaGFyczEgPSBkaWZmTGluZXNUb0NoYXJzTXVuZ2UoIHRleHQxICk7XG5cdFx0Y2hhcnMyID0gZGlmZkxpbmVzVG9DaGFyc011bmdlKCB0ZXh0MiApO1xuXHRcdHJldHVybiB7XG5cdFx0XHRjaGFyczE6IGNoYXJzMSxcblx0XHRcdGNoYXJzMjogY2hhcnMyLFxuXHRcdFx0bGluZUFycmF5OiBsaW5lQXJyYXlcblx0XHR9O1xuXHR9O1xuXG5cdC8qKlxuXHQgKiBSZWh5ZHJhdGUgdGhlIHRleHQgaW4gYSBkaWZmIGZyb20gYSBzdHJpbmcgb2YgbGluZSBoYXNoZXMgdG8gcmVhbCBsaW5lcyBvZlxuXHQgKiB0ZXh0LlxuXHQgKiBAcGFyYW0geyFBcnJheS48IURpZmZNYXRjaFBhdGNoLkRpZmY+fSBkaWZmcyBBcnJheSBvZiBkaWZmIHR1cGxlcy5cblx0ICogQHBhcmFtIHshQXJyYXkuPHN0cmluZz59IGxpbmVBcnJheSBBcnJheSBvZiB1bmlxdWUgc3RyaW5ncy5cblx0ICogQHByaXZhdGVcblx0ICovXG5cdERpZmZNYXRjaFBhdGNoLnByb3RvdHlwZS5kaWZmQ2hhcnNUb0xpbmVzID0gZnVuY3Rpb24oIGRpZmZzLCBsaW5lQXJyYXkgKSB7XG5cdFx0dmFyIHgsIGNoYXJzLCB0ZXh0LCB5O1xuXHRcdGZvciAoIHggPSAwOyB4IDwgZGlmZnMubGVuZ3RoOyB4KysgKSB7XG5cdFx0XHRjaGFycyA9IGRpZmZzWyB4IF1bIDEgXTtcblx0XHRcdHRleHQgPSBbXTtcblx0XHRcdGZvciAoIHkgPSAwOyB5IDwgY2hhcnMubGVuZ3RoOyB5KysgKSB7XG5cdFx0XHRcdHRleHRbIHkgXSA9IGxpbmVBcnJheVsgY2hhcnMuY2hhckNvZGVBdCggeSApIF07XG5cdFx0XHR9XG5cdFx0XHRkaWZmc1sgeCBdWyAxIF0gPSB0ZXh0LmpvaW4oIFwiXCIgKTtcblx0XHR9XG5cdH07XG5cblx0LyoqXG5cdCAqIFJlb3JkZXIgYW5kIG1lcmdlIGxpa2UgZWRpdCBzZWN0aW9ucy4gIE1lcmdlIGVxdWFsaXRpZXMuXG5cdCAqIEFueSBlZGl0IHNlY3Rpb24gY2FuIG1vdmUgYXMgbG9uZyBhcyBpdCBkb2Vzbid0IGNyb3NzIGFuIGVxdWFsaXR5LlxuXHQgKiBAcGFyYW0geyFBcnJheS48IURpZmZNYXRjaFBhdGNoLkRpZmY+fSBkaWZmcyBBcnJheSBvZiBkaWZmIHR1cGxlcy5cblx0ICovXG5cdERpZmZNYXRjaFBhdGNoLnByb3RvdHlwZS5kaWZmQ2xlYW51cE1lcmdlID0gZnVuY3Rpb24oIGRpZmZzICkge1xuXHRcdHZhciBwb2ludGVyLCBjb3VudERlbGV0ZSwgY291bnRJbnNlcnQsIHRleHRJbnNlcnQsIHRleHREZWxldGUsXG5cdFx0XHRjb21tb25sZW5ndGgsIGNoYW5nZXMsIGRpZmZQb2ludGVyLCBwb3NpdGlvbjtcblx0XHRkaWZmcy5wdXNoKCBbIERJRkZfRVFVQUwsIFwiXCIgXSApOyAvLyBBZGQgYSBkdW1teSBlbnRyeSBhdCB0aGUgZW5kLlxuXHRcdHBvaW50ZXIgPSAwO1xuXHRcdGNvdW50RGVsZXRlID0gMDtcblx0XHRjb3VudEluc2VydCA9IDA7XG5cdFx0dGV4dERlbGV0ZSA9IFwiXCI7XG5cdFx0dGV4dEluc2VydCA9IFwiXCI7XG5cdFx0Y29tbW9ubGVuZ3RoO1xuXHRcdHdoaWxlICggcG9pbnRlciA8IGRpZmZzLmxlbmd0aCApIHtcblx0XHRcdHN3aXRjaCAoIGRpZmZzWyBwb2ludGVyIF1bIDAgXSApIHtcblx0XHRcdGNhc2UgRElGRl9JTlNFUlQ6XG5cdFx0XHRcdGNvdW50SW5zZXJ0Kys7XG5cdFx0XHRcdHRleHRJbnNlcnQgKz0gZGlmZnNbIHBvaW50ZXIgXVsgMSBdO1xuXHRcdFx0XHRwb2ludGVyKys7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSBESUZGX0RFTEVURTpcblx0XHRcdFx0Y291bnREZWxldGUrKztcblx0XHRcdFx0dGV4dERlbGV0ZSArPSBkaWZmc1sgcG9pbnRlciBdWyAxIF07XG5cdFx0XHRcdHBvaW50ZXIrKztcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlIERJRkZfRVFVQUw6XG5cblx0XHRcdFx0Ly8gVXBvbiByZWFjaGluZyBhbiBlcXVhbGl0eSwgY2hlY2sgZm9yIHByaW9yIHJlZHVuZGFuY2llcy5cblx0XHRcdFx0aWYgKCBjb3VudERlbGV0ZSArIGNvdW50SW5zZXJ0ID4gMSApIHtcblx0XHRcdFx0XHRpZiAoIGNvdW50RGVsZXRlICE9PSAwICYmIGNvdW50SW5zZXJ0ICE9PSAwICkge1xuXG5cdFx0XHRcdFx0XHQvLyBGYWN0b3Igb3V0IGFueSBjb21tb24gcHJlZml4ZXMuXG5cdFx0XHRcdFx0XHRjb21tb25sZW5ndGggPSB0aGlzLmRpZmZDb21tb25QcmVmaXgoIHRleHRJbnNlcnQsIHRleHREZWxldGUgKTtcblx0XHRcdFx0XHRcdGlmICggY29tbW9ubGVuZ3RoICE9PSAwICkge1xuXHRcdFx0XHRcdFx0XHRpZiAoICggcG9pbnRlciAtIGNvdW50RGVsZXRlIC0gY291bnRJbnNlcnQgKSA+IDAgJiZcblx0XHRcdFx0XHRcdFx0XHRcdGRpZmZzWyBwb2ludGVyIC0gY291bnREZWxldGUgLSBjb3VudEluc2VydCAtIDEgXVsgMCBdID09PVxuXHRcdFx0XHRcdFx0XHRcdFx0RElGRl9FUVVBTCApIHtcblx0XHRcdFx0XHRcdFx0XHRkaWZmc1sgcG9pbnRlciAtIGNvdW50RGVsZXRlIC0gY291bnRJbnNlcnQgLSAxIF1bIDEgXSArPVxuXHRcdFx0XHRcdFx0XHRcdFx0dGV4dEluc2VydC5zdWJzdHJpbmcoIDAsIGNvbW1vbmxlbmd0aCApO1xuXHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdGRpZmZzLnNwbGljZSggMCwgMCwgWyBESUZGX0VRVUFMLFxuXHRcdFx0XHRcdFx0XHRcdFx0dGV4dEluc2VydC5zdWJzdHJpbmcoIDAsIGNvbW1vbmxlbmd0aCApXG5cdFx0XHRcdFx0XHRcdFx0XSApO1xuXHRcdFx0XHRcdFx0XHRcdHBvaW50ZXIrKztcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR0ZXh0SW5zZXJ0ID0gdGV4dEluc2VydC5zdWJzdHJpbmcoIGNvbW1vbmxlbmd0aCApO1xuXHRcdFx0XHRcdFx0XHR0ZXh0RGVsZXRlID0gdGV4dERlbGV0ZS5zdWJzdHJpbmcoIGNvbW1vbmxlbmd0aCApO1xuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHQvLyBGYWN0b3Igb3V0IGFueSBjb21tb24gc3VmZml4aWVzLlxuXHRcdFx0XHRcdFx0Y29tbW9ubGVuZ3RoID0gdGhpcy5kaWZmQ29tbW9uU3VmZml4KCB0ZXh0SW5zZXJ0LCB0ZXh0RGVsZXRlICk7XG5cdFx0XHRcdFx0XHRpZiAoIGNvbW1vbmxlbmd0aCAhPT0gMCApIHtcblx0XHRcdFx0XHRcdFx0ZGlmZnNbIHBvaW50ZXIgXVsgMSBdID0gdGV4dEluc2VydC5zdWJzdHJpbmcoIHRleHRJbnNlcnQubGVuZ3RoIC1cblx0XHRcdFx0XHRcdFx0XHRcdGNvbW1vbmxlbmd0aCApICsgZGlmZnNbIHBvaW50ZXIgXVsgMSBdO1xuXHRcdFx0XHRcdFx0XHR0ZXh0SW5zZXJ0ID0gdGV4dEluc2VydC5zdWJzdHJpbmcoIDAsIHRleHRJbnNlcnQubGVuZ3RoIC1cblx0XHRcdFx0XHRcdFx0XHRjb21tb25sZW5ndGggKTtcblx0XHRcdFx0XHRcdFx0dGV4dERlbGV0ZSA9IHRleHREZWxldGUuc3Vic3RyaW5nKCAwLCB0ZXh0RGVsZXRlLmxlbmd0aCAtXG5cdFx0XHRcdFx0XHRcdFx0Y29tbW9ubGVuZ3RoICk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0Ly8gRGVsZXRlIHRoZSBvZmZlbmRpbmcgcmVjb3JkcyBhbmQgYWRkIHRoZSBtZXJnZWQgb25lcy5cblx0XHRcdFx0XHRpZiAoIGNvdW50RGVsZXRlID09PSAwICkge1xuXHRcdFx0XHRcdFx0ZGlmZnMuc3BsaWNlKCBwb2ludGVyIC0gY291bnRJbnNlcnQsXG5cdFx0XHRcdFx0XHRcdGNvdW50RGVsZXRlICsgY291bnRJbnNlcnQsIFsgRElGRl9JTlNFUlQsIHRleHRJbnNlcnQgXSApO1xuXHRcdFx0XHRcdH0gZWxzZSBpZiAoIGNvdW50SW5zZXJ0ID09PSAwICkge1xuXHRcdFx0XHRcdFx0ZGlmZnMuc3BsaWNlKCBwb2ludGVyIC0gY291bnREZWxldGUsXG5cdFx0XHRcdFx0XHRcdGNvdW50RGVsZXRlICsgY291bnRJbnNlcnQsIFsgRElGRl9ERUxFVEUsIHRleHREZWxldGUgXSApO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRkaWZmcy5zcGxpY2UoXG5cdFx0XHRcdFx0XHRcdHBvaW50ZXIgLSBjb3VudERlbGV0ZSAtIGNvdW50SW5zZXJ0LFxuXHRcdFx0XHRcdFx0XHRjb3VudERlbGV0ZSArIGNvdW50SW5zZXJ0LFxuXHRcdFx0XHRcdFx0XHRbIERJRkZfREVMRVRFLCB0ZXh0RGVsZXRlIF0sIFsgRElGRl9JTlNFUlQsIHRleHRJbnNlcnQgXVxuXHRcdFx0XHRcdFx0KTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0cG9pbnRlciA9IHBvaW50ZXIgLSBjb3VudERlbGV0ZSAtIGNvdW50SW5zZXJ0ICtcblx0XHRcdFx0XHRcdCggY291bnREZWxldGUgPyAxIDogMCApICsgKCBjb3VudEluc2VydCA/IDEgOiAwICkgKyAxO1xuXHRcdFx0XHR9IGVsc2UgaWYgKCBwb2ludGVyICE9PSAwICYmIGRpZmZzWyBwb2ludGVyIC0gMSBdWyAwIF0gPT09IERJRkZfRVFVQUwgKSB7XG5cblx0XHRcdFx0XHQvLyBNZXJnZSB0aGlzIGVxdWFsaXR5IHdpdGggdGhlIHByZXZpb3VzIG9uZS5cblx0XHRcdFx0XHRkaWZmc1sgcG9pbnRlciAtIDEgXVsgMSBdICs9IGRpZmZzWyBwb2ludGVyIF1bIDEgXTtcblx0XHRcdFx0XHRkaWZmcy5zcGxpY2UoIHBvaW50ZXIsIDEgKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRwb2ludGVyKys7XG5cdFx0XHRcdH1cblx0XHRcdFx0Y291bnRJbnNlcnQgPSAwO1xuXHRcdFx0XHRjb3VudERlbGV0ZSA9IDA7XG5cdFx0XHRcdHRleHREZWxldGUgPSBcIlwiO1xuXHRcdFx0XHR0ZXh0SW5zZXJ0ID0gXCJcIjtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdGlmICggZGlmZnNbIGRpZmZzLmxlbmd0aCAtIDEgXVsgMSBdID09PSBcIlwiICkge1xuXHRcdFx0ZGlmZnMucG9wKCk7IC8vIFJlbW92ZSB0aGUgZHVtbXkgZW50cnkgYXQgdGhlIGVuZC5cblx0XHR9XG5cblx0XHQvLyBTZWNvbmQgcGFzczogbG9vayBmb3Igc2luZ2xlIGVkaXRzIHN1cnJvdW5kZWQgb24gYm90aCBzaWRlcyBieSBlcXVhbGl0aWVzXG5cdFx0Ly8gd2hpY2ggY2FuIGJlIHNoaWZ0ZWQgc2lkZXdheXMgdG8gZWxpbWluYXRlIGFuIGVxdWFsaXR5LlxuXHRcdC8vIGUuZzogQTxpbnM+QkE8L2lucz5DIC0+IDxpbnM+QUI8L2lucz5BQ1xuXHRcdGNoYW5nZXMgPSBmYWxzZTtcblx0XHRwb2ludGVyID0gMTtcblxuXHRcdC8vIEludGVudGlvbmFsbHkgaWdub3JlIHRoZSBmaXJzdCBhbmQgbGFzdCBlbGVtZW50IChkb24ndCBuZWVkIGNoZWNraW5nKS5cblx0XHR3aGlsZSAoIHBvaW50ZXIgPCBkaWZmcy5sZW5ndGggLSAxICkge1xuXHRcdFx0aWYgKCBkaWZmc1sgcG9pbnRlciAtIDEgXVsgMCBdID09PSBESUZGX0VRVUFMICYmXG5cdFx0XHRcdFx0ZGlmZnNbIHBvaW50ZXIgKyAxIF1bIDAgXSA9PT0gRElGRl9FUVVBTCApIHtcblxuXHRcdFx0XHRkaWZmUG9pbnRlciA9IGRpZmZzWyBwb2ludGVyIF1bIDEgXTtcblx0XHRcdFx0cG9zaXRpb24gPSBkaWZmUG9pbnRlci5zdWJzdHJpbmcoXG5cdFx0XHRcdFx0ZGlmZlBvaW50ZXIubGVuZ3RoIC0gZGlmZnNbIHBvaW50ZXIgLSAxIF1bIDEgXS5sZW5ndGhcblx0XHRcdFx0KTtcblxuXHRcdFx0XHQvLyBUaGlzIGlzIGEgc2luZ2xlIGVkaXQgc3Vycm91bmRlZCBieSBlcXVhbGl0aWVzLlxuXHRcdFx0XHRpZiAoIHBvc2l0aW9uID09PSBkaWZmc1sgcG9pbnRlciAtIDEgXVsgMSBdICkge1xuXG5cdFx0XHRcdFx0Ly8gU2hpZnQgdGhlIGVkaXQgb3ZlciB0aGUgcHJldmlvdXMgZXF1YWxpdHkuXG5cdFx0XHRcdFx0ZGlmZnNbIHBvaW50ZXIgXVsgMSBdID0gZGlmZnNbIHBvaW50ZXIgLSAxIF1bIDEgXSArXG5cdFx0XHRcdFx0XHRkaWZmc1sgcG9pbnRlciBdWyAxIF0uc3Vic3RyaW5nKCAwLCBkaWZmc1sgcG9pbnRlciBdWyAxIF0ubGVuZ3RoIC1cblx0XHRcdFx0XHRcdFx0ZGlmZnNbIHBvaW50ZXIgLSAxIF1bIDEgXS5sZW5ndGggKTtcblx0XHRcdFx0XHRkaWZmc1sgcG9pbnRlciArIDEgXVsgMSBdID1cblx0XHRcdFx0XHRcdGRpZmZzWyBwb2ludGVyIC0gMSBdWyAxIF0gKyBkaWZmc1sgcG9pbnRlciArIDEgXVsgMSBdO1xuXHRcdFx0XHRcdGRpZmZzLnNwbGljZSggcG9pbnRlciAtIDEsIDEgKTtcblx0XHRcdFx0XHRjaGFuZ2VzID0gdHJ1ZTtcblx0XHRcdFx0fSBlbHNlIGlmICggZGlmZlBvaW50ZXIuc3Vic3RyaW5nKCAwLCBkaWZmc1sgcG9pbnRlciArIDEgXVsgMSBdLmxlbmd0aCApID09PVxuXHRcdFx0XHRcdFx0ZGlmZnNbIHBvaW50ZXIgKyAxIF1bIDEgXSApIHtcblxuXHRcdFx0XHRcdC8vIFNoaWZ0IHRoZSBlZGl0IG92ZXIgdGhlIG5leHQgZXF1YWxpdHkuXG5cdFx0XHRcdFx0ZGlmZnNbIHBvaW50ZXIgLSAxIF1bIDEgXSArPSBkaWZmc1sgcG9pbnRlciArIDEgXVsgMSBdO1xuXHRcdFx0XHRcdGRpZmZzWyBwb2ludGVyIF1bIDEgXSA9XG5cdFx0XHRcdFx0XHRkaWZmc1sgcG9pbnRlciBdWyAxIF0uc3Vic3RyaW5nKCBkaWZmc1sgcG9pbnRlciArIDEgXVsgMSBdLmxlbmd0aCApICtcblx0XHRcdFx0XHRcdGRpZmZzWyBwb2ludGVyICsgMSBdWyAxIF07XG5cdFx0XHRcdFx0ZGlmZnMuc3BsaWNlKCBwb2ludGVyICsgMSwgMSApO1xuXHRcdFx0XHRcdGNoYW5nZXMgPSB0cnVlO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRwb2ludGVyKys7XG5cdFx0fVxuXG5cdFx0Ly8gSWYgc2hpZnRzIHdlcmUgbWFkZSwgdGhlIGRpZmYgbmVlZHMgcmVvcmRlcmluZyBhbmQgYW5vdGhlciBzaGlmdCBzd2VlcC5cblx0XHRpZiAoIGNoYW5nZXMgKSB7XG5cdFx0XHR0aGlzLmRpZmZDbGVhbnVwTWVyZ2UoIGRpZmZzICk7XG5cdFx0fVxuXHR9O1xuXG5cdHJldHVybiBmdW5jdGlvbiggbywgbiApIHtcblx0XHR2YXIgZGlmZiwgb3V0cHV0LCB0ZXh0O1xuXHRcdGRpZmYgPSBuZXcgRGlmZk1hdGNoUGF0Y2goKTtcblx0XHRvdXRwdXQgPSBkaWZmLkRpZmZNYWluKCBvLCBuICk7XG5cdFx0ZGlmZi5kaWZmQ2xlYW51cEVmZmljaWVuY3koIG91dHB1dCApO1xuXHRcdHRleHQgPSBkaWZmLmRpZmZQcmV0dHlIdG1sKCBvdXRwdXQgKTtcblxuXHRcdHJldHVybiB0ZXh0O1xuXHR9O1xufSgpICk7XG5cbn0oKSApO1xuIiwiY29uc3Qgc2VhcmNoQ29tcG9uZW50ID0gZnVuY3Rpb24gc2VhcmNoQ29tcG9uZW50ICgpe1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgdGVtcGxhdGUoKXtcbiAgICAgICAgICAgIHJldHVybiBgXG4gICAgICAgICAgICAgICAgPGZvcm0+XG4gICAgICAgICAgICAgICAgICAgIDxsYWJlbCBmb3I9XCJzZWFyY2hcIj5XaGF0IGRpZCB5b3UgZWF0IHRvZGF5ID88L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgbmFtZT1cInNlYXJjaFwiIHBsYWNlaG9sZGVyPVwiVGFjb3MsIGNvZmZlZSwgYmFubmFuYSwgLi4uXCIgLz5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiYnV0dG9uXCIgdmFsdWU9XCJTZWFyY2hcIiAvPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Zvcm0+YDtcbiAgICAgICAgfSxcblxuICAgICAgICBpbml0KCl7XG4gICAgICAgICAgICBjb25zdCByb290ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgICAgICByb290LmNsYXNzTGlzdC5hZGQoJ3Jvb3QnKTtcbiAgICAgICAgICAgIHJvb3QuaW5uZXJIVE1MID0gdGhpcy50ZW1wbGF0ZSgpO1xuXG4gICAgICAgICAgICB0aGlzLmZyYWdtZW50ID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuICAgICAgICAgICAgdGhpcy5mcmFnbWVudC5hcHBlbmRDaGlsZChyb290KTtcblxuICAgICAgICAgICAgY29uc3QgYnV0dG9uID0gdGhpcy5mcmFnbWVudC5xdWVyeVNlbGVjdG9yKCdpbnB1dFt0eXBlPWJ1dHRvbl0nKTtcbiAgICAgICAgICAgIGNvbnN0IHNlYXJjaEZpZWxkID0gdGhpcy5mcmFnbWVudC5xdWVyeVNlbGVjdG9yKCdpbnB1dFtuYW1lPXNlYXJjaF0nKTtcbiAgICAgICAgICAgIHNlYXJjaEZpZWxkLnN0eWxlLmJvcmRlckNvbG9yID0gJ3JlZCc7XG4gICAgICAgICAgICBidXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBlID0+IHtcblxuICAgICAgICAgICAgICAgIHdpbmRvdy5jb25zb2xlLmxvZyhlLCBzZWFyY2hGaWVsZC52YWx1ZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9LFxuXG4gICAgICAgIHJlbmRlcihjb250YWluZXIpe1xuICAgICAgICAgICAgaWYodGhpcy5mcmFnbWVudCAmJiBjb250YWluZXIgaW5zdGFuY2VvZiBIVE1MRWxlbWVudCl7XG4gICAgICAgICAgICAgICAgY29udGFpbmVyLmFwcGVuZENoaWxkKHRoaXMuZnJhZ21lbnQucXVlcnlTZWxlY3RvcignLnJvb3QgPiAqJykpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICB9O1xufTtcblxuZXhwb3J0IGRlZmF1bHQgc2VhcmNoQ29tcG9uZW50O1xuIiwiaW1wb3J0IFFVbml0IGZyb20gJ3F1bml0anMnO1xuaW1wb3J0IHNlYXJjaENvbXBvbmVudCBmcm9tICcuLi8uLi9zcmMvY29tcG9uZW50cy9zZWFyY2guanMnO1xuXG5RVW5pdC5tb2R1bGUoJ0FQSScpO1xuXG5RVW5pdC50ZXN0KCdmYWN0b3J5JywgYXNzZXJ0ID0+IHtcbiAgICBhc3NlcnQuZXF1YWwoIHR5cGVvZiBzZWFyY2hDb21wb25lbnQsICdmdW5jdGlvbicsICdUaGUgY29tcG9uZW50IG1vZHVsZSBleHBvc2UgYSBmdW5jdGlvbicpO1xuICAgIGFzc2VydC5lcXVhbCggdHlwZW9mIHNlYXJjaENvbXBvbmVudCgpLCAnb2JqZWN0JywgJ1RoZSBjb21wb25lbnQgZmFjdG9yeSBjcmVhdGVzIGFuIG9iamVjdCcpO1xuICAgIGFzc2VydC5ub3REZWVwRXF1YWwoc2VhcmNoQ29tcG9uZW50KCksIHNlYXJjaENvbXBvbmVudCgpLCAnVGhlIGNvbXBvbmVudCBmYWN0b3J5IGNyZWF0ZXMgbmV3IG9iamVjdHMnKTtcbn0pO1xuXG5RVW5pdC50ZXN0KCdjb21wb25lbnQnLCBhc3NlcnQgPT4ge1xuICAgIHZhciBjb21wb25lbnQgPSBzZWFyY2hDb21wb25lbnQoKTtcbiAgICBhc3NlcnQuZXF1YWwoIHR5cGVvZiBjb21wb25lbnQuaW5pdCwgJ2Z1bmN0aW9uJywgJ1RoZSBjb21wb25lbnQgZXhwb3NlcyBhbiBpbml0IG1ldGhvZCcpO1xuICAgICBhc3NlcnQuZXF1YWwoIHR5cGVvZiBjb21wb25lbnQucmVuZGVyLCAnZnVuY3Rpb24nLCAnVGhlIGNvbXBvbmVudCBleHBvc2VzIGEgcmVuZGVyIG1ldGhvZCcpO1xuICAgICBhc3NlcnQub2sodHJ1ZSwgJ1VzZWZ1bCBUZXN0Jyk7XG5cbn0pO1xuIl19
