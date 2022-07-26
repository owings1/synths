/**
 * WebAudio effects.
 * 
 * @author Doug Owings <doug@dougowings.net>
 * @license MIT
 * 
 * `Overdrive` class adapted from code by Nick Thompson
 * `Freeverb` class adapted from code by Anton Miselaytes
 */
import * as Music from './music.js'
import * as Utils from './utils.js'

const symState = Symbol('state')
const symSched = Symbol('sched')
const symBuffs = Symbol('buffs')
const symOutpt = Symbol('outpt')

const DEG = Math.PI / 180
const LOOKAHEAD = 25.0
const STOPDELAY = LOOKAHEAD * 10
const SOLODROP = 3
const COMB_TUNINGS = [1557, 1617, 1491, 1422, 1277, 1356, 1188, 1116]
const ALLPASS_FREQS = [225, 556, 441, 341]

const REVERB_SAMPLES = {
    1: {
        label: 'Greek 7 Echo Hall',
        url: '../samples/reverb/Greek 7 Echo Hall.wav',
    },
    2: {
        label: 'Narrow Bumpy Space',
        url: '../samples/reverb/Narrow Bumpy Space.wav',
    },
}

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
        this[symOutpt] = new GainNode(context)
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
 * Freeverb algorithmic reverb
 * 
 * Adapted from code by Anton Miselaytes
 * 
 * https://github.com/miselaytes-anton/web-audio-experiments/
 */
export class Freeverb extends EffectsNode {

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
            const node = new BiquadFilterNode(context)
            node.type = 'allpass'
            node.frequency.value = freq
            return node
        })
        input.connect(dry).connect(this[symOutpt])
        input.connect(wet).connect(splitter)
        combLeft.forEach(comb => {
            splitter.connect(comb, 0).connect(merger, 0, 0)
        })
        combRight.forEach(comb => {
            splitter.connect(comb, 1).connect(merger, 0, 1)
        })
        let node = merger
        for (let i = 0; i < passes.length; i++) {
            node = node.connect(passes[i])
        }
        node.connect(this[symOutpt])
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
            .connect(this[symOutpt])
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

/**
 * Reverb effect using Convolver from audio sample
 */
export class Reverb extends EffectsNode {
    /**
     * @param {AudioContext} context
     * @param {object} opts
     * @param {Number} opts.intensity
     */
    constructor(context, opts) {
        super(context)
        opts = optsMerge(this.meta.params, opts)
        const input = new GainNode(context)
        const wet = new GainNode(context)
        const cv = new ConvolverNode(context)
        let sample
        Object.defineProperties(this, {
            intensity: {value: wet.gain},
            sample: paramProp(() => sample, value => {
                value = Number(value)
                if (value !== sample) {
                    let {url} = REVERB_SAMPLES[value]
                    sample = value
                    loadSample(context, url).then(buf =>{
                        cv.buffer = buf
                    })
                }
            })
        })
        setOrigin(this, input)
            .connect(wet)
            .connect(cv)
            .connect(this[symOutpt])
        input.connect(this[symOutpt]) // dry
        this.update(opts)
    }
}

Reverb.Meta = {
    name: 'Reverb',
    params: {
        intensity: {
            type: "float",
            default: 0.1,
            min: 0.0,
            max: 6.0,
            step: 0.01,
        },
        sample: {
            type: 'enum',
            default: 1,
            values: Object.fromEntries(
                Object.entries(REVERB_SAMPLES).map(
                    ([key, {label}]) => [key, label]
                )
            )
        }
    },
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
        setOrigin(this, cp).connect(this[symOutpt])
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
        bq.type = 'lowpass'
        Object.defineProperties(this, {
            cutoff: {value: bq.frequency},
            quality: {value: bq.Q},
        })
        setOrigin(this, bq).connect(this[symOutpt])
        this.update(opts)
    }
}

Lowpass.Meta = {
    name: 'Lowpass',
    params: {
        gain: {
            type: "float",
            default: 1.0,
            min: 0.0,
            max: 3.0,
            step: 0.01,
        },
        cutoff: {
            type: "integer",
            default: 1000,
            min: 40,
            max: 3000,
            step: 1,
            unit: 'Hz',
        },
        quality: {
            type: "integer",
            default: 1,
            min: 0,
            max: 10,
            step: 1,
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
        bq.type = 'highpass'
        Object.defineProperties(this, {
            cutoff: {value: bq.frequency},
            quality: {value: bq.Q},
        })
        setOrigin(this, bq).connect(this[symOutpt])
        this.update(opts)
    }
}

Highpass.Meta = {
    name: 'Highpass',
    params: {
        gain: {
            type: "float",
            default: 1.0,
            min: 0.0,
            max: 3.0,
            step: 0.01,
        },
        cutoff: {
            type: "integer",
            default: 100,
            min: 40,
            max: 2000,
            step: 1,
            unit: 'Hz',
        },
        quality: {
            type: "integer",
            default: 1,
            min: 0,
            max: 10,
            step: 1,
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
            .connect(fb)
            .connect(dy)
            .connect(this[symOutpt])
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
            max: 1.0,
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
        ws.oversample = '4x'
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
            .connect(fb)
            .connect(ws)
            .connect(this[symOutpt])
        this.update(opts)
    }
}

Distortion.Meta = {
    name: "Distortion",
    params: {
        gain: {
            type: "float",
            default: 1.2,
            min: 1.0,
            max: 3.0,
            step: 0.01,
        },
        drive: {
            type: "float",
            default: 0.4,
            min: 0.0,
            max: 1.0,
            step: 0.01,
        },
        feedback: {
            type: "float",
            default: 0.0,
            min: 0.0,
            max: 1.0,
            step: 0.01,
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
        lp.connect(this[symOutpt])

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
            type: "float",
            default: 2.0,
            min: 1.0,
            max: 3.0,
            step: 0.01,
        },
        drive: {
            type: "float",
            default: 0.5,
            min: 0.0,
            max: 1.0,
            step: 0.01,
        },
        feedback: {
            type: "float",
            default: 0.0,
            min: 0.0,
            max: 1.0,
            step: 0.01,
        },
        color: {
            type: "integer",
            default: 800,
            min: 0,
            max: 22050,
            step: 1,
        },
        preBand: {
            label: "pre-band",
            type: "float",
            default: 0.5,
            min: 0,
            max: 1.0,
            step: 0.01,
        },
        postCut: {
            label: "post-cut",
            type: "integer",
            default: 3000,
            min: 0,
            max: 22050,
            step: 1,
            unit: 'Hz',
        },
    },
}

/**
 * Build a simple linear chain. Adds `receiver`, `prev`, `next`, `active`
 * properties to nodes in `chain`, and `receiver` property to input and
 * output. Setting a node's `active` property connects it's prev and next
 * to either itself, or a dummy `bypass` GainNode. 
 * 
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
 * Scale oscillator.
 */
export class ScaleSample extends EffectsNode {

    /**
     * @param {AudioContext} context
     * @param {object} opts
     * @param {Number} opts.tonality
     * @param {Number} opts.degree
     * @param {Number} opts.octave
     * @param {Number} opts.duration
     * @param {Number} opts.direction
     * @param {Boolean} opts.loop
     * @param {Boolean} opts.shuffle
     */
    constructor(context, opts = {}) {
        super(context)
        opts = optsMerge(this.meta.params, opts)
        this[symSched] = scheduleSample.bind(this)
        this[symState] = {
            /** @type {AudioContext} */
            context,
            /** @type {Number[]} */
            scale: null,
            /** @type {Number[]} */
            sample: null,
            /** @type {AudioParam} */
            param: null,
            /** @type {OscillatorNode} */
            osc: null,
            playing: false,
            nextTime: null,
            stopId: null,
            scheduleId: null,
            noteDur: null,
            sampleDur: null,
            loop: false,
            shuffle: 0,
            shuffler: Utils.noop,
            counter: 0,
        }
        const prox = Object.create(null)
        const pentries = Object.entries(this.meta.params).map(([name, {type}]) => {
            const cast = type === 'boolean' ? Boolean : Number
            const getter = () => prox[name]
            const setter = value => {
                value = cast(value)
                if (value !== prox[name]) {
                    prox[name] = value
                    if (this[symState].playing) {
                        buildScaleSample.call(this)
                    }
                }
            }
            return [name, paramProp(getter, setter)]
        })
        Object.defineProperties(this, Object.fromEntries(pentries))
        this.update(opts)
    }

    /** @type {Boolean} */
    get playing() {
        return this[symState].playing
    }

    /**
     * Stop playing
     */
    stop() {
        const state = this[symState]
        if (!state.playing) {
            return
        }
        state.playing = false
        state.osc.disconnect()
        state.osc.stop()
        state.osc = null
        state.param = null
        state.nextTime = null
        this[symOutpt].gain.cancelScheduledValues(state.nextTime)
        this[symOutpt].gain.value = 0
        clearTimeout(state.stopId)
        clearTimeout(state.scheduleId)
    }

    /**
     * Start/restart playing
     */
    play() {
        this.stop()
        buildScaleSample.call(this)
        const state = this[symState]
        state.playing = true
        state.osc = new OscillatorNode(state.context)
        state.param = state.osc.frequency
        this[symSched]()
        this[symOutpt].gain.value = 1
        state.osc.connect(this[symOutpt])
        state.osc.start()
    }
}

/**
 * @private
 */
function buildScaleSample() {
    const state = this[symState]
    state.scale = Music.scaleSample(this.degree.value, {
        octave: this.octave.value,
        tonality: this.tonality.value,
        direction: this.direction.value,
        octaves: this.octaves.value,
        clip: true,
    })
    if (this.loop.value && this.direction.value & Music.MULTIDIR_FLAG) {
        state.scale.pop()
    }
    state.sample = state.scale.slice(0)
    state.noteDur = 30 / this.bpm.value
    state.sampleDur = state.sample.length * state.noteDur
    state.loop = this.loop.value
    state.counter = 0
    state.shuffle = this.shuffle.value
    if (this.shuffle.value) {
        if (this.solo.value) {
            state.shuffler = soloShuffle
        } else {
            state.shuffler = Utils.shuffle
        }
    } else {
        state.shuffler = Utils.noop
    }
    if (!state.nextTime) {
        // hot rebuild
        state.nextTime = state.context.currentTime
    }
}

/**
 * @private
 */
function scheduleSample() {
    const state = this[symState]
    while (state.context.currentTime + state.sampleDur > state.nextTime) {
        if (state.shuffle && state.counter % state.shuffle === 0) {
            state.sample = state.scale.slice(0)
            state.shuffler(state.sample)
        }
        state.sample.forEach(freq => {
            if (freq) {
                state.param.setValueAtTime(freq, state.nextTime)
            }
            state.nextTime += state.noteDur
        })
        state.counter += 1
        if (!state.loop) {
            break
        }
    }
    if (state.loop) {
        state.scheduleId = setTimeout(this[symSched], LOOKAHEAD)
        return
    }
    // smooth(ish) shutoff
    this[symOutpt].gain.setValueAtTime(0.0, state.nextTime)
    const doneTime = state.nextTime - state.context.currentTime
    const stopTimeout = doneTime * 1000 + STOPDELAY
    state.stopId = setTimeout(() => this.stop(), stopTimeout)
}

/**
 * @param {Array} arr
 * @return {Array}
 */
function soloShuffle(arr) {
    // fill with either null (i.e. no freq change), or a random freq from arr.
    let fill = null
    if (Math.random() > 0.5) {
        fill = Utils.randomElement(arr)
    }
    Utils.shuffle(arr)
    for (let i = 1; i < arr.length; i += SOLODROP) {
        arr[i] = fill
    }
    Utils.shuffle(arr)
    return arr
}

ScaleSample.prototype.start = ScaleSample.prototype.play

ScaleSample.Meta = {
    name: 'ScaleSample',
    title: 'Scale Sample',
    params: {
        tonality: {
            type: 'enum',
            default: Music.Tonality.MAJOR,
            values: Utils.flip(Music.Tonality),
        },
        degree: {
            type: 'enum',
            default: 0,
            values: Music.DegLabels,
        },
        direction: {
            type: 'enum',
            default: Music.Dir.ASCEND,
            values: Utils.flip(Music.Dir),
        },
        loop: {
            type: 'boolean',
            default: false,
        },
        bpm: {
            type: 'integer',
            default: 60,
            min: 30,
            max: 300,
            step: 1,
        },
        octave: {
            type: 'integer',
            default: 4,
            min: 1,
            max: Music.OCTAVE_COUNT - 2,
            step: 1,
        },
        octaves: {
            type: 'integer',
            default: 1,
            min: 1,
            max: Music.OCTAVE_COUNT - 2,
            step: 1,
        },
        shuffle: {
            type: 'integer',
            default: 0,
            min: 0,
            max: 48,
            step: 1,
        },
        solo: {
            type: 'boolean',
            default: false,
        }
    },
    actions: {
        play : {
            method: 'play',
        },
        stop: {
            method: 'stop',
        }
    }
}

/**
 * Load audio sample
 * 
 * @param {AudioContext} context
 * @param {String} path
 * @return {Promise<AudioBuffer>}
 */
 async function loadSample(context, path) {
    const url = new URL(path, import.meta.url).href
    if (!context[symBuffs]) {
        context[symBuffs] = Object.create(null)
    }
    const buffs = context[symBuffs]
    if (!buffs[url]) {
        const res = await fetch(url)
        const buf = await res.arrayBuffer()
        buffs[url] = await context.decodeAudioData(buf)
    }
    return buffs[url]
}

/**
 * Make a distortion curve array
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
function makeDistortionCurve(amount = 50, samples = 512) {
    const k = Number(amount)
    const curve = new Float32Array(samples)
    for (let i = 0; i < samples; i++) {
        const x = i * 2 / samples - 1
        curve[i] = (3 + k) * x * 20 * DEG / (Math.PI + k + Math.abs(x))
    }
    return curve
}

/**
 * Merge user options from param definitions
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

/**
 * Make a property definition for a stub param object
 * 
 * @param {Function} vget Setter for `value` property
 * @param {Function} vset Getter for `value` property
 * @return {object}
 */
function paramProp(vget, vset) {
    return {
        enumerable: true,
        value: paramObject(vget, vset),
    }
}

/**
 * Setup `EffectsNode` wrapper origin
 * 
 * @param {EffectsNode} node The `EffectsNode` instance
 * @param {AudioNode} dest The `AudioNode` destination
 * @return {AudioNode} The destination
 */
function setOrigin(node, dest) {
    return GainNode.prototype.connect.call(node, dest)
}

/**
 * Make a stub AudioParam object that sets all param values, and
 * delegates prototype method to all params
 * 
 * @param {AudioParam[]} params
 * @return {object}
 */
function fusedParam(params) {
    const leader = params[0]
    const methods = Object.getOwnPropertyNames(AudioParam.prototype)
        .filter(prop => typeof leader[prop] === 'function')
    const vget = () => leader.value
    const vset = value => params.forEach(param => param.value = value)
    const fused = paramObject(vget, vset)
    methods.forEach(method => {
        const func = leader[method]
        fused[method] = (...args) => {
            params.forEach(param => func.apply(param, args))
        }
    })
    return fused
}
