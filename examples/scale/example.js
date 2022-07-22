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
    
const volume = new GainNode(context)
volume.gain.value = 0.5

const mixer = [
    {
        name: 'volume',
        label: 'Volume',
        param: volume.gain,
    },
]

volume.connect(context.destination)

const noteDuration = {
    value: 0.25
}

$(() => {
    $('#mixer-wrapper')
        .append(Widgets.mixerWidget('mixer', null, mixer))
    $('#scale-noteDuration, #scale-noteDuration-meter')
        .data({param: noteDuration})
    $('#scale-noteDuration').val(noteDuration.value)
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
        stop()
    }
    osc = new OscillatorNode(context)
    const param = osc.frequency
    const dur = Number(noteDuration.value)
    const tonic = Music.freqAtDegree(
        $('#scale-degree').val(),
        $('#scale-octave').val(),
    )
    const tonality = $('#scale-tonality').val()
    const freqs = Music.scaleFreqs(tonic, {tonality})
    Music.scaleFreqs(freqs.pop(), {tonality, descend: true})
        .forEach(freq => freqs.push(freq))

    const start = context.currentTime
    let time = start
    freqs.forEach(freq => {
        param.setValueAtTime(freq, time)
        time += dur
    })
    param.setValueAtTime(0, time)
    time += dur
    playing = true
    osc.connect(volume)
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
