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
export class VexSampleScore {

    /**
     * @param {ScaleSample} sample
     * @param {object} opts
     * @param {number} opts.noteDur
     * @param {number} opts.nullMode
     * @param {string} opts.timeSig
     * @param {boolean} opts.mergeRests
     */
    constructor(sample, opts = undefined) {
        this.opts = {}
        this.reload(sample, opts)
    }

    /**
     * @param {ScaleSample} sample
     * @param {object} opts
     * @param {number} opts.noteDur default 4 for quarter note
     */
    reload(sample, opts = undefined) {
        opts = opts || {}
        this.opts = {...this.opts, ...opts}
        this.sample = sample

    }

    /**
     * Main render method
     * @param {string|object} target element, or id
     */
    render(target) {
        this.target = target
        this.computeClef()
        this.computeTime()
        this.createNotes()
        this.applyAccidentals()
        this.buildMeasures()
        this.performMerges()
        this.computeSize()
        this.setupContext()
        this.drawMeasures()
    }

    /**
     * Draw this.measures
     */
    drawMeasures() {
        let left = this.left
        this.measures.forEach((measure, i) => {
            let width = this.noteWidth * measure.length
            if (i === 0) {
                width += 20
            }
            const stave = new Stave(left, this.top, width)
            if (i === 0) {
                stave.addClef(this.clef)
                    .addKeySignature(this.sample.keySig.label)
                if (!this.timeSig.invalid) {
                    stave.addTimeSignature(this.timeSig.label)
                }
            }
            stave.setContext(this.context).draw()
            Formatter.FormatAndDraw(this.context, stave, measure)
            left += width
        })
    }

    /**
     * Initialize canvass, populate this.renderer and this.context
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
     *   - this.left
     *   - this.top
     *   - this.noteWidth
     *   - this.height
     *   - this.width
     */
    computeSize() {
        // initial left margin
        this.left = 10
        // initial top margin
        this.top = 40
        // render width of each note
        this.noteWidth = 70
        // total render height
        this.height = this.top + 260
        // total render width
        this.width = this.sample.length * this.noteWidth + this.left
    }

    /**
     * Group the StaveNotes into this.measures
     */
    buildMeasures() {
        this.measures = []
        for (let m = 0; m < this.measuresNeeded; ++m) {
            const start = m * this.notesPerMeasure
            const end = start + this.notesPerMeasure
            this.measures.push(this.staveNotes.slice(start, end))
        }
    }

    // Combine two consecutive identical notes into one note
    // with double the beat value
    performMerges() {
        if (!this.opts.mergeRests) {
            return
        }
        const merged = []
        this.measures.forEach(staveNotes => {
            const measure = []
            const groups = []
            let prev
            staveNotes.forEach(staveNote => {
                const prevGroup = groups.at(-1)
                if (isRestStaveNote(staveNote) && staveNotesEqual(prev, staveNote) && prevGroup.length === 1) {
                    // add to last group
                    prevGroup.push(staveNote)
                } else {
                    // new group
                    groups.push([staveNote])
                }
                prev = staveNote
            })
            groups.forEach(group => {
                if (group.length === 1) {
                    measure.push(group[0])
                    return
                }
                let dur = group.length / this.noteDur
                let duration = 1 / dur
                if (duration % 1 === 0) {
                    const staveNote = group[0]
                    if (isRestStaveNote(staveNote)) {
                        duration += REST_NOTETYPE
                    }
                    const {keys, clef} = staveNote
                    measure.push(new StaveNote({keys, clef, duration}))
                } else {
                    measure.push(...group)
                }
            })
            merged.push(measure)
        })
        this.measures = merged
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
     * Create StaveNote objects in this.notes
     */
    createNotes() {
        this.staveNotes = []
        this.sample.forEach((note, i) => {
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
                        const staveNote = this.getRestNote(this.noteDur)
                        this.staveNotes.push(staveNote)
                }
            }
        })
    }

    /**
     * Compute:
     *   - this.noteDur
     *   - this.timeSig
     *   - this.totalBeats
     *   - this.measuresNeeded
     *   - this.notesPerMeasure
     */
    computeTime() {
        // duration of each note, e.g. 4 for quarter note
        this.noteDur = this.opts.noteDur || 4
        if (![1, 2, 4, 8, 16].includes(this.noteDur)) {
            throw new Error(`Invalid note duration: ${opts.noteDur}`)
        }
        let lower
        let upper
        let invalid = false
        const getTotalBeats = () => this.sample.length / this.noteDur * lower
        if (this.opts.timeSig) {
            ;[upper, lower] = this.opts.timeSig.split('/').map(Number)
        } else {
            // Try to guess a reasonable time signature
            lower = 4
            let totalBeats = getTotalBeats()
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
                if (this.noteDur === 8 || this.noteDur === 16) {
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
        }
        this.totalBeats = getTotalBeats()
        this.timeSig = {upper, lower, invalid, label: `${upper}/${lower}`}
        this.measuresNeeded = Math.ceil(this.totalBeats / upper)
        this.notesPerMeasure = Math.ceil(this.sample.length / this.measuresNeeded)
    }

    /**
     * Populate this.clef
     */
    computeClef() {
        this.clef = guessClefForNotes(this.sample)
    }



    /**
     * @param {number} dur
     * @return {StaveNote}
     */
    getRestNote(dur = undefined) {
        dur = dur || this.noteDur
        let duration = String(dur) + REST_NOTETYPE
        const key = this.cleff === 'bass' ? 'c/3' : 'c/5'
        const staveNote = new StaveNote({keys: [key], duration})
        // if (isDot) {
        //     Flow.Dot.buildAndAttach([note], {index: 0})
        // }
        return staveNote
    }


}

/**
 * @param {StaveNote} staveNote
 * @return {boolean}
 */
function isRestStaveNote(staveNote) {
    return Boolean(staveNote && staveNote.noteType === REST_NOTETYPE)
}

/**
 * @param {StaveNote|null|undefined} a
 * @param {StaveNote|null|undefined} b
 * @return {boolean}
 */
function staveNotesEqual(a, b) {
    if (!a || !b) {
        return false
    }
    return (
        a.scaleNote && a.scaleNote.equals(b.scaleNote) ||
        isRestStaveNote(a) && isRestStaveNote(b) && a.duration === b.duration
    )
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
            return 'bass'
        }
        if (note.octave > 4) {
            return 'treble'
        }
    }
    return 'treble'
}