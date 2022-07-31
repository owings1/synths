/**
 * WebAudio effects.
 * 
 * @author Doug Owings <doug@dougowings.net>
 * @license MIT
 */
import * as Music from './music.js'
import Vex from '../../lib/vexflow.js'

const {Tonality, getNote} = Music
const {Flow} = Vex
const {Accidental, Formatter, Renderer, Stave, StaveNote, Voice} = Flow

export class VexSampleScore {

    /**
     * @param {Sample} sample
     * @param {object} opts
     */
    constructor(sample, opts = undefined) {
        this.reload(sample, opts)
    }

    /**
     * @param {Music.ScaleSample} sample
     * @param {object} opts
     * @param {number} opts.noteDur default 4 for quarter note
     */
    reload(sample, opts = undefined) {
        opts = opts || {}
        this.sample = sample
        // duration of each note, e.g. 4 for quarter note
        this.noteDur = opts.noteDur || 4
        if (![1, 2, 4, 8, 16].includes(this.noteDur)) {
            throw new Error(`Invalid note duration: ${opts.noteDur}`)
        }
        // notes can be null in the sample
        this.tonic = sample.find(Boolean).tonic
        // the clef, 'treble' or 'bass'
        this.clef = this.getClef()
        // initial left margin
        this.left = 10
        // initial top margin
        this.top = 40
        // render width of each note
        this.noteWidth = 100
        // total render height
        this.height = this.top + 260
    }

    // total render width
    get width() {
        return this.sample.length * this.noteWidth + this.left
    }

    /**
     * Main render method
     * @param {string|object} target element, or id
     */
    render(target) {
        if (this.context) {
            this.context.clear()
        }
        this.target = target
        this.setupContext()
        this.computeTime()
        this.computeKeySig()
        this.createNotes()
        this.applyAccidentals()
        this.buildMeasures()
        let left = this.left
        this.measures.forEach((measure, i) => {
            const width = this.noteWidth * measure.length
            const stave = new Stave(left, this.top, width)
            if (i === 0) {
                stave.addClef(this.clef)
                    .addTimeSignature(this.timeSig)
                    .addKeySignature(this.keySig.label)
            }
            stave.setContext(this.context).draw()
            Formatter.FormatAndDraw(this.context, stave, measure)
            left += width
        })
    }

    /**
     * Initialize canvass
     */
    setupContext() {
        this.renderer = new Renderer(this.target, Renderer.Backends.SVG)
        this.renderer.resize(this.width, this.height)
        this.context = this.renderer.getContext()
        this.context.clear()
    }

    /**
     * Create StaveNote objects in this.notes
     */
    createNotes() {
        this.staveNotes = []
        this.sample.forEach(note => {
            if (note) {
                const keys = [this.getKeyLabel(note)]
                const opts = {keys: keys, duration: this.noteDur, clef: this.clef}
                this.staveNotes.push(new StaveNote(opts))
            } else {
                const rest = this.getRestNote(this.noteDur)
                this.staveNotes.push(rest)
            }
        })
    }

    /**
     * Add accidentals base on key signature
     */
    applyAccidentals() {
        const voice = new Voice()
        voice.setMode(Voice.Mode.SOFT).addTickables(this.staveNotes)
        Accidental.applyAccidentals([voice], this.keySig.label)
    }

    /**
     * Group the StaveNotes into this.measures
     */
    buildMeasures() {
        this.measures = []
        for (let m = 0; m < this.measuresNeeded; ++m) {
            const start = m * this.notesPerMeasure
            const end = start + this.notesPerMeasure
            const measure = this.staveNotes.slice(start, end)
            this.measures.push(measure)
        }
    }

    /**
     * Try for a reasonable time signature
     */
     computeTime() {
        this.totalBeats = this.sample.length / this.noteDur * this.tsLower
        search:
        for (const b of [4, 2, 3, 5, 7, 1, null]) {
            switch (b) {
                case 4: // prefer 4/4
                case 2: // go for 2/2 if even number of total beats
                case 3: // use 3/4 
                case 5: // try 5/4 for fun
                case 7: // why not 7/4
                    if (this.totalBeats % b === 0) {
                        this.tsUpper = b
                        break search
                    }
                    break
                case 1: // just make one big measure
                    this.tsUpper = this.totalBeats
                    break
                default: // does not divide evenly by even one beat, why try
                    this.tsUpper = 4
            }
        }
        this.measuresNeeded = Math.ceil(this.totalBeats / this.tsUpper)
        this.notesPerMeasure = Math.ceil(this.sample.length / this.measuresNeeded)
    }

    // quarter note gets one beat
    get tsLower() {
        return 4
    }

    // time signature string, '4/4'
    get timeSig() {
        return this.tsUpper + '/' + this.tsLower
    }

    /**
     * Guess the clef based on the sample notes
     * @return {string}
     */
    getClef() {
        for (let i = 0; i < this.sample.length; i++) {
            const note = this.sample[i]
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

    /**
     * Get the note label, e.g. 'C#/5'
     * @return {string}
     */
    getKeyLabel(note) {
        return [this.keySig.isFlat ? note.flattedShortLabel : note.shortLabel, note.octave].join('/')
    }

    /**
     * @param {number} dur
     * @return {StaveNote}
     */
    getRestNote(dur = undefined) {
        dur = dur || this.noteDur
        let duration
        switch (dur) {
            case 1:
                duration = 'wr'
                break
            case 2:
                duration = 'hr'
                break
            case 4:
                duration = 'qr'
                break
            default:
                duration = String(dur) + 'r'
        }
        const key = this.cleff === 'bass' ? 'c/3' : 'c/5'
        const note = new StaveNote({keys: [key], duration})
        // if (isDot) {
        //     Flow.Dot.buildAndAttach([note], {index: 0})
        // }
        return note
    }


    computeKeySig() {
        // TODO: normalize for supported vex flow signatures, e.g. not D#
        const info = getKeySigInfo(this.tonic.degree, this.sample.tonality)
        this.keySig = info
        // const majorScale = Music.scaleSample(info.majorDegree)
        // console.log(majorScale)
        // majorScale.forEach(console.log)
        // const foo = majorScale.map(note => note.degree)

        this.naturalDegrees = Music.scaleSample(info.majorDegree).map(note => note.degree)
        console.log(info)
        // console.log({naturalDegrees})
    }

}

const MajorOffsets = Object.fromEntries(Object.entries({
        // Normal modes
        MAJOR: 0,
        DORIAN: -2,
        PHRYGIAN: -4,
        LYDIAN: -5,
        MIXOLYDIAN: -7,
        NATURAL_MINOR: -9,
        LOCRIAN: -11,
        // Other minor
        HARMONIC_MINOR: -9,
        MELODIC_MINOR: -9,
        // Octatonic
        DIMINISHED: 0, // TODO
        // Hexatonic
        WHOLE_TONE: 0, // TODO
        AUGMENTED: 0, // TODO
        PROMETHEUS: 0, // TODO
        BLUES: 0, // TODO
        TRITONE: 0, // TODO
        // Pentatonic
        MAJOR_PENTATONIC: 0,
        MINOR_PENTATONIC: -9,
        JAPANESE: 0, // TODO
}).map(([key, value]) => [Tonality[key], value]))


const MajorFlatDegrees = [3, 10]

function getKeySigInfo(degree, tonality) {
    // normalize to major key
    const majorOffset = MajorOffsets[tonality]
    let majorDegree = degree + majorOffset
    if (majorDegree < 0) {
        majorDegree += 12
    }
    // Relative minor of the major key
    let minorDegree = majorDegree - 3
    if (minorDegree < 0) {
        minorDegree += 12
    }
    const majorRoot = getNote(majorDegree)
    const minorRoot = getNote(minorDegree)
    const isMinor = Tonality.isMinor(tonality)
    const isFlat = MajorFlatDegrees.includes(majorDegree)
    const root = isMinor ? minorRoot : majorRoot
    const labelKey = isFlat ? 'flattedShortLabel' : 'shortedLabel'
    let label = root[labelKey]
    if (isMinor) {
        label += 'm'
    }
    return {
        label,
        isFlat,
        isMinor,
        majorDegree : majorRoot.degree,
        // majorLabel: isFlat ? majorRoot.flattedShortLabel : majorRoot.shortLabel,
        minorDegree : minorRoot.degree,
        // minorLabel: isFlat ? minorRoot.flattedShortLabel : minorRoot.shortLabel,
    }
}

