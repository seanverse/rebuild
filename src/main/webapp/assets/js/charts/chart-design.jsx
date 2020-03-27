/*
Copyright (c) REBUILD <https://getrebuild.com/> and its owners. All rights reserved.

rebuild is dual-licensed under commercial and open source licenses (GPLv3).
See LICENSE and COMMERCIAL in the project root for license information.
*/
/* eslint-disable react/no-string-refs */

const wpc = window.__PageConfig

let esourceFilter
$(document).ready(() => {
  $(window).trigger('resize')

  $('.chart-type>a, .chart-option .zicon').tooltip({ html: true, container: '.config-aside' })
  if (wpc.chartOwningAdmin !== true) $('.admin-show').remove()

  let dragIsNum = false
  let dargOnSort = false
  $('.fields a').draggable({
    helper: 'clone',
    appendTo: 'body',
    cursor: 'move',
    cursorAt: { top: 14, left: 75 },
    zIndex: 1999,
    start: function () {
      dragIsNum = $(this).data('type') === 'num'
    }
  }).disableSelection()
  $('.axis-target').droppable({
    accept: function () {
      if (dargOnSort === true) return false
      if ($(this).hasClass('J_axis-dim')) return !dragIsNum
      else return true
    },
    drop: function (event, ui) {
      if (dargOnSort !== true) add_axis(this, $(ui.draggable[0]))
    }
  }).disableSelection()
  // 排序
  $('.axis-target').sortable({
    axis: 'x',
    containment: 'parent',
    cursor: 'move',
    opacity: 0.8,
    start: function () {
      dargOnSort = true
    },
    stop: function () {
      dargOnSort = false
      render_preview()
    }
  }).disableSelection()

  const saveFilter = function (filter) {
    esourceFilter = filter
    render_preview()
  }
  $('.J_filter').click(() => {
    renderRbcomp(<AdvFilter title="设置过滤条件" entity={wpc.sourceEntity} filter={esourceFilter} inModal={true} confirm={saveFilter} canNoFilters={true} />)
  })

  const cts = $('.chart-type > a').click(function () {
    const $this = $(this)
    if ($this.hasClass('active') === false) return
    cts.removeClass('select')
    $this.addClass('select')
    render_option()
  })
  $('.chart-option .custom-control').click(function () {
    render_option()
  })

  // 保存按钮
  $('.rb-toggle-left-sidebar').attr('title', '完成').off('click').on('click', () => {
    const cfg = build_config()
    if (!cfg) { RbHighbar.create('当前图表无数据'); return }
    const data = {
      config: JSON.stringify(cfg),
      title: cfg.title,
      belongEntity: cfg.entity,
      chartType: cfg.type,
      metadata: { entity: 'ChartConfig', id: wpc.chartId }
    }

    const dash = $urlp('dashid') || ''
    $.post(`/dashboard/chart-save?dashid=${dash}`, JSON.stringify(data), function (res) {
      if (res.error_code === 0) {
        wpc.chartConfig = cfg
        location.href = (dash ? ('home?d=' + dash) : 'home') + '#' + res.data.id
      } else RbHighbar.error(res.error_msg)
    })

  }).tooltip({ placement: 'right' }).find('.zmdi').addClass('zmdi-arrow-left')

  if (wpc.chartConfig && wpc.chartConfig.axis) {
    $(wpc.chartConfig.axis.dimension).each((idx, item) => add_axis('.J_axis-dim', item))
    $(wpc.chartConfig.axis.numerical).each((idx, item) => add_axis('.J_axis-num', item))
    $('.chart-type>a[data-type="' + wpc.chartConfig.type + '"]').trigger('click')
    esourceFilter = wpc.chartConfig.filter

    const option = wpc.chartConfig.option || {}
    for (let k in option) {
      const opt = $('.chart-option input[data-name=' + k + ']')
      if (opt.length > 0) {
        if (opt.attr('type') === 'checkbox') {
          if (option[k] === 'true' || option[k] === true) opt.trigger('click')
        } else {
          opt.val(option[k])
        }
      }
    }
  }
  if (!wpc.chartId) $('<h4 class="chart-undata must-center">当前图表无数据</h4>').appendTo('#chart-preview')

  window.onbeforeunload = function () {
    const ccfg = build_config()
    if (!ccfg && !wpc.chartId);  // New and unconfig
    else if (JSON.stringify(ccfg) === JSON.stringify(wpc.chartConfig));  // Unchanged
    else return false
  }

  $addResizeHandler(() => {
    $('#chart-preview').height($(window).height() - 170)
    if (render_preview_chart) render_preview_chart.resize()
  })
})

const CTs = { SUM: '求和', AVG: '平均值', MAX: '最大值', MIN: '最小值', COUNT: '计数', Y: '按年', Q: '按季', M: '按月', D: '按日', H: '按时' }
let dlgAxisProps
// 添加维度
const add_axis = ((target, axis) => {
  const el = $($('#axis-ietm').html()).appendTo($(target))
  let fName = null
  let fLabel = null
  let fType = null
  let calc = null
  let sort = null

  const isNumAxis = $(target).hasClass('J_axis-num')
  // in-load
  if (axis.field) {
    const field = $('.fields [data-field="' + axis.field + '"]')
    fName = axis.field
    fLabel = field.text()
    fType = field.data('type')
    sort = axis.sort
    calc = axis.calc
    el.attr({ 'data-label': axis.label, 'data-scale': axis.scale })
  } else {
    fName = axis.data('field')
    fLabel = axis.text()
    fType = axis.data('type')
    sort = 'NONE'
    if (isNumAxis) {
      if (fType === 'text' || fType === 'date') calc = 'COUNT'
      else calc = 'SUM'
    } else {
      if (fType === 'date') calc = 'D'
    }
  }
  el.attr({ 'data-calc': calc, 'data-sort': sort })

  fLabel = fLabel || ('[' + fName.toUpperCase() + ']')

  if (isNumAxis) {
    if (fType === 'date' || fType === 'text') el.find('.J_date, .J_num').remove()
    else el.find('.J_date').remove()
  } else {
    if (fType === 'date') el.find('.J_text, .J_num').remove()
    else el.find('.J_text, .J_num, .J_date, .dropdown-divider').remove()
  }

  const aopts = el.find('.dropdown-menu .dropdown-item').click(function () {
    const $this = $(this)
    if ($this.hasClass('disabled') || $this.parent().hasClass('disabled')) return false

    const calc = $this.data('calc')
    const sort = $this.data('sort')
    if (calc) {
      el.find('span').text(fLabel + (' (' + $this.text() + ')'))
      el.attr('data-calc', calc)
      aopts.each(function () { if ($(this).data('calc')) $(this).removeClass('text-primary') })
      $this.addClass('text-primary')
      render_preview()
    } else if (sort) {
      el.attr('data-sort', sort)
      aopts.each(function () { if ($(this).data('sort')) $(this).removeClass('text-primary') })
      $this.addClass('text-primary')
      render_preview()
    } else {
      const state = { isNumAxis: isNumAxis, label: el.attr('data-label'), scale: el.attr('data-scale') }
      state.callback = (s) => {
        el.attr({ 'data-label': s.label, 'data-scale': s.scale })
        render_preview()
      }

      if (dlgAxisProps) dlgAxisProps.show(state)
      else renderRbcomp(<DlgAxisProps {...state} />, null, function () { dlgAxisProps = this })
    }
  })
  if (calc) el.find('.dropdown-menu li[data-calc="' + calc + '"]').addClass('text-primary')
  if (sort) el.find('.dropdown-menu li[data-sort="' + sort + '"]').addClass('text-primary')

  el.attr({ 'data-type': fType, 'data-field': fName })
  el.find('span').text(fLabel + (calc ? ` (${CTs[calc]})` : ''))
  el.find('a.del').click(() => {
    el.remove()
    render_option()
  })
  render_option()
})

// 图表选项
const render_option = (() => {
  const cts = $('.chart-type>a').removeClass('active')
  const dimsAxis = $('.J_axis-dim .item').length
  const numsAxis = $('.J_axis-num .item').length

  cts.each(function () {
    const $this = $(this)
    const dims = ($this.data('allow-dims') || '0|0').split('|')
    const nums = ($this.data('allow-nums') || '0|0').split('|')
    if (dimsAxis >= ~~dims[0] && dimsAxis <= ~~dims[1] && numsAxis >= ~~nums[0] && numsAxis <= ~~nums[1]) $this.addClass('active')
  })
  // FUNNEL
  if ((dimsAxis === 1 && numsAxis === 1) || (dimsAxis === 0 && numsAxis > 1));
  else $('.chart-type>a[data-type="FUNNEL"]').removeClass('active')

  // Active
  let select = $('.chart-type>a.select')
  if (!select.hasClass('active')) select.removeClass('select')
  select = $('.chart-type>a.select')
  if (select.length === 0) select = $('.chart-type>a.active').eq(0).addClass('select')

  const ct = select.data('type')
  // Option
  $('.chart-option>div').addClass('hide')
  const ctOpt = $('.J_opt-' + ct)
  if (ctOpt.length === 0) $('.J_opt-UNDEF').removeClass('hide')
  else ctOpt.removeClass('hide')

  // Sort
  const sorts = $('.axis-editor .J_sort').removeClass('disabled')
  if (ct === 'INDEX') {
    sorts.addClass('disabled')
  } else if (ct === 'FUNNEL') {
    if (numsAxis >= 1 && dimsAxis >= 1) $('.J_numerical .J_sort').addClass('disabled')
    else sorts.addClass('disabled')
  }

  render_preview()
})

// 生成预览
let render_preview_chart = null
const render_preview = (() => {
  $setTimeout(() => {
    if (render_preview_chart) {
      ReactDOM.unmountComponentAtNode(document.getElementById('chart-preview'))
      render_preview_chart = null
    }

    const cfg = build_config()
    if (!cfg) {
      $('#chart-preview').html('<h4 class="chart-undata must-center">当前图表无数据</h4>')
      return
    }

    $('#chart-preview').empty()
    // eslint-disable-next-line no-undef
    const c = detectChart(cfg)
    if (c) renderRbcomp(c, 'chart-preview', function () { render_preview_chart = this })
    else $('#chart-preview').html('<h4 class="chart-undata must-center">不支持的图表类型</h4>')

  }, 400, 'chart-preview')
})

// 构造配置
const build_config = (() => {
  const cfg = { entity: wpc.sourceEntity, title: $val('#chart-title') || '未命名图表' }
  cfg.type = $('.chart-type>a.select').data('type')
  if (!cfg.type) return

  const dims = []
  const nums = []
  $('.J_axis-dim>span').each((idx, item) => dims.push(__buildAxisItem(item, false)))
  $('.J_axis-num>span').each((idx, item) => nums.push(__buildAxisItem(item, true)))
  if (dims.length === 0 && nums.length === 0) return
  cfg.axis = { dimension: dims, numerical: nums }

  const opts = {}
  $('.chart-option input').each(function () {
    const name = $(this).data('name')
    if (name) opts[name] = $val(this)
  })
  cfg.option = opts

  if (esourceFilter) cfg.filter = esourceFilter
  // eslint-disable-next-line no-console
  if (rb.env === 'dev') console.log(cfg)
  return cfg
})

const __buildAxisItem = ((item, isNum) => {
  item = $(item)
  const x = {
    field: item.data('field'),
    sort: item.attr('data-sort') || '',
    label: item.attr('data-label') || ''
  }
  if (isNum) {
    x.calc = item.attr('data-calc')
    x.scale = item.attr('data-scale')
  } else if (item.data('type') === 'date') {
    x.calc = item.attr('data-calc')
  }
  return x
})

class DlgAxisProps extends RbFormHandler {
  constructor(props) {
    super(props)
  }

  render() {
    return (
      <RbModal title="显示样式" ref={(c) => this._dlg = c}>
        <div className="form">
          <div className="form-group row">
            <label className="col-sm-3 col-form-label text-sm-right">別名</label>
            <div className="col-sm-7">
              <input className="form-control form-control-sm" placeholder="默认" data-id="label" value={this.state.label || ''} onChange={this.handleChange} />
            </div>
          </div>
          {this.state.isNumAxis !== true ? null :
            <div className="form-group row">
              <label className="col-sm-3 col-form-label text-sm-right">小数位</label>
              <div className="col-sm-7">
                <select className="form-control form-control-sm" value={this.state.scale || 2} data-id="scale" onChange={this.handleChange}>
                  <option value="0">0</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                  <option value="6">6</option>
                </select>
              </div>
            </div>
          }
          <div className="form-group row footer">
            <div className="col-sm-7 offset-sm-3">
              <button className="btn btn-primary btn-space" type="button" onClick={() => this.saveProps()}>确定</button>
              <a className="btn btn-link btn-space" onClick={() => this.hide()}>取消</a>
            </div>
          </div>
        </div>
      </RbModal>
    )
  }

  saveProps() {
    this.state.callback(this.state)
    this.hide()
  }
}