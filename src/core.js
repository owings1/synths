
/**
 * WebAudio effects.
 * 
 * @author Doug Owings <doug@dougowings.net>
 * @license MIT
 */

const symOutpt = Symbol('outpt')

/**
 * Base node class.
 */
export class BaseNode extends GainNode {

    /**
     * Setup `Effect` wrapper origin
     * 
     * @param {Effect} node The `Effect` instance
     * @param {AudioNode} dest The `AudioNode` destination
     * @return {AudioNode} The destination
     */
    static setInput(node, dest) {
        return GainNode.prototype.connect.call(node, dest)
    }

    /**
     * Merge user options from param definitions
     * 
     * @param {object[]|Array} defs Param definitions with `default`, or literal value
     * @param {*} opts User options
     * @return {object} Modified `opts` or new object.
     */
    static mergeOpts(defs, opts) {
        opts = opts ? {...opts} : {}
        Object.entries(defs).forEach(([name, def]) => {
            const defaultValue = typeof def === 'object'
                ? def.default
                : def
            opts[name] = opts[name] === undefined
                ? defaultValue
                : opts[name]
        })
        return opts
    }

    /**
     * @param {AudioContext} context
     * @param {object} opts
     */
    constructor(context, opts = {}) {
        super(context, opts)
        this[symOutpt] = new GainNode(context)
    }

    get output() {
        return this[symOutpt]
    }

    /**
     * @param {AudioNode} dest
     */
    connect(dest) {
        return this[symOutpt].connect(dest)
    }

    disconnect(...args) {
        this[symOutpt].disconnect(...args)
    }

    /**
     * Update parameter values
     * 
     * @param {object} opts
     * @return {BaseNode} self
     */
    update(opts) {
        Object.keys(this.meta.params).forEach(key => {
            const value = opts[key]
            if (value !== undefined) {
                this[key].value = value
            }
        })
        return this
    }

    /**
     * Read parameter values
     * @return {object}
     */
    paramValues() {
        return Object.fromEntries(
            Object.keys(this.meta.params).map(key =>
                [key, this[key].value]
            )
        )
    }

    /** @type {object} */
    get meta() {
        return this.constructor.Meta
    }
}

export class InstrumentWrapper extends BaseNode {
    triggerAttack(...args) {
        return this.instrument.triggerAttack(...args)
    }
    triggerAttackRelease(...args) {
        return this.instrument.triggerAttackRelease(...args)
    }
    triggerRelease(...args) {
        return this.instrument.triggerRelease(...args)
    }
    get oscillator() {
        return this.instrument.oscillator
    }
}
/**
 * Make a property definition for a stub param object
 * 
 * @param {Function} vget Setter for `value` property
 * @param {Function} vset Getter for `value` property
 * @return {object}
 */
export function paramProp(vget, vset) {
    return {
        enumerable: true,
        value: paramObject(vget, vset),
    }
}

/**
 * Make a stub AudioParam object that sets all param values, and
 * delegates prototype method to all params
 * 
 * @param {AudioParam[]} params
 * @param {object} opts
 * @param {Boolean} opts.divide
 * @return {object}
 */
export function fusedParam(params, opts = undefined) {
    opts = opts || {}
    const {divide} = opts
    const leader = params[0]
    const vget = () => {
        let {value} = leader
        if (divide) {
            value = value * params.length
        }
        return value
    }
    const vset = value => {
        if (divide) {
            value = value / params.length
        }
        params.forEach(param => param.value = value)
    }
    const fused = paramObject(vget, vset)
    Object.getOwnPropertyNames(AudioParam.prototype)
        .filter(prop => typeof leader[prop] === 'function')
        .forEach(method => {
            const func = leader[method]
            fused[method] = (...args) => {
                params.forEach(param => func.apply(param, args.slice(0)))
            }
        })
    return fused
}

/**
 * Make a stub object like an `AudioParam`
 * 
 * @param {Function} vget Setter for `value` property
 * @param {Function} vset Getter for `value` property
 * @return {object}
 */
function paramObject(vget, vset) {
    return {
        get value() { return vget() },
        set value(value) { vset(value) },
    }
}
