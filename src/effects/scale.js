import {
    symOutpt,
    EffectsNode,
    optsMerge,
    paramProp,
} from './core.js'
import * as Music from '../music.js'
import * as Utils from '../utils.js'
import Shuffler from '../shuffler.js'

const symState = Symbol()
const symSched = Symbol()

const Lookahead = 25.0
const StopDelay = Lookahead * 10
const Shufflers = {
    SIMPLE: 1,
    SOLO: 2,
}
const soloShuffle = Shuffler({
    fill: {
        // How often a note is replaced.
        replace: 3,
        probabilities: {
            // Probability of filling with tonic
            tonic: 0.3,
            // Probability of filling with random note
            random: 0.5,
            // Probability of filling with null (prev note)
            none: Infinity,
        }
    },
    start: {
        probabilities: {
            tonic: 0.6,
        }
    }
})
/**
 * Scale oscillator.
 */
export default class ScaleSample extends EffectsNode {

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
        switch (this.shuffler.value) {
            case Shufflers.SOLO:
                state.shuffler = soloShuffle
                break
            case Shufflers.SIMPLE:
                state.shuffler = Utils.shuffle
                break
            default:
                state.shuffler = Utils.noop
                break
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
        state.scheduleId = setTimeout(this[symSched], Lookahead)
        return
    }
    // smooth(ish) shutoff
    this[symOutpt].gain.setValueAtTime(0.0, state.nextTime)
    const doneTime = state.nextTime - state.context.currentTime
    const stopTimeout = doneTime * 1000 + StopDelay
    state.stopId = setTimeout(() => this.stop(), stopTimeout)
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
            ticks: Utils.range(30, 300, 30)
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
        shuffler: {
            type: 'enum',
            default: Shufflers.SIMPLE,
            values: Utils.flip(Shufflers),
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

export {ScaleSample}