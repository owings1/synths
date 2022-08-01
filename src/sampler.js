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
const symChune = Symbol()

const Lookahead = 25.0
const StopDelay = Lookahead * 10
export const Shufflers = Object.freeze({
    NONE: 0,
    RANDY: 1,
    TONAK: 2,
    SOFA: 3,
    BIMOM: 4,
    JARD: 5,
    CHUNE: 6,
})

const REBUILD_OPTHASH = {
    degree: true,
    octave: true,
    tonality: true,
    direction: true,
    octaves: true,
    arpeggio: true,
}
const REBUILD_OPTKEYS = Object.keys(REBUILD_OPTHASH)

/**
 * Scale oscillator and instrument player.
 */
export default class Sampler extends BaseNode {

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
     * Build sample and update state from node
     * @return {this}
     */
    build() {
        const state = this[symState]
        state.sampleOpts = Object.fromEntries(REBUILD_OPTKEYS.map(key => [key, this[key].value]))
        state.sampleOpts.clip = true
        state.scale = Music.scaleSample(this.degree.value, state.sampleOpts)
        if (this.loop.value && this.direction.value & Music.Dir.isMulti(this.direction.value)) {
            state.scale.pop()
        }
        state.sample = state.scale.copy()
        padSample(state.sample, this.minSize.value)
        state.sample.state = state
        state.counter = 0
        updateState(this)
        return this
    }

    /**
     * Get a copy of the sample, building if necessary
     * @return {Music.ScaleNote[]}
     */
    getSample() {
        const state = this[symState]
        if (!state.sample) {
            this.build()
        }
        // copy
        const sample = state.sample.copy()
        padSample(sample, this.minSize.value)
        return sample
    }

    /**
     * Stop playing
     * @return {this}
     */
    stop() {
        if (!this.playing) {
            return this
        }
        const state = this[symState]
        state.playing = false
        state.nextTime = null
        this.oscillator.frequency.cancelScheduledValues(null)
        this.oscillator.frequency.value = 0
        clearTimeout(state.stopId)
        clearTimeout(state.scheduleId)
        return this
    }

    /**
     * Start/restart playing
     * @return {this}
     */
    play() {
        this.stop()
        const state = this[symState]
        state.lastNote = null
        this.build()
        state.playing = true
        if (!state.isOscillatorStarted) {
            state.isOscillatorStarted = true
            this.oscillator.start()
        }
        this[symSched]()
        return this
    }

    /**
     * Call the configured shuffler on the current sample
     * @return {this}
     */
    doShuffle() {
        const state = this[symState]
        if (!state.sample) {
            return
        }
        state.sample = state.scale.copy()
        padSample(state.sample, this.minSize.value)
        state.sample.state = state
        SHUFFLERS[this.shuffler.value](state.sample)
        return this
    }

    /**
     * Overridable callback
     * @param {Music.ScaleNote[]} sample
     * @param {number} time
     */
    onschedule(sample, time) {}
}

Sampler.prototype.start = Sampler.prototype.play

export {Sampler}

Sampler.Meta = {
    name: 'Sampler',
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
                    ['C','Db','D','Eb','E','F','F#','G','Ab','A','Bb','B']
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
                // 20: '1/12',
                30: '1/8',
                // 45: '1/6',
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
        minSize: {
            type: 'integer',
            default: 0,
            min: 0,
            max: 48,
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
        },
        rests: {
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
                '/c2' : 0.41,
                '//3' : 0.6,
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
        let counter
        // Don't fail if state is missing
        if (arr.state && typeof arr.state.counter === 'number') {
            counter = arr.state.counter
        } else {
            counter = arr[symChune] = arr[symChune] || 0
            arr[symChune] += 1
        }
        let id = Shufflers.SOFA
        if (counter > 0) {
            if (counter % 13 === 0) {
                id = Shufflers.BIMOM
            } else if (counter % 8 === 0) {
                id = Shufflers.JARD
            } else if (counter % 5 === 0) {
                id = Shufflers.TONAK
            }
        }
        SHUFFLERS[id](arr)
    }
}).map(([key, value]) => [Shufflers[key], value]))


/**
 * @param {Sampler} node
 * @param {String} name
 * @param {Number|Boolean} value
 */
function afterSet(node, name, value) {
    if (!node.playing) {
        return
    }
    if (REBUILD_OPTHASH[name] === true) {
        node.build()
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

function padSample(sample, minSize) {
    while (sample.length < minSize) {
        sample.push(...sample.slice(0, minSize - sample.length))
    }
}

/**
 * Update state from node params
 * 
 * @param {Sampler} node
 */
function updateState(node) {
    const state = node[symState]
    state.beat = node.beat.value
    state.bpm = node.bpm.value
    state.loop = node.loop.value
    state.shuffle = node.shuffle.value
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
    let firstScheduleTime = null
    while (this.context.currentTime + state.sampleDur > state.nextTime) {
        if (!firstScheduleTime) {
            firstScheduleTime = state.nextTime
        }
        if (state.isShuffleWanted) {
            this.doShuffle()
        }
        state.sample.forEach(note => {
            playNote(this, note, state.noteDur, state.nextTime)
            state.nextTime += state.noteDur
        })
        state.counter += 1
        if (!state.loop) {
            break
        }
    }
    if (firstScheduleTime) {
        this.onschedule(state.sample, firstScheduleTime)
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
 * @param {Sampler} node
 * @param {Music.Note|null|undefined} note
 * @param {Number} dur
 * @param {Number} time
 */
function playNote(node, note, dur, time) {
    const isRest = node.rests.value
    const state = node[symState]
    if (note === null && !isRest) {
        note = state.lastNote
    }
    if (!note) {
        if (isRest) {
            node.oscillator.frequency.setValueAtTime(0, time)
        }
        return
    }
    state.lastNote = note
    node.instruments.forEach(inst => {
        inst.triggerAttackRelease(note.freq, dur, time)
    })
    node.oscillator.frequency.setValueAtTime(note.freq, time)
}

class State {

    constructor() {
        this.counter = 0
        this.lastNote = null
        this.isOscillatorStarted = false
    }

    get noteDur() {
        return this.beat / this.bpm
    }

    get sampleDur() {
        return this.noteDur * this.sample.length
    }

    get isShuffleWanted() {
        return this.shuffle && this.counter % this.shuffle === 0
    }
}

/**
 * @param {*} obj
 * @return {Boolean}
 */
function isInstrument(obj) {
    return obj && typeof obj.triggerAttackRelease === 'function'
}
