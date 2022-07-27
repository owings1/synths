/**
 * WebAudio effects.
 * 
 * @author Doug Owings <doug@dougowings.net>
 * @license MIT
 */
import {
    EffectsNode,
    fusedParam,
    optsMerge,
} from './core.js'

/**
 * Delay with feedback and arbitrary delay time.
 */
export default class Delay extends EffectsNode {

    /**
     * @param {AudioContext} context
     * @param {object} opts
     * @param {Number} opts.delayTime
     * @param {Number} opts.feedback
     */
    constructor(context, opts = {}) {
        super(context)
        opts = optsMerge(this.meta.params, opts)
        const fb = new GainNode(context)
        // Make enough delay nodes to support max value, since each has max 1.
        const dyCount = Math.max(1, Math.ceil(this.meta.params.delayTime.max))
        const dyChain = []
        for (let i = 0; i < dyCount; i++) {
            dyChain.push(new DelayNode(context))
        }
        const input = dyChain[0]
        const dyTimes = fusedParam(
            dyChain.map(node => node.delayTime),
            {divide: true}
        )
        Object.defineProperties(this, {
            delayTime: {value: dyTimes},
            feedback: {value: fb.gain},
        })

        EffectsNode.setInput(this, input)
        let node = input
        for (let i = 1; i < dyChain.length; i++) {
            node = node.connect(dyChain[i])
        }
        node.connect(this.output)
        node.connect(fb).connect(input)
        this.update(opts)
    }
}

Delay.Meta = {
    name: 'Delay',
    params: {
        gain: {
            type: "float",
            default: 1.0,
            min: 0.0,
            max: 3.0,
            step: 0.01,
        },
        delayTime: {
            label: "time",
            type: "float",
            default: 0.5,
            min: 0.0,
            max: 6.0,
            step: 0.01,
            unit: 's',
        },
        feedback: {
            type: "float",
            default: 0.5,
            min: 0.0,
            max: 1.0,
            step: 0.01,
        },
    }
}

export {Delay}