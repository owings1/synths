/**
 * Single oscillator and FX chain demo.
 * 
 * References:
 *  - https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Simple_synth
 *  - https://github.com/mdn/webaudio-examples/
 */
import $ from '../../src/jquery.js'
import * as Music from '../../src/music.js'
import * as Utils from '../../src/utils.js'
import * as Widgets from '../../src/widgets.js'

const context = new AudioContext()
    
const volume = new GainNode(context)
volume.gain.value = 0.5
volume.connect(context.destination)

$(() => {
    $('#mixer-wrapper')
        .append(Widgets.mixerWidget('mixer', null, [
            {
                name: 'volume',
                label: 'Volume',
                param: volume.gain,
            },
        ]))
    $('#mixer').addClass('fx1')
    // note duration
    const duration = {value: 0.25}
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

    $(document).on({change})

    $('button').button()

    updateMeters()
})

/**
 * Shared state variables.
 */
const state = {
    /** @type {Number[]} */
    sample: null,
    /** @type {Boolean} */
    loop: false,
    /** @type {Number} */
    dur: null,
    /** @type {Boolean} */
    playing: false,
    /** @type {OscillatorNode} */
    osc: null,
    /** @type {Number} */
    nextTime: null,
    /** @type {Number} */
    stopId: null,
    /** @type {Number} */
    scheduleId: null,
}

/**
 * Stop handler.
 */
function stop() {
    if (!state.playing) {
        return
    }
    state.playing = false
    state.osc.stop()
    state.osc.disconnect()
    state.osc = null
    clearTimeout(state.stopId)
    clearTimeout(state.scheduleId)
}

/**
 * Play handler.
 */
function play() {
    stop()
    state.sample = buildSample()
    state.dur = Number($('#scale-duration').val())
    state.loop = $('#scale-loop').is(':checked')
    state.osc = new OscillatorNode(context)
    state.nextTime = context.currentTime
    schedule()
    state.playing = true
    state.osc.connect(volume)
    state.osc.start()
}

// how often to check for scheduling
const LOOKAHEAD = 25.0

/**
 * Schedule new notes if needed. Reschedules itself if looping.
 */
function schedule() {
    const {dur, osc, loop} = state
    const sampleDur = state.sample.length * dur
    while (context.currentTime + sampleDur > state.nextTime) {
        state.sample.forEach(freq => {
            osc.frequency.setValueAtTime(freq, state.nextTime)
            state.nextTime += dur
        })
        if (!loop) {
            break
        }
    }
    if (loop) {
        state.scheduleId = setTimeout(schedule, LOOKAHEAD)
    } else {
        // smooth shutoff
        osc.frequency.setValueAtTime(0, state.nextTime)
        const stopTime = (sampleDur + LOOKAHEAD) * 1000
        state.stopId = setTimeout(stop, stopTime)
    }
}

/**
 * Build array of frequencies for scale options.
 * 
 * @return {Number[]}
 */
function buildSample() {
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
        case 'down':
            left = Music.scaleFreqs(tonic, {tonality, descend: true})
            right = []
            break
        case 'up':
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
