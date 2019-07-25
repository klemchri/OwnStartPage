/**
 * Created by Hugo-T
 * MIT License.
 * Version 1.0
 */

class NeonBubble {
	constructor(element, settings = {}) {
		if (!(element instanceof Node)) {
			throw `Can't initialize NeonBubble because ${element} is not a Node.`;
		}

		this._canMove = false;
		this.center = null;
		this.width = null;
		this.height = null;
		this.translate = null;
		this.transitionTimeout = null;
		this.expandCall = null;
		this.updateCall = null;

		this.expandBind = this.expand.bind(this);
		this.updateBind = this.update.bind(this);
		this.resetBind = this.reset.bind(this);

		this.element = element;
		this.handle = element.querySelector("[data-handle]");

		this.settings = this.extendSettings(settings);
		this.reverse = this.settings.reverse ? -1 : 1;

		this.handle.style.margin = `${this.settings.expansion / 2}px`;

		this.eventListeners();
	}

	eventListeners(remove) {
		if(!remove) {
			this.onMouseEnterBind = this.onMouseEnter.bind(this);
			this.onMouseMoveBind = this.onMouseMove.bind(this);
			this.onMouseLeaveBind = this.onMouseLeave.bind(this);
		}
		
		let action = (remove ? "remove" : "add") + "EventListener";
		
		this.handle[action]("mouseenter", this.onMouseEnterBind);
		this.handle[action]("mousemove", this.onMouseMoveBind);
		this.handle[action]("mouseleave", this.onMouseLeaveBind);
	}

	destroy() {
		clearTimeout(this.transitionTimeout);
		if (this.expandCall !== null) {
			cancelAnimationFrame(this.expandCall);
		}
		if (this.updateCall !== null) {
			cancelAnimationFrame(this.updateCall);
		}

		this.reset();

		this.eventListeners(true);
		this.element.neonBubble = null;
		delete this.element.neonBubble;

		this.element = null;
	}

	onMouseEnter(event) {
		if (this.expandCall !== null) {
			cancelAnimationFrame(this.expandCall);
		}

		this.updateElementPosition();
		this.element.style.willChange = "transform";

		this.expandCall = requestAnimationFrame(this.expandBind);
	}

	onMouseMove(event) {
		if (this.updateCall !== null) {
			cancelAnimationFrame(this.updateCall);
		}

		this.event = event;
		this.updateCall = requestAnimationFrame(this.updateBind);
	}

	onMouseLeave(event) {
		this.handle.animate(
			[
				{
					width: `${this.width + this.settings.expansion}px`,
					height: `${this.height + this.settings.expansion}px`,
					margin: 0
				},
				{
					width: `${this.width}px`,
					height: `${this.height}px`,
					margin: `${this.settings.expansion / 2}px`
				}
			],
			{
				duration: this.settings.duration,
				fill: "forwards",
				easing: this.settings.easing
			}
		);

		this.setTransition();

		if (this.settings.reset) {
			requestAnimationFrame(this.resetBind);
		}

		this._canMove = false;
	}

	reset() {
		this.element.style.transform = "translate3d(0,0,0)";
	}

	expand() {
		const animate = {
			start: {
				width: this.width,
				height: this.height,
				margin: this.settings.expansion / 2
			},
			mid: {
				width: this.width + this.settings.expansion * 2,
				height: this.height + this.settings.expansion * 2
			},
			end: {
				width: this.width + this.settings.expansion,
				height: this.height + this.settings.expansion,
				margin: 0
			}
		};

		this.handle.animate(
			[
				{
					width: `${animate.start.width}px`,
					height: `${animate.start.height}px`,
					margin: `${animate.start.margin}px`
				},
				{
					width: `${animate.mid.width}px`,
					height: `${animate.mid.height}px`,
					margin: `${animate.start.margin -
						(animate.mid.width - animate.start.width) / 2}px ${animate.start.margin -
						(animate.mid.height - animate.start.height) / 2}px`
				},
				{
					width: `${animate.end.width}px`,
					height: `${animate.end.height}px`,
					margin: `${animate.end.margin}px`
				}
			],
			{ duration: 200, fill: "forwards" }
		);

		this.expandCall = null;
	}

	getOffset() {
		return {
			x: (this.event.pageX - this.center.x) / (this.width / 2),
			y: (this.event.pageY - this.center.y) / (this.height / 2)
		};
	}

	canMove() {
		const offset = this.getOffset();
		if (!this._canMove) {
			if (
				this.sameSign(offset.x, this.event.movementX) ||
				this.sameSign(offset.y, this.event.movementY)
			) {
				this._canMove = true;
			}
		}
		return this._canMove;
	}

	sameSign(offsetAxis, movementAxis) {
		return (
			(offsetAxis > 0 && movementAxis > 0) || (offsetAxis < 0 && movementAxis < 0)
		);
	}

	getValues() {
		const offset = this.getOffset();

		const translateX = (
			this.reverse *
			(offset.x * this.settings.offsetMax)
		).toFixed(2);
		const translateY = (
			this.reverse *
			(offset.y * this.settings.offsetMax)
		).toFixed(2);
		const angle =
			Math.atan2(
				this.event.clientX - this.center.x,
				-(this.event.clientY - this.center.y)
			) *
			(180 / Math.PI);

		return {
			translateX,
			translateY,
			angle
		};
	}

	updateElementPosition() {
		const rect = this.handle.getBoundingClientRect();

		this.center = {
			x: rect.left + window.scrollX + rect.width / 2,
			y: rect.top + window.scrollY + rect.height / 2
		};
		this.width = this.width || rect.width;
		this.height = this.height || rect.height;
	}

	update() {
		const values = this.getValues();

		if (this.canMove()) {
			this.element.style.transform = `translate3d(${
				this.settings.axis === "x" ? 0 : values.translateX
			}px, ${this.settings.axis === "y" ? 0 : values.translateY}px, 0)`;
		}

		this.element.dispatchEvent(
			new CustomEvent("neonBubbleChange", {
				detail: values
			})
		);

		this.updateCall = null;
	}

	setTransition() {
		clearTimeout(this.transitionTimeout);
		this.element.style.transition =
			this.settings.duration + "ms " + this.settings.easing;

		this.transitionTimeout = setTimeout(() => {
			this.element.style.transition = "";
		}, this.settings.duration);
	}

	extendSettings(settings) {
		const defaultSettings = {
			expansion: 10,
			offsetMax: 15,
			easing: "cubic-bezier(.5,0,.5,1.75)", //(.5,0,.5,1.75) / (.5,0,.5,2) / (.5,.5,.5,5)
			duration: 300,
			reverse: false,
			axis: null,
			reset: true
		};

		const newSettings = {};
		for (const property in defaultSettings) {
			if (property in settings) {
				newSettings[property] = settings[property];
			} else if (this.element.hasAttribute(`data-nb-${property}`)) {
				const attribute = this.element.getAttribute(`data-nb-${property}`);
				try {
					newSettings[property] = JSON.parse(attribute);
				} catch (e) {
					newSettings[property] = attribute;
				}
			} else {
				newSettings[property] = defaultSettings[property];
			}
		}

		return newSettings;
	}

	static bind(elements, settings) {
		if (elements instanceof Node) {
			elements = [elements];
		}

		if (elements instanceof NodeList) {
			elements = [].slice.call(elements);
		}

		if (!(elements instanceof Array)) {
			return;
		}

		elements.forEach(element => {
			if (!("neonBubble" in element)) {
				element.NeonBubble = new NeonBubble(element, settings);
			}
		});
	}
}

if (typeof document !== "undefined") {
	/* expose the class to window */
	window.NeonBubble = NeonBubble;

	/**
	 * Auto load
	 */
	NeonBubble.bind(document.querySelectorAll("[data-nb]"));
}