/**
 * WebAudio effects.
 * 
 * @author Doug Owings <doug@dougowings.net>
 * @license MIT
 */
import Vex from '../../lib/vexflow.js'
import $ from '../../lib/jquery.js'
import * as Music from './music.js'
import {guessTimeSig, guessClef, Clef, RestMarker} from './utils/notation.js'
import {ValueError} from './utils/utils.js'

const {Accidental, Articulation, Beam, Dot, Formatter, Renderer, Stave, StaveNote, Voice} = Vex.Flow
const REST_NOTETYPE = 'r'
const STACCATO_MARK = 'a.'
const STACCATO_LIMIT = 0.3
const Defaults = {
    noteDur: null, // default 4
    timeSig: null, // null is to guess
    clef: null, // null is to guess
}

const VALID_NOTEDURS = [1, 2, 4, 8, 16]
const REST_KEYS = ['c/5']
const DEFAULT_DUR = 4

export class VexSampleScore {

    /**
     * @param {TonalSample} sample
     * @param {object} opts
     */
    constructor(sample = null, opts = undefined) {
        this.opts = {...Defaults}
        this.reload(sample, opts)
    }

    /**
     * @param {TonalSample} sample
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
     * Clear the SVG context, if any
     * @return {this}
     */
    clear() {
        if (this.context) {
            this.context.clear()
        }
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
        this.createBeams()
        this.computeSize()
        this.createStaves()
        this.setupContext()
        this.drawStaves()
        this.drawBeams()
        return this
    }

    /**
     * Draw this.beams
     */
    drawBeams() {
        this.beams.flat().forEach(beam => {
            beam.setContext(this.context).draw()
        })
    }

    /**
     * Draw this.staves with this.measures
     */
    drawStaves() {
        for (let i = 0; i < this.staves.length; ++i) {
            Formatter.FormatAndDraw(
                this.context,
                this.staves[i].setContext(this.context).draw(),
                this.measures[i],
            )
        }
    }

    /**
     * Populate:
     *   - this.staves
     */
    createStaves() {
        let left = this.marginLeft
        this.staves = this.measures.map((measure, i) => {
            let width = this.noteWidth * measure.length
            const isAddClef = i === 0
            const isAddKeySig = i === 0
            const isAddTimeSig = i === 0 && !this.timeSig.invalid
            width += (
                this.keySigWidth * isAddKeySig +
                this.clefWidth * isAddClef +
                this.timeSigWidth * isAddTimeSig
            )
            const stave = new Stave(left, this.marginTop, width) 
            if (isAddClef) {
                stave.addClef(this.clef)
            }
            if (isAddKeySig) {
                stave.addKeySignature(this.sample.keySig.label)
            }
            if (isAddTimeSig) {
                stave.addTimeSignature(this.timeSig.label)
            }
            left += width
            return stave
        })
    }

    /**
     * Populate:
     *   - this.renderer
     *   - this.context
     */
    setupContext() {
        this.clear()
        this.renderer = new Renderer($(this.target).get(0), Renderer.Backends.SVG)
        this.context = this.renderer.getContext()
        this.context.clear()
        this.renderer.resize(this.width, this.height)
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
        this.noteWidth = 40
        // width of the key signature
        this.keySigWidth = this.sample.keySig.accidents * this.accidentalWidth
        // total render height
        this.height = this.marginTop + 320
        // total render width
        this.width = this.sample.length * this.noteWidth + (
            this.marginLeft * 2 +
            this.clefWidth +
            this.keySigWidth +
            this.timeSigWidth
        )
    }

    /**
     * Populate:
     *   - this.beams {Beam[][]}
     */
    createBeams() {
        this.beams = this.measures.map(measure => Beam.generateBeams(measure))
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
        this.staveNotes = this.sample.map(note => {
            let duration, clef, keys
            switch (note.type) {
                case RestMarker:
                    duration = String(this.noteDur) + REST_NOTETYPE
                    clef = Clef.TREBLE
                    keys = REST_KEYS
                    break
                case Music.Note:
                    duration = this.noteDur
                    if (note.dedot) {
                        duration *= 2
                    }
                    clef = this.clef
                    keys = [note.label]
                    break
                default:
                    throw new ValueError(`Unknown note type: ${note}`)

            }
            const staveNote = new StaveNote({keys, duration, clef})
            if (note.dot) {
                Dot.buildAndAttach([staveNote], {index: 0})
            }
            if (note.articulation <= STACCATO_LIMIT) {
                staveNote.addModifier(new Articulation(STACCATO_MARK))
            }
            return staveNote
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
        const duropt = Number(this.opts.noteDur || this.sample.noteDur) || DEFAULT_DUR
        const tsopt = this.opts.timeSig || this.sample.timeSig
        if (!VALID_NOTEDURS.includes(duropt)) {
            throw new ValueError(`Invalid note duration: ${duropt}`)
        }
        this.noteDur = duropt
        if (tsopt) {
            switch (typeof tsopt) {
                case 'object':
                    this.timeSig = tsopt
                    break
                case 'string':
                default:
                    let [upper, lower] = tsopt.split('/').map(Number)
                    this.timeSig = {upper, lower, label: tsopt}
            }
        } else {
            this.timeSig = guessTimeSig(this.sample.length, this.noteDur)
        }
        this.totalBeats = this.sample.length / this.noteDur * this.timeSig.lower
        this.measuresNeeded = Math.ceil(this.totalBeats / this.timeSig.upper)
        this.notesPerMeasure = Math.ceil(this.sample.length / this.measuresNeeded)
    }

    /**
     * Populate:
     *   - this.clef
     */
    computeClef() {
        this.clef = this.opts.clef || guessClef(this.sample)
    }
}

