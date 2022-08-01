import $ from '../../lib/jquery.js'
import {mixerWidget, nodeWidget} from '../../src/widgets.js'
import Sampler from '../../src/sampler.js'
import {VexSampleScore} from '../../src/score.js'

const context = new AudioContext()
    
const volume = new GainNode(context)
const sampler = new Sampler(context)
volume.connect(context.destination)
sampler.connect(volume)

const mixer = [{name: 'volume', param: volume.gain}]
volume.gain.value = 0.2

$(() => {

    const score = new VexSampleScore
    $('#inputs').append(
        mixerWidget('mixer', null, mixer).addClass('fx1'),
        nodeWidget('sample', sampler).addClass('fx2'),
    )

    let drawId
    sampler.onschedule = (sample, time) => {
        score.reload(sample, {noteDur: 240 / sampler.beat.value})
        drawId = setTimeout(renderScore, (time - context.currentTime) * 1000)
    }

    $('#sample-stop').on('click', () => clearTimeout(drawId))

    function renderScore() {
        score.render($('#score').empty().get(0))
    }
})

