import $ from '../../lib/jquery.js'
import Vex from '../../lib/vexflow.js'
// import {scaleSample, Tonality} from '../../src/music.js'
import * as Widgets from '../../src/widgets.js'
import ScaleSample from '../../src/scale.js'

const context = new AudioContext()
    
const volume = new GainNode(context)
volume.gain.value = 0.5
volume.connect(context.destination)

const scale = new ScaleSample(context)
scale.connect(volume)

const mixer = [{name: 'volume', param: volume.gain}]

$(() => {
    const score = new VexSampleScore(scale.getSample())
    Widgets.mixerWidget('mixer', null, mixer).appendTo('#inputs')
    const {params, actions} = $.extend(true, {}, scale.meta)
    Widgets.nodeWidget('scale', scale, {params, actions, title: 'Scale'})
        .appendTo('#inputs')
    $('#mixer').addClass('fx1')
    $('#scale').addClass('fx2').on('change', () => {
        if (!scale.playing) {
            scale.build().doShuffle()
        }
        const sample = scale.getSample()
        // console.log(sample)
        score.reload(sample)
        renderScore()
    })
    scale.onschedule = sample => {
        score.reload(sample)
        renderScore()
    }
    function renderScore() {
        $('#score').empty()
        score.render('#score')
    }

})


const {Flow} = Vex

class VexSampleScore {

    /**
     * @param {Music.ScaleNote[]} sample
     */
    constructor(sample) {
        this.reload(sample)
    }

    reload(sample) {
        this.sample = sample
        this.renderType = Flow.Renderer.Backends.SVG
        // number of notes per measure
        this.notesPer = 4
        // duration of each note, e.g. 4 for quarter note
        this.noteDur = 4
        // time signature string, '4/4'
        this.timeSig = [this.notesPer, this.noteDur].join('/')
        // notes can be null
        this.tonic = sample.find(Boolean).tonic
        // key signature, e.g. 'F#'
        this.keySig = this.tonic.shortLabel
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
        // total render width
        this.width = sample.length * this.noteWidth + this.left

    }
    /**
     * Main render method
     * @param target element, selector, or jQuery object
     */
    render(target) {
        if (this.context) {
            this.context.clear()
        }
        this.target = $(target).get(0)
        this.setupContext()
        this.createNotes()
        this.applyAccidentals()
        this.addRestIfNeeded()
        this.buildMeasures()
        let left = this.left
        this.measures.forEach((measure, i) => {
            const width = this.noteWidth * measure.length
            const stave = new Flow.Stave(left, this.top, width)
            if (i === 0) {
                stave.addClef(this.clef)
                    .addTimeSignature(this.timeSig)
                    .addKeySignature(this.keySig)
            }
            stave.setContext(this.context).draw()
            Flow.Formatter.FormatAndDraw(this.context, stave, measure)
            left += width
        })
    }

    /**
     * Initialize canvass
     */
    setupContext() {
        this.renderer = new Flow.Renderer(this.target, this.renderType)
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
            if (!note) {
                this.staveNotes.push(this.getRestNote(this.notesPer / this.noteDur))
                return
            }
            const keys = [this.getKeyLabel(note)]
            const opts = {keys: keys, duration: this.noteDur, clef: this.clef}
            this.staveNotes.push(new Flow.StaveNote(opts))
        })
    }

    /**
     * Add accidentals base on key signature
     */
    applyAccidentals() {
        const voice = new Flow.Voice()
        voice.setMode(Flow.Voice.Mode.SOFT).addTickables(this.staveNotes)
        Flow.Accidental.applyAccidentals([voice], this.keySig)
    }

    /**
     * Add a rest StaveNote to this.notes if needed
     */
    addRestIfNeeded() {
        const beats = this.sample.length % this.notesPer
        if (beats === 0 || this.notesPer > this.sample.length) {
            return
        }
        this.staveNotes.push(this.getRestNote(beats))
    }

    /**
     * Group the StaveNotes into this.measures
     */
    buildMeasures() {
        this.measures = []
        for (let m = 0; m < this.sample.length; m += this.notesPer) {
            const measure = this.staveNotes.slice(m, m + this.notesPer)
            this.measures.push(measure)
        }
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
        return [note.shortLabel, note.octave].join('/')
    }

    /**
     * @param {number} beats
     * @return {Flow.StaveNote}
     */
    getRestNote(beats) {
        let duration
        if (beats === 1) {
            duration = 'qr'
        } else if (beats === 4) {
            duration = 'wr'
        } else {
            duration = 'hr'
        }
        console.log({beats, duration})
        const isDot = beats === 3
        const key = this.cleff === 'bass' ? 'c/3' : 'c/5'
        const note = new Flow.StaveNote({keys: [key], duration})
        if (isDot) {
            Flow.Dot.buildAndAttach([note], {index: 0})
        }
        return note
    }
}
