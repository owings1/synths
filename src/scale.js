/**
 * WebAudio effects.
 * 
 * @author Doug Owings <doug@dougowings.net>
 * @license MIT
 */
import {BaseNode, paramProp} from './core.js'
import {flip, range, shuffle} from './utils.js'
import * as Music from './music.js'
import Shuffler from './shuffler.js'
import './tone.js'

const symState = Symbol()
const symSched = Symbol()

const Lookahead = 25.0
const StopDelay = Lookahead * 10
const Shufflers = {
    NONE: 0,
    RANDY: 1,
    TONAK: 2,
    SOFA: 3,
    BIMOM: 4,
}

/**
 * Scale oscillator.
 */
export default class ScaleSample extends BaseNode {

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
        opts = BaseNode.mergeOpts(this.meta.params, opts)
        this.instrument = opts.instrument
        this[symSched] = schedule.bind(this)
        this[symState] = new SampleState
        this.oscillator = new OscillatorNode(this.context, {frequency: 0})
        this.oscillator.connect(this.output)
        this.oscillator.start()
        const prox = Object.create(null)
        const pentries = Object.entries(this.meta.params).map(([name, {type}]) => {
            const cast = type === 'boolean' ? Boolean : Number
            const getter = () => prox[name]
            const setter = value => {
                value = cast(value)
                if (value !== prox[name]) {
                    prox[name] = value
                    if (this.playing) {
                        build.call(this)
                        clearTimeout(this[symState].stopId)
                        if (name === 'loop' && value) {
                            this[symSched]()
                        }
                    }
                }
            }
            return [name, paramProp(getter, setter)]
        })
        Object.defineProperties(this, Object.fromEntries(pentries))
        this.update(opts)
    }

    /**
     * @param {AudioNode} dest
     */
    connect(dest) {
        if (isInstrument(dest)) {
            if (this.instrument) {
                throw new Error('Already connected to an instrument')
            }
            this.instrument = dest
            return dest
        }
        return super.connect(dest)
    }

    disconnect(...args) {
        if (this.instrument && isInstrument(args[0])) {
            this.instrument = null
        } else {
            this.output.disconnect(...args)
            if (!args.length) {
                this.instrument = null
            }
        }
    }

    /** @type {Boolean} */
    get playing() {
        return this[symState].playing
    }

    /**
     * Stop playing
     */
    stop() {
        if (!this.playing) {
            return
        }
        const state = this[symState]
        state.playing = false
        state.nextTime = null
        this.oscillator.frequency.cancelScheduledValues(null)
        this.oscillator.frequency.value = 0
        clearTimeout(state.stopId)
        clearTimeout(state.scheduleId)
    }

    /**
     * Start/restart playing
     */
    play() {
        this.stop()
        build.call(this)
        const state = this[symState]
        state.playing = true
        this[symSched]()
    }
}

ScaleSample.prototype.start = ScaleSample.prototype.play

export {ScaleSample}

ScaleSample.Meta = {
    name: 'ScaleSample',
    title: 'Scale Sample',
    params: {
        tonality: {
            type: 'enum',
            default: Music.Tonality.MAJOR,
            values: flip(Music.Tonality),
        },
        degree: {
            type: 'enum',
            default: 0,
            values: Object.fromEntries(
                Object.entries(
                    ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
                )
            ),
        },
        direction: {
            type: 'enum',
            default: Music.Dir.ASCEND,
            values: flip(Music.Dir),
        },
        loop: {
            type: 'boolean',
            default: false,
        },
        beat: {
            type: 'enum',
            default: 30,
            values: {
                15: '1/16',
                30: '1/8',
                60: '1/4',
                120: '1/2',
            }
        },
        bpm: {
            type: 'integer',
            default: 60,
            min: 30,
            max: 240,
            step: 1,
            ticks: range(30, 300, 30)
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
            default: Shufflers.RANDY,
            values: flip(Shufflers),
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


const SHUFFLERS = Object.fromEntries(Object.entries({
    NONE: arr => arr,
    RANDY: shuffle,
    TONAK: new Shuffler({
        fill: {
            chance: 0.3,
            chances: {
                0: 0.5,
                random: 0.6,
                null: 1,
            }
        },
        start: {
            chances: {
                0: 0.55,
            }
        }
    }),
    SOFA: new Shuffler({
        fill: {
            chance: 0.35,
            chances: {
                random: 0.8,
                null: 1,
            }
        },
        start: {
            chances: {
                0: 0.5,
            }
        }
    }),
    BIMOM: new Shuffler({
        shuffle: arr => {
            const mid = Math.floor(arr.length / 2)
            shuffle(arr, 0, mid)
            return shuffle(arr, mid)
        },
        fill: {
            chance: 0.05,
            chances: {
                0: 0.4,
                null: 1
            }
        },
        start: {
            chances: {
                0: 0.25,
            }
        },
        end: {
            chances: {
                1: 0.25,
                '-1': 0.25,
            }
        }
    })

}).map(([key, value]) => [Shufflers[key], value]))


/**
 * Build sample and update state
 * 
 * @private
 */
function build() {
    const state = this[symState]
    state.opts = {
        octave: this.octave.value,
        tonality: this.tonality.value,
        direction: this.direction.value,
        octaves: this.octaves.value,
        clip: true,
    }
    state.scale = Music.scaleSample(this.degree.value, state.opts)
    if (this.loop.value && this.direction.value & Music.MULTIDIR_FLAG) {
        state.scale.pop()
    }
    state.sample = state.scale
    state.noteDur = this.beat.value / this.bpm.value
    state.loop = this.loop.value
    state.counter = 0
    state.shuffle = this.shuffle.value
    if (this.shuffle.value) {
        state.shuffler = SHUFFLERS[this.shuffler.value]
    } else {
        state.shuffler = SHUFFLERS[Shufflers.NONE]
    }
    if (!state.nextTime) {
        // hot rebuild
        state.nextTime = this.context.currentTime
    }
}

/**
 * Self-rescheduling scheduler
 * 
 * @private
 */
function schedule() {
    /** @type {SampleState} */
    const state = this[symState]
    clearTimeout(state.scheduleId)
    while (this.context.currentTime + state.sampleDur > state.nextTime) {
        state.shuffleIfNeeded()
        state.sample.forEach(freq => {
            play.call(this, freq, state.noteDur, state.nextTime)
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
    this.oscillator.frequency.setValueAtTime(0, state.nextTime)
    const doneTime = state.nextTime - this.context.currentTime
    const stopTimeout = doneTime * 1000 + StopDelay
    state.stopId = setTimeout(() => this.stop(), stopTimeout)
}

/**
 * Schedule a note to be played
 * 
 * @private
 * @param {Number} freq
 * @param {Number} dur
 * @param {Number} time
 */
function play(freq, dur, time) {
    if (freq === undefined || freq === null) {
        return
    }
    if (this.instrument) {
        this.instrument.triggerAttackRelease(freq, dur, time)
    }
    this.oscillator.frequency.setValueAtTime(freq, time)
}

class SampleState {

    get sampleDur() {
        return this.noteDur * this.sample.length
    }

    shuffleIfNeeded() {
        if (this.shuffle && this.counter % this.shuffle === 0) {
            this.sample = this.scale.slice(0)
            this.shuffler(this.sample)
            return true
        }
        return false
    }

}
/**
 * @param {object} obj
 * @return {Boolean}
 */
function isInstrument(obj) {
    return typeof obj.triggerAttackRelease === 'function'
}