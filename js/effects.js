/**
 * WebAudio effects.
 * 
 * @author Doug Owings <doug@dougowings.net>
 */

/**
 * Compressor.
 */
export class Compressor extends DynamicsCompressorNode {
    /**
     * @param {AudioContext} context
     * @param {object} opts
     */
    constructor(context, opts) {
        super(context, opts)
    }
    get meta() { return this.constructor.Meta }
}

Compressor.Meta = {
    name: 'Compressor',
    params: {
        // TODO
    },
}

/**
 * Basic lowpass filter
 */
export class Lowpass extends BiquadFilterNode {
    /**
     * @param {AudioContext} context
     * @param {object} opts
     */
    constructor(context, opts) {
        super(context, opts)
        this.type = 'lowpass'
    }
    get meta() { return this.constructor.Meta }
}

Lowpass.Meta = {
    name: 'Lowpass',
    params: {
        // TODO
    },
}

/**
 * Basic highpass filter.
 */
export class Highpass extends BiquadFilterNode {
    /**
     * @param {AudioContext} context
     * @param {object} opts
     */
    constructor(context, opts) {
        super(context, opts)
        this.type = 'highpass'
    }
    get meta() { return this.constructor.Meta }
}

Highpass.Meta = {
    name: 'Highpass',
    params: {
        // TODO
    },
}

/**
 * Delay with feedback.
 */
export class Delay extends GainNode {

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
            feedback: {value: fb.gain},
            delayTime: {value: dy.delayTime},
        })

        this.output = new GainNode(context)

        super.connect(dy)
        dy.connect(fb)
        fb.connect(dy)
        dy.connect(this.output)

        this.gain.value = opts.gain
        this.feedback.value = opts.feedback
        this.delayTime.value = opts.delayTime
    }

    /** @param {AudioNode} dest */
    connect(dest) { return this.output.connect(dest) }
    disconnect(...args) { this.output.disconnect(...args)}
    get meta() { return this.constructor.Meta }
}

Delay.Meta = {
    name: 'Delay',
    params: {
        gain: {
            min: 0.0,
            max: 3.0,
            default: 1.0,
            type: "float",
        },
        feedback: {
            min: 0.0,
            max: 1.0,
            default: 0.5,
            type: "float",
        },
        delayTime: {
            min: 0.0,
            max: 1.0,
            default: 0.5,
            type: "float",
        },
    }
}

/**
 * Basic distortion effect.
 */
export class Distortion extends GainNode {

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

        let drive

        Object.defineProperties(this, {
            drive: paramProp(() => drive, value => {
                drive = Number(value)
                ws.curve = makeDistortionCurve(drive * 1000)
            }),
        })

        this.output = new GainNode(context)

        super.connect(ws)
        ws.connect(this.output)
        
        ws.oversample = '4x'

        this.drive.value = opts.drive
        this.gain.value = opts.gain
    }

    /** @param {AudioNode} dest */
    connect(dest) { return this.output.connect(dest) }
    disconnect(...args) { this.output.disconnect(...args)}
    get meta() { return this.constructor.Meta }
}

Distortion.Meta = {
    name: "Distortion",
    params: {
        gain: {
            min: 1.0,
            max: 3.0,
            default: 1.2,
            type: "float",
        },
        drive: {
            min: 0.0,
            max: 1.0,
            default: 0.4,
            type: "float",
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
export class Overdrive extends GainNode {

    /**
     * @param {AudioContext} context
     * @param {object} opts
     * @param {Number} opts.preBand
     * @param {Number} opts.color
     * @param {Number} opts.drive
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

        let drive

        Object.defineProperties(this, {
            color: paramProp(() => bp.frequency.value, value => {
                bp.frequency.setValueAtTime(value, 0)
            }),
            preBand: paramProp(() => bpWet.gain.value, value => {
                value = Number(value)
                bpWet.gain.setValueAtTime(value, 0)
                bpDry.gain.setValueAtTime(1 - value, 0)
            }),
            drive: paramProp(() => drive, value => {
                drive = Number(value)
                ws.curve = makeDistortionCurve(drive * 100, 22050)
            }),
            postCut: paramProp(() => lp.frequency.value, value => {
                lp.frequency.setValueAtTime(value, 0)
            }),
        })

        this.output = new GainNode(context)
      
        super.connect(bp)
        bp.connect(bpWet)
        bp.connect(bpDry)
        bpWet.connect(ws)
        bpDry.connect(ws)
        ws.connect(lp)
        lp.connect(this.output)

        bp.frequency.value = opts.color
        bpWet.gain.value = opts.preBand
        bpDry.gain.value = 1 - opts.preBand
        lp.frequency.value = opts.postCut
    
        this.gain.value = opts.gain
        this.drive.value = opts.drive
    }

    /** @param {AudioNode} dest */
    connect(dest) { return this.output.connect(dest) }
    disconnect(...args) { this.output.disconnect(...args)}
    get meta() { return this.constructor.Meta }
}

Overdrive.Meta = {
    name: "Overdrive",
    params: {
        gain: {
            min: 1.0,
            max: 3.0,
            default: 2.0,
            type: "float",
        },
        preBand: {
            min: 0,
            max: 1.0,
            default: 0.5,
            type: "float",
        },
        color: {
            min: 0,
            max: 22050,
            default: 800,
            type: "float",
        },
        drive: {
            min: 0.0,
            max: 1.0,
            default: 0.5,
            type: "float",
        },
        postCut: {
            min: 0,
            max: 22050,
            default: 3000,
            type: "float",
        },
    },
}

/**
 * Build chain with `receiver`, `prev`, `next`, `active` properties.
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
 
        node.prev = chain[i - 1] || input
        node.next = chain[i + 1] || output
        node.bypass = node.receiver = new GainNode(context)
        let active = false
     
        Object.defineProperty(node, 'active', {
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
                this.receiver = active ? this : this.bypass
                // Reconnect
                if (prev) {
                    prev.receiver.connect(this.receiver)
                }
                if (next) {
                    this.receiver.connect(next.receiver)
                }
            },
        })
    })
    
    // Initialize FX connections.
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
 * @param {Number} amount
 * @param {integer} n
 * @return {Float32Array}
 */
export function makeDistortionCurve(amount = 50, n = 44100) {
    const k = Number(amount)
    const curve = new Float32Array(n)
    const DEG = Math.PI / 180
    for (let i = 0; i < n; i++) {
        const x = i * 2 / n - 1
        curve[i] = (3 + k) * x * 20 * DEG / (Math.PI + k + Math.abs(x))
    }
    return curve
}

/**
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
