/*global setTimeout:true, clearTimeout:true */

/**
Shifty - A teeny tiny tweening engine in JavaScript. 
By Jeremy Kahn - jeremyckahn@gmail.com
  v0.1.0

For instructions on how to use Shifty, please consult the README: https://github.com/jeremyckahn/tweeny/blob/master/README.md

MIT Lincense.  This code free to use, modify, distribute and enjoy.

*/

(function Shifty (global) {
	
	/**
	 * Get the current UNIX time as an integer
	 * @returns {Number} An integer representing the current timestamp.
	 */
	function now () {
		return +new Date();
	}
	
	function each (obj, func) {
		var prop;
		
		for (prop in obj) {
			if (obj.hasOwnProperty(prop)) {
				func(obj, prop);
			}
		}
	}
	
	/**
	 * Does a basic copy of one Object's properties to another.  This is not a robust `extend` function, nor is it recusrsive.  It is only appropriate to use on objects that have primitive properties (Numbers, Strings, Boolean, etc.)
	 * @param {Object} targetObject The object to copy into
	 * @param {Object} srcObject The object to copy from
	 * @returns {Object} A reference to the augmented `targetObj` Object
	 */
	function simpleCopy (targetObj, srcObj) {
		each(srcObj, function (srcObj, prop) {
			targetObj[prop] = srcObj[prop];
		});
		
		return targetObj;
	}
	
	// Modifies the `from` object
	function tweenProps (currentTime, params, state) {
		var prop;
		
		for (prop in state.current) {
			if (state.current.hasOwnProperty(prop) && params.to.hasOwnProperty(prop)) {
				state.current[prop] = params.easingFunc(currentTime - params.timestamp, params.originalState[prop], params.to[prop] - params.originalState[prop], params.duration);
			}
		}
	}
	
	function scheduleUpdate (handler, fps) {
		return setTimeout(handler, 1000 / fps);
	}
	
	function invokeHook (hookName, hooks, applyTo, args) {
		var i;
		
		for (i = 0; i < hooks[hookName].length; i++) {
			hooks[hookName][i].apply(applyTo, args);
		}
	}
	
	function applyFilter (filterName, applyTo, args) {
		each(global.Tweenable.prototype.filter, function (filters, name) {
			if (filters[name][filterName]) {
				filters[name][filterName].apply(applyTo, args);
			}
		});
	}
	
	function timeoutHandler (params, state) {
		var currentTime;
		
		currentTime = now();
		
		if (currentTime < params.timestamp + params.duration && state.isAnimating) {
			applyFilter('beforeTween', params.owner, [state.current, params.originalState, params.to]);
			tweenProps (currentTime, params, state);		
			applyFilter('afterTween', params.owner, [state.current, params.originalState, params.to]);
			
			if (params.hook.step) {
				invokeHook('step', params.hook, params.owner, [state.current]);
			}
			
			params.step.call(state.current);
			
			// The tween is still running, schedule an update
			state.loopId = scheduleUpdate(function () {
				timeoutHandler(params, state);
			}, params.fps);
		} else {
			// The duration of the tween has expired
			params.tweenController.stop(true);
		}
	}
	
	function Tween (params, state) {
		/**
		 * Stops the tween.
		 * @param {Boolean} gotoEnd If `false`, or omitted, the tween just stops at its current state, and the `callback` is not invoked.  If `true`, the tweened object's values are instantly set the the target values, and the `callbabk` is invoked.
		 */
		this.stop = function stop (gotoEnd) {
			clearTimeout(state.loopId);
			if (gotoEnd) {
				simpleCopy(state.current, params.to);
				state.isAnimating = false;
				params.callback.call(state.current);
			}
		};
		
		// This needs an example file!
		this.pause = function pause () {
			clearTimeout(state.loopId);
			state.pausedAtTime = now();
			state.isPaused = true;
			return this;
		};
		
		this.resume = function play () {
			if (state.isPaused) {
				params.timestamp += state.pausedAtTime - params.timestamp;
			}
			
			scheduleUpdate(function () {
				timeoutHandler(params, state);
			});
			
			return this;
		};
		
		/**
		 * Returns a reference to the tweened object (the `from` object that wat passed to `tweeny.tween`).
		 * @returns {Object}
		 */
		this.get = function get () {
			return state.current;
		};
		
		return this;
	}
	
	function Tweenable () {
		
		this.init = function init (options) {
			options = options || {};
			
			this._hook = {};

			this._tweenParams = {
				owner: this,
				hook: this._hook
			};

			this._state = {};

			// The framerate at which Tweeny updates.
			this.fps = options.fps || 30;

			// The default easing formula.  This can be changed publicly.
			this.easing = options.easing || 'linear';

			// The default `duration`.  This can be changed publicly.
			this.duration = options.duration || 500;
			
			return this;
		};
		
		/**
		 * @param {Object} from 
		 * @param {Object} to
		 * @param {Number} duration
		 * @param {String} easing
		 */
		this.tween = function tween (from, to, duration, callback, easing) {
			var self;
			
			if (this._state.isAnimating) {
				return;
			}
				
			self = this;
			this._state.loopId = 0;
			this._state.current = {};
			this._state.pausedAtTime = null;
			
			// Normalize some internal values depending on how `Tweenable.tween` was invoked
			if (to) {
				// Assume the shorthand syntax is being used.
				this._tweenParams.step = function () {};
				this._state.current = from || {};
				this._tweenParams.to = to || {};
				this._tweenParams.duration = duration || this.duration;
				this._tweenParams.callback = callback || function () {};
				this._tweenParams.easing = easing || this.easing;
			} else {
				// If the second argument is not present, assume the longhand syntax is being used.
				this._tweenParams.step = from.step || function () {};
				this._tweenParams.callback = from.callback || function () {};
				this._state.current = from.from || {};
				this._tweenParams.to = from.to || {};
				this._tweenParams.duration = from.duration || this.duration;
				this._tweenParams.easing = from.easing || this.easing;
			}
			
			this._tweenParams.timestamp = now();
			this._tweenParams.easingFunc = this.formula[this._tweenParams.easing] || this.formula.linear;
			this._tweenParams.originalState = simpleCopy({}, this._state.current);
			applyFilter('tweenCreated', this._tweenParams.owner, [this._state.current, this._tweenParams.originalState, this._tweenParams.to]);
			this._tweenParams.tweenController = new Tween(this._tweenParams, this._state);
			this._state.isAnimating = true;

			scheduleUpdate(function () {
				timeoutHandler(self._tweenParams, self._state);
			}, this.fps);
			
			return this._tweenParams.tweenController;
		};
		
		this.hookAdd = function hookAdd (hookName, hookFunc) {
			if (!this._hook.hasOwnProperty(hookName)) {
				this._hook[hookName] = [];
			}
			
			this._hook[hookName].push(hookFunc);
		};
		
		this.hookRemove = function hookRemove (hookName, hookFunc) {
			var i;
			
			if (!this._hook.hasOwnProperty(hookName)) {
				return;
			}
			
			if (!hookFunc) {
				this._hook[hookName] = [];
				return;
			}
			
			for (i = this._hook[hookName].length; i >= 0; i++) {
				if (this._hook[hookName][i] === hookFunc) {
					this._hook[hookName].splice(i, 1);
				}
			}
		};
		
		return this;
	}
	
	Tweenable.prototype.filter = {};
	Tweenable.util = {
		'each': each
	};
	
	/**
	 * This object contains all of the tweens available to Tweeny.  It is extendable - simply attach properties to the Tweenable.prototype.formula Object following the same format at `linear`.
	 * 
	 * This pattern was copied from Robert Penner, under BSD License (http://www.robertpenner.com/)
	 * 
	 * @param t The current time
	 * @param b Start value
	 * @param c Change in value (delta)
	 * @param d Duration of the tween
	 */
	Tweenable.prototype.formula = {
		linear: function (t, b, c, d) {
			// no easing, no acceleration
			return c * t / d + b;
		}
	};
	
	global.Tweenable = Tweenable;
	
}(this));