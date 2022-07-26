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
    setOrigin,
    symOutpt,
} from './core.js'


/**
 * Delay with feedback.
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
        const dys = []
        for (let i = 0; i < dyCount; i++) {
            dys.push(new DelayNode(context))
        }
        const dyTimes = fusedParam(dys.map(node => node.delayTime), {divide: true})
        Object.defineProperties(this, {
            delayTime: {value: dyTimes},
            feedback: {value: fb.gain},
        })

        setOrigin(this, dys[0])
        let node = dys[0]
        for (let i = 1; i < dys.length; i++) {
            node = node.connect(dys[i])
        }
        node.connect(this[symOutpt])
        node.connect(fb).connect(dys[0])
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