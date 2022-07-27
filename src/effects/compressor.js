/**
 * WebAudio effects.
 * 
 * @author Doug Owings <doug@dougowings.net>
 * @license MIT
 */
import {BaseNode} from '../core.js'

/**
 * Compressor.
 */
export default class Compressor extends BaseNode {

    /**
     * @param {AudioContext} context
     * @param {object} opts
     * @param {Number} opts.gain
     * @param {Number} opts.threshold
     * @param {Number} opts.ratio
     * @param {Number} opts.knee
     * @param {Number} opts.attack
     * @param {Number} opts.release
     */
    constructor(context, opts = {}) {
        super(context)
        opts = BaseNode.mergeOpts(this.meta.params, opts)
        const input = new DynamicsCompressorNode(context)
        Object.defineProperties(this, {
            threshold: {value: input.threshold},
            knee: {value: input.knee},
            ratio: {value: input.ratio},
            attack: {value: input.attack},
            release: {value: input.release},
        })
        BaseNode.setInput(this, input).connect(this.output)
        this.update(opts)
    }
}

Compressor.Meta = {
    name: 'Compressor',
    params: {
        gain: {
            type: "float",
            default: 1.0,
            min: 0.0,
            max: 3.0,
            step: 0.01,
        },
        threshold: {
            type: "integer",
            default: -50,
            min: -100,
            max: 0,
            step: 1,
            unit: "dB",
            help: "decibel value above which the compression will start taking effect"
        },
        knee: {
            type: "float",
            default: 40.0,
            min: 0.0,
            max: 40.0,
            step: 0.1,
            unit: "dB",
            help: "decibel range above the threshold where the curve smoothly transitions to the compressed portion",
        },
        ratio: {
            type: "float",
            default: 12.0,
            min: 1.0,
            max: 20.0,
            step: 0.1,
            unit: 'dB',
            help: "amount of change, in dB, needed in the input for a 1 dB change in the output",
        },
        attack: {
            type: "float",
            default: 0.0,
            min: 0.0,
            max: 1.0,
            step: 0.01,
            unit: 's',
            help: "the amount of time, in seconds, required to reduce the gain by 10 dB",
        },
        release: {
            type: "float",
            default: 0.25,
            min: 0.0,
            max: 1.0,
            step: 0.01,
            unit: 's',
            help: "the amount of time, in seconds, required to increase the gain by 10 dB",
        },
    },
}

export {Compressor}