/**
 * WebAudio effects.
 * 
 * @author Doug Owings <doug@dougowings.net>
 * @license MIT
 */
import {BaseNode, paramProp} from './core.js'
import {flip, range} from './utils/utils.js'
import {guessTimeSig, Marker} from './utils/notation.js'
import * as Music from './music.js'
import * as Shufflers from './shufflers.js'
import '../lib/tone.js'

const symState = Symbol()
const symSched = Symbol()

const Lookahead = 25.0
const StopDelay = Lookahead * 10
const ShufflerIds = {
    NONE: 0,
    RANDY: 1,
    TONAK: 2,
    SOFA: 3,
    BIMOM: 4,
    JARD: 5,
    CHUNE: 6,
}
const SHUFFLERS = Object.fromEntries(
    Object.entries(ShufflerIds).map(
        ([name, id]) =>  [id, Shufflers[name]]
    )
)
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
                    afterSet.call(this, name, value)
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
        state.sample = state.scale.copy(true)
        state.sample.state = state
        state.counter = 0
        updateState(this)
        padSample.call(this)
        normalizeSample.call(this)
        return this
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

    get noteDurDenominator() {
        return 240 / this.beat.value
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
            default: ShufflerIds.NONE,
            values: flip(ShufflerIds),
        },
        dot: {
            type: 'boolean',
            default: false,
        },
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
 * @param {String} name
 * @param {number|boolean} value
 */
function afterSet(name, value) {
    if (!this.playing) {
        return
    }
    const state = this[symState]
    if (REBUILD_OPTHASH[name] === true) {
        this.build()
    } else {
        updateState(this)
    }
    clearTimeout(state.stopId)
    switch (name) {
        case 'shuffler':
            state.counter = 0
            break
        case 'loop':
            if (value) {
                this[symSched]()
            }
            break
    }
}

function padSample() {
    const {sample} = this[symState]
    const minSize = this.minSize.value
    while (sample.length < minSize) {
        sample.push(...sample.slice(0, minSize - sample.length))
    }
}

function normalizeSample() {
    const state = this[symState]
    const {sample} = state
    for (let i = 0; i < sample.length; ++i) {
        const note = sample[i]
        if (note) {
            sample[i] = note.copy()
        } else {
            // Treat empty values as rests
            sample[i] = new Marker.Rest
        }
    }
    state.refreshTimeSig()
}

/**
 * Call the configured shuffler on the current sample
 */
function shuffle() {
    const state = this[symState]
    if (!state.sample) {
        return
    }

    state.sample = state.scale.copy(true)
    state.sample.state = state

    padSample.call(this)
    SHUFFLERS[this.shuffler.value](state.sample)
    normalizeSample.call(this)
    
    state.prev = state.sample.copy()

    if (this.dot.value) {
        dottify.call(this)
    }
}

/**
 * Update state from node params
 * 
 * @param {Sampler} node
 */
function updateState(node) {
    const state = node[symState]
    state.minSize = node.minSize.value
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
    clearTimeout(state.stopId)
    let firstScheduleTime = null
    while (this.context.currentTime + state.sampleDurInSeconds > state.nextTime) {
        if (!firstScheduleTime) {
            firstScheduleTime = state.nextTime
        }
        if (state.isShuffleWanted) {
            shuffle.call(this)
        }
        state.sample.forEach(note => {
            playNote.call(this, note, state.noteDurInSeconds, state.nextTime)
            state.nextTime += state.noteDurInSeconds
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
 * @param {Music.Note|null|undefined} note
 * @param {number} durationSeconds duration in seconds
 * @param {number} time
 */
function playNote(note, durationSeconds, time) {
    const state = this[symState]
    if (note instanceof Marker.Rest) {
        this.oscillator.frequency.setValueAtTime(0, time)
        return
    }
    if (note.dot) {
        durationSeconds *= 1.5
    } else if (note.dedot) {
        durationSeconds /= 2
        time += durationSeconds
    }
    state.lastNote = note
    this.instruments.forEach(inst => {
        inst.triggerAttackRelease(note.freq, durationSeconds, time)
    })
    this.oscillator.frequency.setValueAtTime(note.freq, time)
}

class State {

    constructor() {
        this.counter = 0
        this.lastNote = null
        this.isOscillatorStarted = false
    }

    get noteDurDenominator() {
        return 240 / this.beat
    }
    get noteDurInSeconds() {
        return this.beat / this.bpm
    }

    get totalBeats() {
        if (!this.sample || !this.timeSig) {
            return 0
        }
        return this.sample.length / this.noteDurDenominator * this.timeSig.lower
    }

    get notesPerMeasure() {
        if (!this.sample) {
            return Infinity
        }
        return Math.ceil(this.sample.length / this.measuresNeeded)
    }

    get measuresNeeded() {
        if (!this.timeSig) {
            return 0
        }
        return Math.ceil(this.totalBeats / this.timeSig.upper)
    }

    get sampleDurInSeconds() {
        return this.noteDurInSeconds * this.sample.length
    }

    get isShuffleWanted() {
        return this.shuffle && this.counter % this.shuffle === 0
    }

    refreshTimeSig() {
        if (this.sample) {
            const shouldUpdate = (
                this._lastTimeSigLen !== this.sample.length ||
                this._lastTimeSigDenom !== this.noteDurDenominator
            )
            if (shouldUpdate) {
                this.timeSig = guessTimeSig(this.sample.length, this.noteDurDenominator)
                this._lastTimeSigLen = this.sample.length
                this._lastTimeSigDenom = this.noteDurDenominator
                console.log(this.timeSig)
            }
        } else {
            this._lastTimeSigLen = null
            this._lastTimeSigDenom = null
        }
    }
}

/**
 * @param {*} obj
 * @return {Boolean}
 */
function isInstrument(obj) {
    return obj && typeof obj.triggerAttackRelease === 'function'
}


function dottify() {
    const state = this[symState]
    const {sample, notesPerMeasure, timeSig} = state
    if (notesPerMeasure < 2) {
        return
    }
    for (let i = 0; i < sample.length; i += notesPerMeasure) {
        const a = sample[i]
        const b = sample[i + 1]
        // const c = sample[i + 2]
        // if (!a || !b || !c) {
        if (!a || !b || (a instanceof Marker) || (b instanceof Marker)) {
            continue
        }
        a.dot = true
        b.dedot = true
    }
}

