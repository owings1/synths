import $ from '../../lib/jquery.js'
import {mixerWidget, nodeWidget} from '../../src/widgets.js'
import Sample from '../../src/sampler.js'
import {VexSampleScore} from '../../src/score.js'

const context = new AudioContext()
    
const volume = new GainNode(context)
const sampler = new Sample(context)
volume.connect(context.destination)
sampler.connect(volume)

const mixer = [{name: 'volume', param: volume.gain}]
volume.gain.value = 0.5

$(() => {

    const score = new VexSampleScore(sampler.getSample(), {mergeRests: true})
    mixerWidget('mixer', null, mixer).addClass('fx1').appendTo('#inputs')
    nodeWidget('sample', sampler).addClass('fx2').appendTo('#inputs')

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

