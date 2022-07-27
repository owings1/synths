/**
 * WebAudio effects.
 * 
 * @author Doug Owings <doug@dougowings.net>
 * @license MIT
 */
 import {
    EffectsNode,
    optsMerge,
    paramProp,
    setOrigin,
} from './core.js'
import '../tone.js'

/**
 * Wah effect.
 */
export default class Wah extends EffectsNode {

    /**
     * @param {AudioContext} context
     * @param {object} opts
     */
     constructor(context, opts = {}) {
        super(context)
        Tone.setContext(context)
        opts = optsMerge(this.meta.params, opts)
        const input = new GainNode(context)
        const wn = new Tone.AutoWah()
        Object.defineProperties(this, {
            wet: {value: wn.wet},
            base: paramProp(
                () => wn.baseFrequency,
                value => wn.baseFrequency = value
            ),
            sensitivity: paramProp(
                () => wn.sensitivity,
                value => wn.sensitivity = value
            ),
            octaves: paramProp(
                () => wn.octaves,
                value => wn.octaves = value
            ),
            quality: {value: wn.Q},
        })
        Tone.connect(setOrigin(this, input), wn)
        wn.connect(this.output)
        this.update(opts)
    }
}

const tdefs = Tone.AutoWah.getDefaults()

Wah.Meta = {
    name: 'Wah',
    params: {
        wet: {
            type: 'float',
            default: tdefs.wet,
            min: 0.01,
            max: 1.0,
            step: 0.01,
        },
        base: {
            type: 'integer',
            default: tdefs.base,
            min: 1,
            max: 1000,
            step: 1,
        },
        sensitivity: {
            type: 'float',
            default: tdefs.sensitivity,
            min: -40,
            max: 0,
            step: 0.1,
        },
        octaves: {
            type: 'integer',
            default: tdefs.octaves,
            min: 1,
            max: 5,
            step: 1,
        },
        quality: {
            type: "integer",
            default: tdefs.Q,
            min: 0,
            max: 10,
            step: 1,
        },
    },
}

export {Wah}
