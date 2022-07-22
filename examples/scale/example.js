/**
 * Single oscillator and FX chain demo.
 * 
 * References:
 *  - https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Simple_synth
 *  - https://github.com/mdn/webaudio-examples/
 */
import $ from '../../src/jquery.js'
import * as Music from '../../src/music.js'
// import * as Effects from '../../src/effects.js'
import * as Widgets from '../../src/widgets.js'

const context = new AudioContext()
    
const main = new GainNode(context)

const mixer = [
    {
        name: 'main',
        label: 'Main',
        param: main.gain,
    },
]

main.connect(context.destination)

const noteDuration = {
    _value: 0.25,
    get value() { return this._value },
    set value(value) { this._value = Number(value)},
}

$(() => {
    $('#mixer-wrapper')
        .append(Widgets.mixerWidget('mixer', 'Mixer', mixer))
    $('#scale-noteDuration, #scale-noteDuration-meter')
        .data({param: noteDuration})
    $('#mixer').addClass('fx1')
    $('#scale').addClass('fx2')
    $(document).on({click, change})
    $('button').button()
    updateMeters()
})

let playing
let stopId
let osc
function stop() {
    if (!playing) {
        return
    }
    playing = false
    osc.disconnect()
    osc.stop()
    osc = null
    clearTimeout(stopId)
}
function play() {
    if (playing) {
        return
    }
    osc = new OscillatorNode(context)
    const start = context.currentTime
    const dur = Number(noteDuration.value)
    const tonality = Number($('#scale-tonality').val())
    const degree = Number($('#scale-degree').val())
    const octave = Number($('#scale-octave').val())
    const tonic = Music.freqAtDegree(degree, octave)
    const freqs = Music.scaleFreqs(tonic, {tonality})
    console.log({tonality, degree, octave, tonic, freqs})
    let time = start

    freqs.forEach(freq => {
        osc.frequency.setValueAtTime(freq, time)
        time += dur
    })
    playing = true
    osc.connect(main)
    osc.start()
    stopId = setTimeout(stop, (time - start) * 1000)
}
/**
 * Click event handler.
 * 
 * @param {Event} e
 */
function click(e) {
    const $target = $(e.target)
    const id = $target.attr('id')
    switch (id) {
        case 'play':
            play()
            break
        case 'stop':
            stop()
            break
        default:
            break
    }
}

/**
 * Change event handler.
 * 
 * @param {Event} e
 */
function change(e) {
    const $target = $(e.target)
    const value = $target.val()
    const {param} = $target.data()
    if (param) {
        param.value = value
        updateMeters()
        return
    }
    // const id = $target.attr('id')
    // switch (id) {
    //     default:
    //         break
    // }
    // const name = $target.attr('name')
    // switch (name) {
    //     default:
    //         break
    // }
}

/**
 * Update meter text values.
 */
function updateMeters() {
    $('.meter').each(function() {
        const $meter = $(this)
        const {def, param} = $meter.data()
        console.log(param)
        if (!param) {
            return
        }
        const {type} = def || {}
        const {value} = param
        let text
        switch (type) {  
            case 'integer':
                text = Number(value).toFixed(0)
                break
            case 'float':
            default:
                text = Number(value).toFixed(2)
                break
        }
        $meter.text(text)
    })
}
