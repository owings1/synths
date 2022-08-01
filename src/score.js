/**
 * WebAudio effects.
 * 
 * @author Doug Owings <doug@dougowings.net>
 * @license MIT
 */
import Vex from '../../lib/vexflow.js'

const {Accidental, Formatter, Renderer, Stave, StaveNote, Voice} = Vex.Flow

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
        this.update(opts || {})
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
        this.createStaves()
        this.setupContext()
        this.drawStaves()
        return this
    }

    /**
     * Draw this.staves with this.measures
     */
    drawStaves() {
        this.staves.forEach((stave, i) => {
            const measure = this.measures[i]
            stave.setContext(this.context).draw()
            Formatter.FormatAndDraw(this.context, stave, measure)
        })
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
        this.renderer = new Renderer(this.target, Renderer.Backends.SVG)
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
        this.width = this.sample.length * this.noteWidth
        this.width += this.marginLeft
        this.width += this.clefWidth
        this.width += this.keySigWidth
        this.width += this.timeSigWidth
        this.width += this.marginLeft
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
        const voice = new Voice()
        voice.setMode(Voice.Mode.SOFT).addTickables(this.staveNotes)
        Accidental.applyAccidentals([voice], this.sample.keySig.label)
    }

    /**
     * Populate:
     *   - this.staveNotes
     */
    createNotes() {
        this.staveNotes = []
        this.sample.forEach(note => {
            if (note) {
                const opts = {
                    keys: [note.label],
                    duration: this.noteDur,
                    clef: this.clef,
                }
                const staveNote = new StaveNote(opts)
                // patch with the scaleNote for reference
                staveNote.scaleNote = note
                this.staveNotes.push(staveNote)
            } else {
                switch (this.opts.nullMode) {
                    case NullMode.REST:
                    default:
                        const staveNote = getRestNote(this.noteDur, this.clef)
                        this.staveNotes.push(staveNote)
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
        if (![1, 2, 4, 8, 16].includes(this.noteDur)) {
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
 * Try to guess a reasonable time signature
 * @param {number} numNotes total number of equal valued notes
 * @param {number} noteDur duration each note, 1, 2, 4, 8, etc.
 * @return {object}
 */
function guessTimeSig(numNotes, noteDur) {
    let lower
    let upper
    let totalBeats
    let invalid = false
    const getTotalBeats = () => numNotes / noteDur * lower
    lower = 4
    totalBeats = getTotalBeats()
    search:
    for (const b of [4, 2, 3, 5, 7, 1]) {
        switch (b) {
            case 4: // prefer 4/4
            case 2: // go for 2/2 if even number of total beats
            case 3: // use 3/4 
            case 5: // try 5/4 for fun
            case 7: // why not 7/4
                if (totalBeats % b === 0) {
                    upper = b
                    break search
                }
                break
            case 1:
                if (totalBeats % b === 0) { // just make one big measure
                    upper = totalBeats
                    break search
                }
            default: // does not divide evenly by even one beat
                upper = 4
                invalid = true
        }
    }
    if (invalid) {
        if (noteDur === 8 || noteDur === 16) {
            // Try over 8
            lower = 8
            totalBeats = getTotalBeats()
            for (const b of [6, 3, 7]) {
                if (totalBeats % b === 0) {
                    upper = b
                    invalid = false
                    break
                }
            }
        }
    }
    if (invalid) {
        upper = lower = 4
    }
    return {
        upper,
        lower,
        totalBeats,
        invalid,
        label: `${upper}/${lower}`
    }
}

/**
 * @param {number} dur
 * @param {string} clef
 * @return {StaveNote}
 */
function getRestNote(dur, clef) {
    let duration = String(dur) + REST_NOTETYPE
    const key = 'c/5'
    // const key = clef === Clef.BASS ? 'c/3' : 'c/5'
    const staveNote = new StaveNote({keys: [key], duration})
    return staveNote
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
    const indexes =  notes.map(note => note && note.index || null).filter(it => it !== null)
    const min = Math.min.apply(null, indexes)
    const max = Math.max.apply(null, indexes)
    return (max - min) / 12
}