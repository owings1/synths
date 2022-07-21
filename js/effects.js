/**
 * WebAudio effects.
 * 
 * @author Doug Owings <doug@dougowings.net>
 * @license MIT
 * 
 * `Overdrive` class adapted from code by Nick Thompson.
 */

/**
 * Effects base class.
 */
export class EffectsNode extends GainNode {

    /**
     * @param {AudioContext} context
     * @param {object} opts
     */
    constructor(context, opts = {}) {
        super(context, opts)
        this.output = new GainNode(context)
    }

    /**
     * @param {AudioNode} dest
     */
    connect(dest) {
        return this.output.connect(dest)
    }

    disconnect(...args) {
        this.output.disconnect(...args)
    }

    /**
     * Update parameter values.
     * 
     * @param {object} opts
     */
    update(opts) {
        Object.keys(this.meta.params).forEach(key => {
            const value = opts[key]
            if (value !== undefined) {
                this[key].value = value
            }
        })
    }

    /** @type {object} */
    get meta() {
        return this.constructor.Meta
    }
}

/**
 * Compressor.
 */
export class Compressor extends EffectsNode {

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
        opts = optsMerge(this.meta.params, opts)

        const cp = new DynamicsCompressorNode(context)

        Object.defineProperties(this, {
            threshold: {value: cp.threshold},
            knee: {value: cp.knee},
            ratio: {value: cp.ratio},
            attack: {value: cp.attack},
            release: {value: cp.release},
        })

        setOrigin(this, cp)
        cp.connect(this.output)

        this.update(opts)
    }
}

Compressor.Meta = {
    name: 'Compressor',
    params: {
        gain: {
            min: 0.0,
            max: 3.0,
            default: 1.0,
            type: "float",
            step: 0.01,
            label: "Gain",
        },
        threshold: {
            min: -100,
            max: 0,
            default: -50,
            type: "integer",
            step: 1,
            label: "Threshold",
            unit: "dB",
            help: "decibel value above which the compression will start taking effect"
        },
        knee: {
            min: 0.0,
            max: 40.0,
            default: 40.0,
            type: "float",
            step: 0.1,
            label: "Knee",
            unit: "dB",
            help: "decibel range above the threshold where the curve smoothly transitions to the compressed portion",
        },
        ratio: {
            min: 1.0,
            max: 20.0,
            default: 12.0,
            type: "float",
            step: 0.1,
            label: "Ratio",
            unit: 'dB',
            help: "amount of change, in dB, needed in the input for a 1 dB change in the output",
        },
        attack: {
            min: 0.0,
            max: 1.0,
            default: 0.0,
            type: "float",
            step: 0.01,
            label: "Attack",
            unit: 's',
            help: "the amount of time, in seconds, required to reduce the gain by 10 dB",
        },
        release: {
            min: 0.0,
            max: 1.0,
            default: 0.25,
            type: "float",
            step: 0.01,
            label: "Release",
            unit: 's',
            help: "the amount of time, in seconds, required to increase the gain by 10 dB",
        },
    },
}

/**
 * Basic lowpass filter
 */
export class Lowpass extends EffectsNode {

    /**
     * @param {AudioContext} context
     * @param {object} opts
     * @param {Number} opts.gain
     * @param {Number} opts.cutoff
     * @param {Number} opts.quality
     */
    constructor(context, opts = {}) {
        super(context)
        opts = optsMerge(this.meta.params, opts)

        const bq = new BiquadFilterNode(context)

        Object.defineProperties(this, {
            cutoff: {value: bq.frequency},
            quality: {value: bq.Q},
        })

        setOrigin(this, bq)
        bq.connect(this.output)

        bq.type = 'lowpass'

        this.update(opts)
    }
}

Lowpass.Meta = {
    name: 'Lowpass',
    params: {
        gain: {
            min: 0.0,
            max: 3.0,
            default: 1.0,
            type: "float",
            step: 0.01,
            label: "Gain",
        },
        cutoff: {
            min: 40,
            max: 3000,
            default: 1000,
            type: "integer",
            step: 1,
            label: "Cutoff",
            unit: 'Hz',
        },
        quality: {
            min: 0,
            max: 10,
            default: 1,
            type: "integer",
            step: 1,
            label: "Quality",
        },
    },
}

/**
 * Basic highpass filter.
 */
export class Highpass extends EffectsNode {

    /**
     * @param {AudioContext} context
     * @param {object} opts
     * @param {Number} opts.gain
     * @param {Number} opts.cutoff
     * @param {Number} opts.quality
     */
     constructor(context, opts = {}) {
        super(context)
        opts = optsMerge(this.meta.params, opts)

        const bq = new BiquadFilterNode(context)

        Object.defineProperties(this, {
            cutoff: {value: bq.frequency},
            quality: {value: bq.Q},
        })

        setOrigin(this, bq)
        bq.connect(this.output)

        bq.type = 'highpass'

        this.update(opts)
    }
}

Highpass.Meta = {
    name: 'Highpass',
    params: {
        gain: {
            min: 0.0,
            max: 3.0,
            default: 1.0,
            type: "float",
            step: 0.01,
            label: "Gain",
        },
        cutoff: {
            min: 40,
            max: 2000,
            default: 100,
            type: "integer",
            step: 1,
            label: "Cutoff",
            unit: 'Hz',
        },
        quality: {
            min: 0,
            max: 10,
            default: 1,
            type: "integer",
            step: 1,
            label: "Quality",
        },
    },
}

/**
 * Delay with feedback.
 */
export class Delay extends EffectsNode {

    /**
     * @param {AudioContext} context
     * @param {object} opts
     * @param {Number} opts.delayTime
     * @param {Number} opts.feedback
     */
    constructor(context, opts = {}) {
        super(context)
        opts = optsMerge(this.meta.params, opts)

        const dy = new DelayNode(context)
        const fb = new GainNode(context)

        Object.defineProperties(this, {
            delayTime: {value: dy.delayTime},
            feedback: {value: fb.gain},
        })

        setOrigin(this, dy)
        dy.connect(fb)
        fb.connect(dy)
        dy.connect(this.output)

        this.update(opts)
    }
}

Delay.Meta = {
    name: 'Delay',
    params: {
        gain: {
            min: 0.0,
            max: 3.0,
            default: 1.0,
            type: "float",
            step: 0.01,
            label: "Gain",
        },
        delayTime: {
            min: 0.0,
            max: 1.0,
            default: 0.5,
            type: "float",
            step: 0.01,
            label: "Time",
            unit: 's',
        },
        feedback: {
            min: 0.0,
            max: 1.0,
            default: 0.5,
            type: "float",
            step: 0.01,
            label: "Feedback",
        },
    }
}

/**
 * Basic distortion effect.
 */
export class Distortion extends EffectsNode {

    /**
     * @param {AudioContext} context
     * @param {object} opts
     * @param {Number} opts.gain
     * @param {Number} opts.drive
     */
    constructor(context, opts = {}) {
        super(context)
        opts = optsMerge(this.meta.params, opts)
        
        const ws = new WaveShaperNode(context)
        const fb = new GainNode(context)

        let drive

        Object.defineProperties(this, {
            drive: paramProp(() => drive, value => {
                drive = Number(value)
                ws.curve = makeDistortionCurve(drive * 1000)
            }),
            feedback: {value: fb.gain},
        })

        setOrigin(this, ws)
        ws.connect(fb)
        fb.connect(ws)
        ws.connect(this.output)
        
        ws.oversample = '4x'

        this.update(opts)
    }
}

Distortion.Meta = {
    name: "Distortion",
    params: {
        gain: {
            min: 1.0,
            max: 3.0,
            default: 1.2,
            type: "float",
            step: 0.01,
            label: "Gain",
        },
        drive: {
            min: 0.0,
            max: 1.0,
            default: 0.4,
            type: "float",
            step: 0.01,
            label: "Drive",
        },
        feedback: {
            min: 0.0,
            max: 1.0,
            default: 0.0,
            type: "float",
            step: 0.01,
            label: "Feedback",
        },
    }
}

/**
 * Overdrive effect.
 * 
 * @see https://github.com/web-audio-components/overdrive
 * 
 * Copyright (c) 2012 Nick Thompson
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * -----
 * Adapted to class.
 */
export class Overdrive extends EffectsNode {

    /**
     * @param {AudioContext} context
     * @param {object} opts
     * @param {Number} opts.gain
     * @param {Number} opts.drive
     * @param {Number} opts.color
     * @param {Number} opts.preBand
     * @param {Number} opts.postCut
     */
    constructor(context, opts = {}) {
        super(context)
        opts = optsMerge(this.meta.params, opts)

        const bp = new BiquadFilterNode(context)
        const bpWet = new GainNode(context)
        const bpDry = new GainNode(context)
        const ws = new WaveShaperNode(context)
        const lp = new BiquadFilterNode(context)
        const fb = new GainNode(context)
        
        let drive

        Object.defineProperties(this, {
            color: paramProp(() => bp.frequency.value, value => {
                bp.frequency.setValueAtTime(value, 0)
            }),
            drive: paramProp(() => drive, value => {
                drive = Number(value)
                ws.curve = makeDistortionCurve(drive * 100, 22050)
            }),
            feedback: {value: fb.gain},
            preBand: paramProp(() => bpWet.gain.value, value => {
                value = Number(value)
                bpWet.gain.setValueAtTime(value, 0)
                bpDry.gain.setValueAtTime(1 - value, 0)
            }),
            postCut: paramProp(() => lp.frequency.value, value => {
                lp.frequency.setValueAtTime(value, 0)
            }),
        })

        setOrigin(this, bp)
        bp.connect(bpWet)
        bp.connect(bpDry)
        bpWet.connect(ws)
        bpDry.connect(ws)
        ws.connect(lp)
        lp.connect(fb) // feedback
        fb.connect(bp)
        lp.connect(this.output)

        bp.frequency.value = opts.color
        bpWet.gain.value = opts.preBand
        bpDry.gain.value = 1 - opts.preBand
        lp.frequency.value = opts.postCut
    
        this.update(opts)
    }
}

Overdrive.Meta = {
    name: "Overdrive",
    params: {
        gain: {
            min: 1.0,
            max: 3.0,
            default: 2.0,
            type: "float",
            step: 0.01,
            label: "Gain",
        },
        drive: {
            min: 0.0,
            max: 1.0,
            default: 0.5,
            type: "float",
            step: 0.01,
            label: "Drive",
        },
        feedback: {
            min: 0.0,
            max: 1.0,
            default: 0.0,
            type: "float",
            step: 0.01,
            label: "Feedback",
        },
        color: {
            min: 0,
            max: 22050,
            default: 800,
            type: "integer",
            step: 1,
            label: "Color",
        },
        preBand: {
            min: 0,
            max: 1.0,
            default: 0.5,
            type: "float",
            step: 0.01,
            label: "Pre-band",
        },
        postCut: {
            min: 0,
            max: 22050,
            default: 3000,
            type: "integer",
            step: 1,
            label: "Post-cut",
            unit: 'Hz',
        },
    },
}

/**
 * Build chain with `receiver`, `prev`, `next`, `active` properties.
 * All nodes in `chain` will be disconnected and setup as inactive.
 * 
 * @param {AudioNode} input The input node.
 * @param {AudioNode} output The output node.
 * @param {AudioNode[]} chain The effects chain.
 */
 export function initChain(input, output, chain) {

    const {context} = input
    input.receiver = input
    output.receiver = output
    
    chain.forEach((node, i) => {
 
        node.disconnect()

        node.prev = chain[i - 1] || input
        node.next = chain[i + 1] || output
        const bypass = new GainNode(context)
        node.receiver = bypass
        let active = false
     
        Object.defineProperties(node, {
            active : {
                get: () => active,
                set: function(value) {
                    value = Boolean(value)
                    if (value === active) {
                        return
                    }
                    active = value
                    const {prev, next} = this
                    // Disconnect
                    if (prev) {
                        prev.receiver.disconnect(this.receiver)
                    }
                    if (next) {
                        this.receiver.disconnect(next.receiver)
                    }
                    // Change receiver
                    this.receiver = active ? this : bypass
                    // Reconnect
                    if (prev) {
                        prev.receiver.connect(this.receiver)
                    }
                    if (next) {
                        this.receiver.connect(next.receiver)
                    }
                },
            },
        })
    })
    
    // Initialize connections.
    chain.forEach(node => {
        if (node.prev) {
            node.prev.receiver.connect(node.receiver)
        }
        if (node.next) {
            node.receiver.connect(node.next.receiver)
        }
    })
}

/**
 * Make a distortion curve array.
 * 
 * From:
 *  - https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/createWaveShaper
 *  - https://stackoverflow.com/a/22313408
 *  - https://alexanderleon.medium.com/web-audio-series-part-2-designing-distortion-using-javascript-and-the-web-audio-api-446301565541
 * 
 * @param {Number} amount
 * @param {integer} samples
 * @return {Float32Array}
 */
function makeDistortionCurve(amount = 50, samples = 44100) {
    const k = Number(amount)
    const curve = new Float32Array(samples)
    const DEG = Math.PI / 180
    for (let i = 0; i < samples; i++) {
        const x = i * 2 / samples - 1
        curve[i] = (3 + k) * x * 20 * DEG / (Math.PI + k + Math.abs(x))
    }
    return curve
}

/**
 * Merge user options from param definitions.
 * 
 * @param {object[]} defs Param definitions with `default`.
 * @param {*} opts User options.
 * @return {object} Modified `opts` or new object.
 */
function optsMerge(defs, opts) {
    opts = opts || {}
    Object.entries(defs).forEach(([name, def]) => {
        opts[name] = opts[name] || def.default
    })
    return opts
}

/**
 * Make a stub object like an `AudioParam`.
 * 
 * @param {Function} vget Setter for `value` property.
 * @param {Function} vset Getter for `value` property.
 * @return {object}
 */
function paramObject(vget, vset) {
    return {
        get value() { return vget() },
        set value(value) { vset(value) },
    }
}

/**
 * Make a property definition for a stub param object.
 * 
 * @param {Function} vget Setter for `value` property.
 * @param {Function} vset Getter for `value` property.
 * @return {object}
 */
function paramProp(vget, vset) {
    return {
        enumerable: true,
        value: paramObject(vget, vset),
    }
}

/**
 * Setup `EffectsNode` wrapper origin.
 * 
 * @param {EffectsNode} node The `EffectsNode` instance.
 * @param {AudioNode} dest The `AudioNode` destination.
 */
function setOrigin(node, dest) {
    GainNode.prototype.connect.call(node, dest)
}
