/**
 * WebAudio effects.
 * 
 * @author Doug Owings <doug@dougowings.net>
 * @license MIT
 */
import {BaseNode, paramProp} from './core.js'
import {flip, range} from './utils.js'
import * as Music from './music.js'
import {shuffle, Shuffler} from './shuffler.js'
import '../lib/tone.js'

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
    JARD: 5,
    CHUNE: 6,
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
        this[symState] = new State
        this.oscillator = new OscillatorNode(this.context, {frequency: 0})
        this.oscillator.connect(this.output)
        this.oscillator.start()
        const prox = Object.create(null)
        const props = Object.entries(params).map(([name, {type}]) => {
            const cast = type === 'boolean' ? Boolean : Number
            const getter = () => prox[name]
            const setter = value => {
                value = cast(value)
                if (value !== prox[name]) {
                    prox[name] = value
                    afterSet(this, name, value)
                }
            }
            return [name, paramProp(getter, setter)]
        })
        Object.defineProperties(this, Object.fromEntries(props))
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
            const i = this.instruments.indexOf(args[0])
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
        build(this)
        this[symState].playing = true
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
                20: '1/12',
                30: '1/8',
                45: '1/6',
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

function halfShuffle(arr) {
    shuffle(arr, {limit: Math.floor(arr.length / 2)})
}

const SHUFFLERS = Object.fromEntries(Object.entries({
    // No shuffle.
    NONE: () => {},
    // Completely random.
    RANDY: shuffle,
    // Heavy on the first note.
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
    // A lot of ties.
    SOFA: new Shuffler({
        shuffle: halfShuffle,
        fill: {
            chance: 0.45,
            chances: {
                random: 0.15,
                '//c' : 0.30,
                '/c2' : 0.31,
                null: 1,
            }
        },
        start: {
            chances: {
                0: 0.2,
            }
        }
    }),
    // Very few fills.
    BIMOM: new Shuffler({
        shuffle: halfShuffle,
        fill: {
            chance: 0.05,
            chances: {
                0: 0.1,
                '/c2' : 0.2,
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
                1: 0.1,
                '-1': 0.25,
            }
        }
    }),
    // Lightly shuffle - keep a lot of runs.
    JARD: new Shuffler({
        shuffle: arr => {
            // Shuffle the 2nd-5th notes
            shuffle(arr, {start: 1, end: 4})
            // Shuffle 25% of the upper half of the notes
            const start = Math.floor(arr.length / 2)
            const limit = Math.max(3, Math.floor(arr.length / 4))
            shuffle(arr, {limit, start})
        },
        fill: {
            chance: 0.15,
            chances: {
                random: 0.15,
                '//c' : 0.30,
                '/c2' : 0.31,
                null: 1,
            }
        }
    }),
    // Alternate select other shufflers deterministically.
    CHUNE: arr => {
        const {counter} = arr.state
        let shufflerId = Shufflers.SOFA
        if (counter > 0) {
            if (counter % 13 === 0) {
                shufflerId = Shufflers.BIMOM
            } else if (counter % 8 === 0) {
                shufflerId = Shufflers.JARD
            } else if (counter % 5 === 0) {
                shufflerId = Shufflers.TONAK
            }
        }
        SHUFFLERS[shufflerId](arr)
    }
}).map(([key, value]) => [Shufflers[key], value]))


/**
 * @param {ScaleSample} node
 * @param {String} name
 * @param {Number|Boolean} value
 */
function afterSet(node, name, value) {
    if (!node.playing) {
        return
    }
    if (SCALE_OPTHASH[name] === true) {
        build(node)
    } else {
        updateState(node)
    }
    clearTimeout(node[symState].stopId)
    switch (name) {
        case 'shuffler':
            node[symState].counter = 0
            break
        case 'loop':
            if (value) {
                node[symSched]()
            }
            break
    }
}

/**
 * Build sample and update state from node
 * 
 * @param {ScaleSample} node
 */
function build(node) {
    const state = node[symState]
    state.sampleOpts = Object.fromEntries(SCALE_OPTKEYS.map(key => [key, node[key].value]))
    state.sampleOpts.clip = true
    state.scale = Music.scaleSample(node.degree.value, state.sampleOpts)
    if (node.loop.value && node.direction.value & Music.Dir.isMulti(node.direction.value)) {
        state.scale.pop()
    }
    state.sample = state.scale
    state.counter = 0
    updateState(node)
}

/**
 * Update state from node params
 * 
 * @param {ScaleSample} node
 */
function updateState(node) {
    const state = node[symState]
    state.beat = node.beat.value
    state.bpm = node.bpm.value
    state.loop = node.loop.value
    state.shuffle = node.shuffle.value
    if (node.shuffle.value) {
        state.shuffler = SHUFFLERS[node.shuffler.value]
    } else {
        state.shuffler = SHUFFLERS[Shufflers.NONE]
    }
    if (!state.nextTime) {
        // hot rebuild
        state.nextTime = node.context.currentTime
    }
}

/**
 * Self-rescheduling scheduler
 * 
 * @private
 */
function schedule() {
    /** @type {State} */
    const state = this[symState]
    clearTimeout(state.scheduleId)
    while (this.context.currentTime + state.sampleDur > state.nextTime) {
        state.shuffleIfNeeded()
        state.sample.forEach(freq => {
            play(this, freq, state.noteDur, state.nextTime)
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
 * @param {ScaleSample} node
 * @param {Number} freq
 * @param {Number} dur
 * @param {Number} time
 */
function play(node, freq, dur, time) {
    if (freq === undefined) {
        return
    }
    const state = node[symState]
    if (freq === null) {
        freq = state.lastFreq
    }
    if (freq === null) {
        return
    }
    state.lastFreq = freq
    node.instruments.forEach(inst => {
        inst.triggerAttackRelease(freq, dur, time)
    })
    node.oscillator.frequency.setValueAtTime(freq, time)
}

class State {

    constructor() {
        this.counter = 0
        this.lastFreq = null
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
            this.sample.state = this
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
