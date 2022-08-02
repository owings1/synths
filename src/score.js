/**
 * WebAudio effects.
 * 
 * @author Doug Owings <doug@dougowings.net>
 * @license MIT
 */
import Vex from '../../lib/vexflow.js'
import $ from '../../lib/jquery.js'
import {guessTimeSig} from './utils/timesig.js'

const {Accidental, Formatter, Renderer, Stave, StaveNote, Voice} = Vex.Flow
const {FormatAndDraw} = Formatter
const REST_NOTETYPE = 'r'

export const NullMode = {
    REST: 1,
}
export const Clef = {
    BASS: 'bass',
    TREBLE: 'treble',
}
const Defaults = {
    nullMode: NullMode.REST,
    noteDur: 4,
    timeSig: null, // null is to guess
    clef: null, // null is to guess
}

const VALID_NOTEDURS = [1, 2, 4, 8, 16]
const REST_KEYS = ['c/5']

export class VexSampleScore {

    /**
     * @param {ScaleSample} sample
     * @param {object} opts
     */
    constructor(sample = null, opts = undefined) {
        this.opts = {...Defaults}
        this.reload(sample, opts)
    }

    /**
     * @param {ScaleSample} sample
     * @param {object} opts
     * @return {this}
     */
    reload(sample, opts = undefined) {
        this.sample = sample
        if (opts) {
            this.update(opts)
        }
        return this
    }

    /**
     * Just update the options
     * @param {object} opts
     * @return {this}
     */
    update(opts) {
        this.opts = {...this.opts, ...opts}
        return this
    }

    /**
     * Main render method
     * @param {string|object} target element, or id
     * @return {this}
     */
    render(target) {
        this.target = target
        this.computeTime()
        this.computeClef()
        this.createNotes()
        this.applyAccidentals()
        this.createMeasures()
        this.computeSize()
        this.setupContext()
        this.createStaves()
        this.drawStaves()
        return this
    }

    /**
     * Draw this.staves with this.measures
     */
    drawStaves() {
        for (let i = 0; i < this.staves.length; ++i) {
            FormatAndDraw(
                this.context,
                this.staves[i].draw(),
                this.measures[i],
            )
        }
        // this.staves.forEach((stave, i) => {
        //     // stave.draw()
        //     Formatter.FormatAndDraw(this.context, stave.draw(), this.measures[i])
        // })
    }

    /**
     * Populate:
     *   - this.staves
     */
    createStaves() {
        let left = this.marginLeft
        this.staves = []
        this.measures.forEach((measure, i) => {
            let width = this.noteWidth * measure.length
            const isDrawClef = i === 0
            const isDrawKeySig = i === 0
            const isDrawTimeSig = i === 0 && !this.timeSig.invalid
            if (isDrawKeySig) {
                width += this.keySigWidth
            }
            if (isDrawClef) {
                width += this.clefWidth
            }
            if (isDrawTimeSig) {
                width += this.timeSigWidth
            }
            const stave = new Stave(left, this.marginTop, width)
                .setContext(this.context)
            if (isDrawClef) {
                stave.addClef(this.clef)
            }
            if (isDrawKeySig) {
                stave.addKeySignature(this.sample.keySig.label)
            }
            if (isDrawTimeSig) {
                stave.addTimeSignature(this.timeSig.label)
            }
            this.staves.push(stave)
            left += width
        })
    }

    /**
     * Populate:
     *   - this.renderer
     *   - this.context
     */
    setupContext() {
        if (this.context) {
            this.context.clear()
        }
        this.renderer = new Renderer($(this.target).get(0), Renderer.Backends.SVG)
        this.renderer.resize(this.width, this.height)
        this.context = this.renderer.getContext()
        this.context.clear()
    }

    /**
     * Populate:
     *   - this.marginLeft
     *   - this.marginTop
     *   - this.clefWidth
     *   - this.timeSigWidth
     *   - this.accidentalWidth
     *   - this.noteWidth
     *   - this.height
     *   - this.width
     */
    computeSize() {
        // initial left margin
        this.marginLeft = 10
        // initial top margin
        this.marginTop = 40
        // width of a clef
        this.clefWidth = 60
        // width of the time signature
        this.timeSigWidth = 60
        // width of an accidental
        this.accidentalWidth = 15
        // render width of each note
        this.noteWidth = 70
        // width of the key signature
        this.keySigWidth = this.sample.keySig.accidents * this.accidentalWidth
        // total render height
        this.height = this.marginTop + 320
        // total render width
        this.width = this.sample.length * this.noteWidth + (
            this.marginLeft +
            this.clefWidth +
            this.keySigWidth +
            this.timeSigWidth +
            this.marginLeft
        )
        // console.log(getOctaveSpan(this.sample))
    }

    /**
     * Populate:
     *   - this.measures
     */
    createMeasures() {
        this.measures = []
        for (let m = 0; m < this.measuresNeeded; ++m) {
            const start = m * this.notesPerMeasure
            const end = start + this.notesPerMeasure
            this.measures.push(this.staveNotes.slice(start, end))
        }
    }

    /**
     * Add accidentals based on key signature to this.staveNotes
     */
    applyAccidentals() {
        Accidental.applyAccidentals(
            [
                new Voice()
                    .setMode(Voice.Mode.SOFT)
                    .addTickables(this.staveNotes)
            ],
            this.sample.keySig.label,
        )
    }

    /**
     * Populate:
     *   - this.staveNotes
     */
    createNotes() {
        this.staveNotes = []
        this.sample.forEach(note => {
            if (note) {
                const staveNote = new StaveNote({
                    keys: [note.label],
                    duration: this.noteDur,
                    clef: this.clef,
                })
                // patch with the scaleNote for reference
                staveNote.scaleNote = note
                this.staveNotes.push(staveNote)
            } else {
                switch (this.opts.nullMode) {
                    case NullMode.REST:
                    default:
                        this.staveNotes.push(
                            getRestNote(this.noteDur, this.clef)
                        )
                }
            }
        })
    }

    /**
     * Populate:
     *   - this.noteDur
     *   - this.timeSig
     *   - this.totalBeats
     *   - this.measuresNeeded
     *   - this.notesPerMeasure
     */
    computeTime() {
        // duration of each note, e.g. 4 for quarter note
        this.noteDur = this.opts.noteDur
        if (!VALID_NOTEDURS.includes(this.noteDur)) {
            throw new Error(`Invalid note duration: ${this.opts.noteDur}`)
        }
        if (this.opts.timeSig) {
            let [upper, lower] = this.opts.timeSig.split('/').map(Number)
            this.timeSig = {upper, lower, label: this.opts.timeSig}
            this.totalBeats = this.sample.length / this.noteDur * lower
        } else {
            this.timeSig = guessTimeSig(this.sample.length, this.noteDur)
            this.totalBeats = this.timeSig.totalBeats
        }
        this.measuresNeeded = Math.ceil(this.totalBeats / this.timeSig.upper)
        this.notesPerMeasure = Math.ceil(this.sample.length / this.measuresNeeded)
    }

    /**
     * Populate:
     *   - this.clef
     */
    computeClef() {
        this.clef = this.opts.clef || guessClefForNotes(this.sample)
    }
}

/**
 * @param {number} dur
 * @param {string} clef
 * @return {StaveNote}
 */
function getRestNote(dur, clef) {
    // const key = clef === Clef.BASS ? 'c/3' : 'c/5'
    return new StaveNote({keys: REST_KEYS, duration: String(dur) + REST_NOTETYPE})
}

/**
 * Guess the clef based on the notes
 * @param {ScaleNote[]} notes
 * @return {string}
 */
function guessClefForNotes(notes) {
    for (let i = 0; i < notes.length; i++) {
        const note = notes[i]
        if (!note) {
            continue
        }
        if (note.octave < 4) {
            return Clef.BASS
        }
        if (note.octave > 4) {
            return Clef.TREBLE
        }
    }
    return Clef.TREBLE
}

function getOctaveSpan(notes) {
    const indexes = notes
        .map(note => note && note.index || null)
        .filter(it => it !== null)
    const min = Math.min.apply(null, indexes)
    const max = Math.max.apply(null, indexes)
    return (max - min) / 12
}