/**
 * WebAudio effects HTML.
 * 
 * @author Doug Owings <doug@dougowings.net>
 * @license MIT
 */
import $ from './jquery.js'

/**
 * @param {String} id The mixer ID.
 * @param {String} title
 * @param {object[]} infos Gain param infos with `name`, `label`, `param`.
 * @param {String} infos[].name
 * @param {String} infos[].label
 * @param {AudioParam} infos[].param
 * @return {object} A jQuery object
 */
export function mixerWidget(id, title, infos) {
    // faux AudioNode
    const node = Object.fromEntries(infos.map(
        ({name, param}) => [name, param]
    ))
    const params = Object.fromEntries(

        infos.map(({name, label, min, max, step}) => {
            if (label === undefined) {
                label = name
            }
            return [name, {
                label,
                type: 'float',
                min: min || 0.0,
                max: max || 1.0,
                step: step || 0.01,
            }]
        })
    )
    return nodeWidget(id, node, {title, params}).addClass('mixer')
}

/**
 * Build widget for AudioNode
 * 
 * @param {String} id The node ID.
 * @param {AudioNode|object} node Node object with properties for each param
 * @param {object} opts The options
 * @param {object} opts.params The parameter definitions. See `paramWidget()`
 * @param {object} opts.actions Action definitions
 * @param {String} opts.title The title
 * @return {object} A jQuery object
 */
export function nodeWidget(id, node, opts = {}) {
    opts = opts || {}
    let {params, actions, title} = opts
    const {meta} = node
    if (meta) {
        if (params === undefined) {
            params = meta.params
        }
        if (actions === undefined) {
            actions = meta.actions
        }
        if (title === undefined) {
            title = meta.title || meta.name
        }
    }
    const $section = $('<section/>').attr({id}).addClass('node')
    if (title) {
        $('<h2/>').text(title).appendTo($section)
    }
    const $table = $('<table/>').appendTo($section)
    // Active checkbox
    if (node.active !== undefined) {
        $table.append(nodeActiveWidget(id, node, $section))
    }
    if (params) {
        Object.entries(params).forEach(([name, def]) => {
            const paramId = [id, name].join('-')
            const param = node[name]
            $table.append(paramWidget(paramId, param, def))
        })
    }
    if (actions) {
        $section.append(actionsWidget(id, node, actions))
    }
    return $section
}

/**
 * @param {String} nodeId
 * @param {AudioNode|object} node
 * @param {object} $nodeWidget parent node jQuery object
 * @return {object} A jQuery object
 */
function nodeActiveWidget(nodeId, node, $nodeWidget) {
    $nodeWidget
        .toggleClass('active', node.active)
        .toggleClass('inactive', !node.active)
    return paramWidget(
        [nodeId, 'active'].join('-'),
        {
            get value() {return node.active},
            set value(v) {
                node.active = v
                $nodeWidget
                    .toggleClass('active', node.active)
                    .toggleClass('inactive', !node.active)
            },
        },
        {type: 'boolean'},
    )
}

/**
 * @param {String} nodeId
 * @param {AudioNode|object} node
 * @param {object} defs
 * @return {object} A jQuery object
 */
function actionsWidget(nodeId, node, defs) {
    const $div = $('<div/>').addClass('actions')
    Object.entries(defs).forEach(([name, def]) => {
        const id = [nodeId, name].join('-')
        const cb = node[def.method].bind(node)
        $('<button/>')
            .attr({id})
            .text(def.label || name)
            .addClass('action')
            .on('click', cb)
            .appendTo($div)
    })
    return $div
}

/**
 * Build widget for AudioParam
 * 
 * @param {String} id The param ID
 * @param {AudioParam|object} param The parameter instance, or object with
 *  `value` property
 * @param {object} def The parameter definition
 * @param {String} def.type The value type, 'integer', 'float'
 * @param {Number} def.min Range minimum
 * @param {Number} def.max Range maximum
 * @param {Number} def.step Range step
 * @param {object|Array} def.values Select values
 * @return {object} A jQuery object
 */
export function paramWidget(id, param, def) {
    const {value} = param
    let {label, unit} = def
    if (label === undefined) {
        label = id.split('-').pop()
    }
    const $tr = $('<tr/>').addClass('param')
    const $labelTd = $('<td/>').appendTo($tr)
    const $inputTd = $('<td/>').appendTo($tr)
    const $meterTd = $('<td/>').appendTo($tr)
    if (label) {
        $('<label/>')
            .attr({for: id})
            .text(label)
            .appendTo($labelTd)
    }
    switch (def.type) {
        case 'boolean':
            $('<input/>')
                .attr({id, type: 'checkbox'})
                .prop('checked', Boolean(value))
                .appendTo($inputTd)
                .on('change', function() {
                    param.value = $(this).is(':checked')
                })
            break
        case 'integer':
        case 'float':
            let {min, max, step, ticks} = def
            let fixed = 2 * (def.type === 'float')
            let display = Number(value).toFixed(fixed)
            let $input = $('<input/>')
                .attr({id, type: 'range', value, min, max, step})
                .val(value)
                .appendTo($inputTd)
                .on('change', function () {
                    param.value = $(this).val()
                    $(`#${id}-meter`).text(Number(param.value).toFixed(fixed))
                })
            if (ticks) {
                let listId = `${id}-datalist`
                tickDatalist(ticks).attr({id: listId}).appendTo($inputTd)
                $input.attr({list: listId})
            }
            $('<span/>')
                .attr({id: `${id}-meter`})
                .addClass('meter')
                .text(display)
                .appendTo($meterTd)
            if (unit) {
                $('<span/>')
                    .addClass('unit')
                    .text(unit)
                    .appendTo($meterTd)
            }
            break
        case 'enum':
            let {values} = def
            if (Array.isArray(values)) {
                values = Object.fromEntries(values.map(v => [v, v]))
            }
            let $select = $('<select/>')
                .attr({id})
                .appendTo($inputTd)
                .on('change', function() {
                    param.value = $(this).val()
                })
            Object.entries(values).forEach(([value, text]) => {
                $('<option/>')
                    .attr({value})
                    .text(text)
                    .prop('selected', value == def.default)
                    .appendTo($select)
            })
            $select.val(def.default)
            break
        default:
            $.error(`Unsupported param type: ${def.type}`)
    }
    return $tr
}

/**
 * @param {String} name
 * @return {object} jQuery object
 */
export function intervalButtons(name) {
    const labels = [
        null,
        'min 2nd',
        'Maj 2nd',
        'min 3rd',
        'Maj 3rd',
        '4th',
        'Tritone',
        '5th',
        'min 6th',
        'Maj 6th',
        'min 7th',
        'Maj 7th',
        'Octave',
    ]
    const $table = $('<table/>').addClass('intervals')
    const trs = ['Up', 'Down'].map(text =>
        $('<tr/>')
            .append($('<td/>').text(text))
            .appendTo($table)
    )
    const [$up, $down] = trs.map($tr =>
        $('<td/>').appendTo($tr)
    )
    trs.forEach($tr => $tr.append('<td/>'))
    for (let i = 1; i < 13; i++) {
        $('<button/>')
            .attr({name, value: String(i)})
            .text(labels[i])
            .appendTo($up)
        $('<button/>')
            .attr({name, value: String(-i)})
            .text(labels[i])
            .appendTo($down)

    }
    return $table
}

/**
 * @param {Number[]|{value: Number, label: String|undefined}[]} ticks
 * @return {object} jQuery object
 */
function tickDatalist(ticks) {
    const $list = $('<datalist/>')
    ticks.forEach(info => {
        let value, label
        if (typeof info === 'object') {
            value = info.value
            label = info.label
        } else {
            value = info
        }
        $('<option/>').attr({value, label}).appendTo($list)
    })
    return $list
}