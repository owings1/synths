/**
 * WebAudio effects HTML.
 * 
 * @author Doug Owings <doug@dougowings.net>
 * @license MIT
 */
import $ from '../lib/jquery.js'

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
        $('<h2/>')
            .addClass('heading')
            .text(title)
            .appendTo($section)
            .on('click', function() { $(`#${id}-params`).toggle('fast')})
    }
    const $table = $('<table/>')
        .attr({id: `${id}-params`})
        .addClass('params')
        .appendTo($section)
    // Active checkbox
    if (node.active !== undefined) {
        $table.append(nodeActiveWidget(id, node, $section))
    }
    if (params) {
        Object.entries(params).forEach(([name, def]) => {
            if (def.hidden && !opts.showHidden) {
                return
            }
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
        $('<button/>').button()
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
            let fixed = 0
            if (def.type === 'float') {
                if (step) {
                    fixed = countDecimals(step)
                } else {
                    fixed = 2
                }
            }
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
 * @param {LocalPresets} presets
 * @param {Number} n
 * @param {Number} per
 * @return {object} jQuery object
 */
function presetsWidget(presets, n = 24, per = 12) {
    const $section = $('<section/>').addClass('presets')
    presetsJsonWidget(presets, $section)
    for (let i = 0; i < Math.ceil(n / per); i++) {
        const $table = $('<table/>').appendTo($section)
        const $headTr = $('<tr/>').appendTo($table)
        const $clearTr = $('<tr/>').appendTo($table)
        const $saveTr = $('<tr/>').appendTo($table)
        const $loadTr = $('<tr/>').appendTo($table)
        for (let j = 1; j <= per; j++) {
            const key = String(j + i * per)
            $('<th/>').text(key).appendTo($headTr)
            const $clearTd = $('<td/>').appendTo($clearTr)
            const $saveTd = $('<td/>').appendTo($saveTr)
            const $loadTd = $('<td/>').appendTo($loadTr)
            const $clear = $('<button/>').button()
                .attr({value: key})
                .text('clear')
                .addClass('presets clear')
                .appendTo($clearTd)
                .on('click', () => {
                    presets.clear(key)
                    $clear.button({disabled: true})
                    $load.button({disabled: true})
                })
            const $save = $('<button/>').button()
                .attr({value: key})
                .text('save')
                .addClass('presets save')
                .appendTo($saveTd)
                .on('click', () => {
                    presets.save(key)
                    $clear.button({disabled: false})
                    $load.button({disabled: false})
                })
            const $load = $('<button/>').button()
                .attr({value: key})
                .text('load')
                .addClass('presets load')
                .appendTo($loadTd)
                .on('click', () => {
                    presets.load(key)
                    $('button.load', $section).removeClass('active')
                    $load.addClass('active')
                })
        }
    }
    $section.on('dataLoad', () => {
        $('button.presets.clear, button.presets.load', $section).each(function() {
            const $this = $(this)
            const key = $this.attr('value')
            const has = presets.has(key)
            $this.button({disabled: !has})
            console.log(this, {key, has})
        })
    })
    $section.trigger('dataLoad')
    return $section
}

/**
 * @param {LocalPresets} presets
 * @param {object} $section jQuery object
 * @return {object} jQuery object
 */
function presetsJsonWidget(presets, $section) {
    const $dialog = $('<div/>')
        .appendTo($section)
        .dialog({
            autoOpen: false,
            minWidth: 600,
            minHeight: 400,
        })
    const $area = $('<textarea/>')
        .attr({spellcheck: false})
        .css({
            fontFamily: 'courier',
            whiteSpace: 'pre',
            width: '100%',
            height: '100%',
            minWidth: 560,
            minHeight: 360,
        })
        .appendTo($dialog)
    const $buttonsDiv = $('<div/>')
        .appendTo($dialog)
        .append(
            $('<button/>')
                .text('Save')
                .on('click', () => {
                    let data
                    try {
                        data = JSON.parse($area.val())
                    } catch(e) {
                        console.error(e)
                        return
                    }
                    presets.data = data
                    presets.write()
                    $dialog.dialog('close')
                    $section.trigger('dataLoad')
                })
        )
    
    $('<button/>')
        .text('{ }')
        .appendTo($section)
        .on('click', () => {
            $area.text(JSON.stringify(presets.data, null, 2))
            $dialog.dialog('open')
        })
    return $dialog
}
/**
 * Save and load presets from localStorage
 */
export class LocalPresets {

    /**
     * @param {String} key The localStorage key
     * @param {object} nodes Map of id to node
     * @param {object[]} mixer Array of mixer infos `name`, `param`
     * @param {String} mixerId The id of the mixer element
     */
    constructor(key, nodes, mixer, mixerId = 'mixer') {
        this.key = key
        this.data = JSON.parse(localStorage.getItem(this.key) || '{}')
        this.nodes = nodes || {}
        this.mixer = mixer || []
        this.mixerId = mixerId
        this.initial = this.read()
        this.current = $.extend(true, {}, this.initial)
    }

    /**
     * @param {number} n
     * @param {number} per
     * @return {object} jQuery object
     */
    widget(n = 24, per = 12) {
        return presetsWidget(this, n, per)
    }

    /**
     * Read and save presets, and write
     * @param {string} key
     * @return {this}
     */
    save(key) {
        this.data[key] = this.read()
        this.write()
        return this
    }

    /**
     * Clear presets and write
     * @param {string} key
     * @return {this}
     */
    clear(key) {
        delete this.data[key]
        this.write()
        return this
    }

    /**
     * @param {string} key
     * @return {Boolean}
     */
    has(key) {
        return Boolean(this.data[key])
    }

    /**
     * Read the settings from the page
     * @return {object}
     */
    read() {
        return {
            mixer: Object.fromEntries(
                this.mixer.map(({name, param}) => [name, param.value])
            ),
            nodes: Object.fromEntries(
                Object.entries(this.nodes).map(([id, node]) =>
                    [id, {active: node.active, params: node.paramValues()}]
                )
            ),
        }
    }
    /**
     * Load presets to the page
     * @param {String} key
     * @return {this}
     */
    load(key) {
        const settings = this.data[key]
        if (!settings) {
            return this
        }
        $.each(settings.mixer || {}, (name, value) => {
            $(`#${this.mixerId}-${name}`).val(value).trigger('change')
        })
        $.each(settings.nodes || {}, (id, {active, params}) => {
            if (active !== undefined) {
                $(`#${id}-active`).prop('checked', active).trigger('change')
            }
            $.each(params, (name, value) => {
                const $param = $(`#${id}-${name}`)
                if (typeof value === 'boolean') {
                    $param.prop('checked', value)
                } else {
                    $param.val(value)
                }
                $param.trigger('change')
            })
        })
        return this
    }

    /**
     * Write to local storage
     */
    write() {
        localStorage.setItem(this.key, JSON.stringify(this.data))
    }
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
        $('<button/>').button()
            .attr({name, value: String(i)})
            .text(labels[i])
            .appendTo($up)
        $('<button/>').button()
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

function countDecimals(value) {
    if (Math.floor(value) === value) {
        return 0
    }
    return String(value).split('.')[1].length || 0
}

