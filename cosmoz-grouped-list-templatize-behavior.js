window.Cosmoz = window.Cosmoz || {};

const {
	FlattenedNodesObserver,
	Templatize,
	dedupingMixin
} = Polymer;

/** @polymerBehavior */
Cosmoz.GroupedListTemplatizeMixin = dedupingMixin(base => class extends base {
	static get properties() {
		return {
			as: {
				type: String,
				value: 'item'
			},

			indexAs: {
				type: String,
				value: 'index'
			},
		};
	}


	constructor() {
		super();

		this._reusableInstances = [];
		this._instances = [];
		this._boundOnTemplatesChange = this._onTemplatesChange.bind(this);
	}

	/**
	 * Polymer `connectedCallback` livecycle function.
	 *
	 * @returns {void}
	 */
	connectedCallback() {
		super.connectedCallback();
		this._templatesObserver = new FlattenedNodesObserver(
			this.$.templates,
			this._boundOnTemplatesChange
		);
	}

	/**
	 * Polymer `disconnectedCallback` livecycle function.
	 *
	 * @returns {void}
	 */
	disconnectedCallback() {
		super.disconnectedCallback();
		this._templatesObserver.disconnect();
		this._removeInstances();
	}

	/**
	 * Get instance default properties.
	 * @returns {object} Default properties.
	 */
	_getInstanceDefaultProps() {
		return {
			[this.as]: true,
			[this.indexAs]: true,
			folded: true,
			expanded: true,
			selected: true,
			highlighted: true
		};
	}

	/**
	 * Set template defaults.
	 * @param {array} addedNodes Added nodes.
	 * @returns {void}
	 */
	_onTemplatesChange({addedNodes}) {
		const ctors = this._ctors;

		if (ctors && Object.keys(ctors) > 0) {
			return;
		}

		const templates = Array.from(addedNodes)
			.filter(n => n.matches && n.matches('template[data-type]'));

		if (templates.length === 0) {
			console.warn('cosmoz-grouped-list requires templates');
			return;
		}

		this._ctors = templates.reduce((ctors, template) => {
			const type = template.dataset.type;
			ctors[type] = Templatize.templatize(template, this, {
				instanceProps: this._getInstanceDefaultProps(),
				parentModel: true,
				forwardHostProp: this._forwardHostProp,
				notifyInstanceProp: this._notifyInstanceProp
			});
			return ctors;
		}, {});
	}

	/**
	 * Reuse an existing TemplateInstance or create a new one if there is not any available.
	 *
	 * @param		{String}						type					 The type of instance to return
	 * @param		{Object}						props					 Properties to set on the instance
	 * @param		{TemplateInstance}	prevInstance	 The previously used instance
	 * @param		{Boolean}						flush					 True if instance properties should be flushed.
	 * @returns {TemplateInstance}								 The instance to use
	*/
	_getInstance(type, props = {}, prevInstance, flush = true) {
		const ctors = this._ctors;
		if (ctors == null || Object.keys(ctors).length === 0) {
			console.warn('cosmoz-grouped-list templates are required.');
			return;
		}
		if (ctors[type] == null) {
			console.warn(`cosmoz-grouped-list template for ${type} type not found.`);
		}

		if (prevInstance && prevInstance.__type === type) {
			this._forwardProperties(prevInstance, props, flush);
			return prevInstance;
		}

		if (prevInstance) {
			this._reuseInstance(prevInstance);
		}

		const {_reusableInstances: reusable, _instances: instances} = this;

		let instance = reusable.find(({__type}) => __type === type);

		if (instance) {
			reusable.splice(reusable.indexOf(instance), 1);
			this._forwardProperties(instance, props, flush);
		} else {
			instance = new ctors[type](props);
			instance.__type = type;
			instance.element = instance.root.querySelector('*');
		}
		instances.push(instance);
		return instance;
	}

	/**
	 * Get an instance by a matching property value.
	 * @param {string} prop Property
	 * @param {any} value Value.
	 * @return {object} Matching instance.
	 */
	_getInstanceByProperty(prop, value) {
		return this._instances
			.find(instance => this._getInstanceProperty(instance, prop) === value);
	}

	/**
	 * Get an instance property.
	 * @param {object} instance Instance.
	 * @param {string} prop Property in instance.
	 * @return {any} Instance property.
	 */
	_getInstanceProperty(instance, prop) {
		return instance._getProperty(prop);
	}

	/**
	 * Forward host property.
	 * @param {string} prop Property.
	 * @param {any} value Value.
	 * @returns {void}
	 */
	_forwardHostProp(prop, value) {
		const forward = instance => instance.forwardHostProp(prop, value);
		this._instances.forEach(forward);
		this._reusableInstances.forEach(forward);
	}

	/**
	 * Forward a property.
	 * @param {object} instance Instance.
	 * @param {string} name Property name.
	 * @param {any} value Property value.
	 * @param {boolean} flush Whether to flush properties.
	 * @returns {void}
	 */
	_forwardProperty(instance, name, value, flush = false) {
		instance._setPendingProperty(name, value);
		if (flush && instance._flushProperties) {
			instance._flushProperties(true);
		}
	}

	/**
	 * Forward properties.
	 * @param {object} instance Instance.
	 * @param {object} props Properties to forward.
	 * @param {boolean} flush Whether to flush properties.
	 * @returns {void}
	 */
	_forwardProperties(instance, props = {}, flush = true) {
		Object.keys(props)
			.forEach(key => this._forwardProperty(instance, key, props[key]));
		if (flush && instance._flushProperties) {
			instance._flushProperties(true);
		}
	}

	/**
	 * Forward a property by item.
	 * @param {object} item Item.
	 * @param {string} property Property.
	 * @param {any} value Value.
	 * @param {boolean} flush Whether to flush properties.
	 * @returns {void}
	 */
	_forwardPropertyByItem(item, property, value, flush) {
		const instance = this._getInstanceByProperty('item', item);
		if (!instance) {
			return;
		}
		this._forwardProperty(instance, property, value, flush);
	}

	/**
	 * Detach an instance from the DOM.
	 * @param {object} instance Instance to detach.
	 * @param {boolean} reuse Whether to reuse it.
	 * @returns {void}
	 */
	_detachInstance(instance, reuse = false) {
		if (!instance) {
			return;
		}
		const {children, root} = instance,
			dom = Polymer.dom;

		for (let i = 0; i < children.length; i++) {
			const child = children[i],
				parent = child.parentNode;
			if (reuse) {
				dom(root).appendChild(child);
			} else if (parent !== null) {
				dom(parent).removeChild(child);
			}
		}

		if (!reuse) {
			instance.element = null;
		}
	}

	/**
	 * Reuse an instance - remove it from the list, detach it and make it available.
	 * @param {object} instance Instance to reuse.
	 * @returns {void}
	 */
	_reuseInstance(instance) {
		if (!instance) {
			return;
		}
		const {_reusableInstances: reusable, _instances: instances} = this,
			index = instances.indexOf(instance);
		if (index < 0) {
			return;
		}
		instances.splice(index, 1);
		reusable.push(instance);
		this._detachInstance(instance, true);
	}

	/**
	 * Remove an instance by removing it from the list and detaching it.
	 * @param {object} instance Instance to remove.
	 * @returns {void}
	 */
	_removeInstance(instance) {
		if (!instance) {
			return;
		}

		const {_reusableInstances: reusable, _instances: instances} = this,
			ridx = reusable.indexOf(instance),
			uidx = instances.indexOf(instance);
		if (ridx) {
			reusable.splice(ridx, 1);
		}
		if (uidx) {
			instances.splice(uidx, 1);
		}
		this._detachInstance(instance);
	}

	/**
	 * Remove instances
	 * @returns {void}
	 */
	_removeInstances() {
		this._reusableInstances.splice(0).forEach(this._detachInstance);
		this._instances.splice(0).forEach(this._detachInstance);
	}
});
