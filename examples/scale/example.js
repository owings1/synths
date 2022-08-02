import $ from '../../lib/jquery.js'
import {mixerWidget, nodeWidget, LocalPresets} from '../../src/widgets.js'
import Sampler from '../../src/sampler.js'
import {VexSampleScore} from '../../src/score.js'
// import {MembraneSynth} from '../../src/synths.js'

const context = new AudioContext()
    
const volume = new GainNode(context)
const sampler = new Sampler(context)

volume.connect(context.destination)

// const drum = new MembraneSynth(context)
// sampler.connect(drum).connect(volume)
// drum.connect(volume)
sampler.connect(volume)

const mixer = [{name: 'volume', param: volume.gain}]
volume.gain.value = 0.2

$(() => {
    const presets = new LocalPresets('scale-example', {sample: sampler}, mixer)

    const score = new VexSampleScore

    $('#inputs').append(
        mixerWidget('mixer', null, mixer).addClass('fx1'),
        nodeWidget('sample', sampler).addClass('fx2'),
    ).on('change', () => presets.save('default'))

    if (presets.has('default')) {
        presets.load('default')
    }

    let drawId
    sampler.onschedule = (sample, time) => {
        score.reload(sample, {noteDur: sampler.noteDurDenominator})
        drawId = setTimeout(renderScore, (time - context.currentTime) * 1000)
    }

    $('#sample-stop').on('click', () => clearTimeout(drawId))

    function renderScore() {
        score.render($('#score').empty())
    }
})

