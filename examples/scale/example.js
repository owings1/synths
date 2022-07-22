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
import * as Utils from '../../src/utils.js'
import * as Widgets from '../../src/widgets.js'

const context = new AudioContext()
    
const volume = new GainNode(context)
volume.gain.value = 0.5
volume.connect(context.destination)

// note duration
const duration = {
    value: 0.25
}
let playing
let stopId
let osc

$(() => {
    $('#mixer-wrapper')
        .append(Widgets.mixerWidget('mixer', null, [
            {
                name: 'volume',
                label: 'Volume',
                param: volume.gain,
            },
        ]))

    $('#scale-duration, #scale-duration-meter')
        .data({param: duration})
    $('#scale-duration-meter').data({
        update: () => {
            $('#scale-duration-meter')
                .text(Number(duration.value).toFixed(2))
        }
    })
    $('#scale-duration').val(duration.value)

    Object.entries(Music.Tonality).forEach(([name, value]) => {
        $('<option/>').attr({value}).text(name).appendTo('#scale-tonality')
    })
    $('#scale-play').on({click: play})
    $('#scale-stop').on({click: stop})

    $('#mixer').addClass('fx1')
    $('#scale').addClass('fx2')

    $(document).on({change})

    $('button').button()

    updateMeters()
})


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
    const dur = Number(duration.value)
    const freqs = getFreqs()
    // clean
    freqs.push(0)

    osc = new OscillatorNode(context)
    const param = osc.frequency
    const start = context.currentTime
    let time = start
    freqs.forEach(freq => {
        param.setValueAtTime(freq, time)
        time += dur
    })

    playing = true
    osc.connect(volume)
    osc.start()
    stopId = setTimeout(stop, (time - start) * 1000)
}

function getFreqs() {
    const tonic = Music.freqAtDegree(
        $('#scale-degree').val(),
        $('#scale-octave').val(),
    )
    const tonality = $('#scale-tonality').val()
    let left, right
    switch ($('#scale-direction').val()) {
        case 'downup':
            left = Music.scaleFreqs(tonic, {tonality, descend: true})
            right = Music.scaleFreqs(left.pop(), {tonality})
            break
        case 'updown':
            left = Music.scaleFreqs(tonic, {tonality})
            right = Music.scaleFreqs(left.pop(), {tonality, descend: true})
            break
        case 'descend':
            left = Music.scaleFreqs(tonic, {tonality, descend: true})
            right = []
            break
        case 'ascend':
        default:
            left = Music.scaleFreqs(tonic, {tonality})
            right = []
            break
    }
    const freqs = left.concat(right)
    if ($('#scale-shuffle').is(':checked')) {
        Utils.shuffle(freqs)
    }
    return freqs
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
}

/**
 * Update meter text values.
 */
function updateMeters() {
    $('.meter').each(function() {
        const {update} = $(this).data()
        if (update) {
            update()
        }
    })
}
