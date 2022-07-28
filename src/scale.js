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

const SCALE_OPTHASH = {
    degree: true,
    octave: true,
    tonality: true,
    direction: true,
    octaves: true,
    arpeggio: true,
}
const SCALE_OPTKEYS = Object.keys(SCALE_OPTHASH)

/**
 * Scale oscillator.
 */
export default class ScaleSample extends BaseNode {

    /**
     * @param {AudioContext} context
     * @param {object} opts
     */
    constructor(context, opts = {}) {
        super(context)
        const {params} = this.meta
        opts = BaseNode.mergeOpts(params, opts)
        this.instruments = []
        this[symSched] = schedule.bind(this)
        this[symState] = new SampleState
        this.oscillator = new OscillatorNode(this.context, {frequency: 0})
        this.oscillator.connect(this.output)
        this.oscillator.start()
        const prox = Object.create(null)
        const pentries = Object.entries(params).map(([name, {type}]) => {
            const cast = type === 'boolean' ? Boolean : Number
            const getter = () => prox[name]
            const setter = value => {
                value = cast(value)
                if (value !== prox[name]) {
                    prox[name] = value
                    if (this.playing) {
                        if (SCALE_OPTHASH[name] === true) {
                            build.call(this)
                        } else {
                            updateState.call(this)
                        }
                        if (name === 'shuffler') {
                            this[symState].counter = 0
                        }
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

    connect(dest) {
        if (isInstrument(dest)) {
            if (this.instruments.includes(dest)) {
                throw new Error('Already connected to that instrument')
            }
            this.instruments.push(dest)
            return dest
        }
        return super.connect(dest)
    }

    disconnect(...args) {
        if (this.instruments.length && isInstrument(args[0])) {
            let i = this.instruments.indexOf(args[0])
            if (i < 0) {
                throw new Error('Not connected to that instrument')
            }
            this.instruments.splice(i, 1)
        } else {
            this.output.disconnect(...args)
            if (!args.length) {
                this.instruments.splice(0)
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
        arpeggio: {
            type: 'boolean',
            default: false,
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
            default: 1,
            min: 0,
            max: 24,
            step: 1,
        },
        shuffler: {
            type: 'enum',
            default: Shufflers.NONE,
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
            chance: 0.5,//0.35,
            chances: {
                2: 0.25,
                random: 0.4,//0.8,
                null: 1,
            }
        },
        start: {
            chances: {
                0: 0.2,
            }
        }
    }),
    BIMOM: new Shuffler({
        shuffle: arr => {
            const mid = Math.floor(arr.length / 2)
            shuffle(arr, 0, mid)
            shuffle(arr, mid)
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
    }),

}).map(([key, value]) => [Shufflers[key], value]))


/**
 * Build sample and update state
 * 
 * @private
 */
function build() {
    const state = this[symState]
    state.scaleOpts = Object.fromEntries(SCALE_OPTKEYS.map(key => [key, this[key].value]))
    state.scaleOpts.clip = true
    state.scale = Music.scaleSample(this.degree.value, state.scaleOpts)
    if (this.loop.value && this.direction.value & Music.Dir.isMulti(this.direction.value)) {
        state.scale.pop()
    }
    state.sample = state.scale
    updateState.call(this)
}

function updateState() {
    const state = this[symState]
    state.beat = this.beat.value
    state.bpm = this.bpm.value
    state.loop = this.loop.value
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
    this.instruments.forEach(inst => {
        inst.triggerAttackRelease(freq, dur, time)
    })
    this.oscillator.frequency.setValueAtTime(freq, time)
}

class SampleState {

    constructor() {
        this.counter = 0
    }

    get noteDur() {
        return this.beat / this.bpm
    }

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
 * @param {*} obj
 * @return {Boolean}
 */
function isInstrument(obj) {
    return obj && typeof obj.triggerAttackRelease === 'function'
}