/**
 * WebAudio effects.
 * 
 * @author Doug Owings <doug@dougowings.net>
 * @license MIT
 * 
 * `Freeverb` class adapted from code by Anton Miselaytes
 */
import {
    EffectsNode,
    fusedParam,
    optsMerge,
    setOrigin,
} from './core.js'

const COMB_TUNINGS = [1557, 1617, 1491, 1422, 1277, 1356, 1188, 1116]
const ALLPASS_FREQS = [225, 556, 441, 341]

/**
 * Freeverb algorithmic reverb
 * 
 * Adapted from code by Anton Miselaytes
 * 
 * https://github.com/miselaytes-anton/web-audio-experiments/
 */
export default class Freeverb extends EffectsNode {

    /**
     * @param {AudioContext} context
     * @param {object} opts
     * @param {Number} opts.wet
     * @param {Number} opts.dry
     * @param {Number} opts.resonance
     * @param {Number} opts.dampening
     */
    constructor(context, opts) {
        super(context)
        opts = optsMerge(this.meta.params, opts)
        const input = new GainNode(context)
        const wet = new GainNode(context)
        const dry = new GainNode(context)
        const combs = COMB_TUNINGS.map(value =>
            new LowpassCombFilter(context, {delay: value / context.sampleRate})
        )
        Object.defineProperties(this, {
            wet: {value: wet.gain},
            dry: {value: dry.gain},
            resonance: {value: fusedParam(combs.map(comb => comb.resonance))},
            dampening: {value: fusedParam(combs.map(comb => comb.dampening))},
        })
        setOrigin(this, input)
        const merger = new ChannelMergerNode(context, {numberOfInputs: 2})
        const splitter = new ChannelSplitterNode(context, {numberOfOutputs: 2})
        const combsMid = Math.floor(combs.length / 2)
        const combLeft = combs.slice(0, combsMid)
        const combRight = combs.slice(combsMid)
        const passes = ALLPASS_FREQS.map(freq => {
            const node = new BiquadFilterNode(context, {type: 'allpass'})
            node.frequency.value = freq
            return node
        })
        input.connect(dry).connect(this.output)
        input.connect(wet).connect(splitter)
        combLeft.forEach(comb => {
            splitter.connect(comb, 0).connect(merger, 0, 0)
        })
        combRight.forEach(comb => {
            splitter.connect(comb, 1).connect(merger, 0, 1)
        })
        let node = merger
        passes.forEach(fn => node = node.connect(fn))
        node.connect(this.output)
        this.update(opts)
    }
}

Freeverb.Meta = {
    name: 'Freeverb',
    params: {
        wet: {
            type: "float",
            default: 0.2,
            min: 0.0,
            max: 1.0,
            step: 0.01,
        },
        dry: {
            type: "float",
            default: 1.0,
            min: 0.0,
            max: 3.0,
            step: 0.01,
        },
        resonance: {
            type: "float",
            default: 0.5,
            min: 0.0,
            max: 1.0,
            step: 0.01,
        },
        dampening: {
            type: "integer",
            default: 1000,
            min: 40,
            max: 3000,
            step: 1,
            unit: 'Hz',
        },
    },
}

export {Freeverb}

/**
 * Comb filter for Freeverb
 * 
 * Adapted from code by Anton Miselaytes
 * 
 * https://github.com/miselaytes-anton/web-audio-experiments/
 */
class LowpassCombFilter extends EffectsNode {

    constructor(context, opts) {
        super(context)
        opts = optsMerge(this.meta.params, opts)
        const input = new GainNode(context)
        const dn = new DelayNode(context)
        const lp = new BiquadFilterNode(context)
        const gn = new GainNode(context)
        Object.defineProperties(this, {
            delay: {value: dn.delayTime},
            resonance: {value: gn.gain},
            dampening: {value: lp.frequency},
        })
        setOrigin(this, input)
            .connect(dn)
            .connect(lp)
            .connect(gn)
            .connect(input)
            .connect(this.output)
        this.update(opts)
    }
}

LowpassCombFilter.Meta = {
    name: 'LowpassCombFilter',
    params: {
        delay: {
            type: "float",
            default: 0.5,
            min: 0.0,
            max: 1.0,
            step: 0.01,
        },
        resonance: {
            type: "float",
            default: 0.5,
            min: 0.0,
            max: 1.0,
            step: 0.01,
        },
        dampening: {
            type: "integer",
            default: 1000,
            min: 40,
            max: 3000,
            step: 1,
            unit: 'Hz',
        },
    }
}