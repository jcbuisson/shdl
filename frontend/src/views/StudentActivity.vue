<template>
  <div ref="chartContainer" style="width: 100%; height: 400px;"></div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as d3 from 'd3'

const chartContainer = ref(null)

onMounted(() => {
  let svg, x, y, xAxis, yAxis, bgBarsGroup, barsGroup

  // Helper: parse ISO month string to Date
  const parseDate = d3.timeParse('%Y-%m')

  const data1 = [
    { date: parseDate('2023-01'), value: 30 },
    { date: parseDate('2023-02'), value: 50 },
    { date: parseDate('2023-03'), value: 45 },
    { date: parseDate('2023-04'), value: 60 },
    { date: parseDate('2023-05'), value: 40 },
    { date: parseDate('2023-06'), value: 70 },
    { date: parseDate('2023-07'), value: 55 },
    { date: parseDate('2023-08'), value: 30 },
    { date: parseDate('2023-09'), value: 50 },
    { date: parseDate('2023-10'), value: 45 },
    { date: parseDate('2023-11'), value: 60 },
    { date: parseDate('2023-12'), value: 40 }
  ]

  const data2 = data1.map(d => ({
    date: new Date(d.date),
    value: d.value * 0.7 + 10 // simulate alternate series
  }))

  const margin = { top: 20, right: 20, bottom: 50, left: 40 }

  function drawChart() {
    const containerWidth = chartContainer.value.clientWidth
    const width = containerWidth
    const height = 400

    d3.select(chartContainer.value).selectAll('*').remove()

    svg = d3.select(chartContainer.value)
      .append('svg')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')

    const allDates = data1.map(d => d.date)
    const dateMin = d3.min(allDates)
    const dateMax = d3.max(allDates)

    x = d3.scaleTime()
      .domain([d3.timeMonth.offset(dateMin, -0.5), d3.timeMonth.offset(dateMax, 0.5)])
      .range([margin.left, width - margin.right])

    y = d3.scaleLinear()
      .domain([0, d3.max([...data1, ...data2], d => d.value)]).nice()
      .range([height - margin.bottom, margin.top])

    xAxis = svg.append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).ticks(d3.timeMonth.every(1)).tickFormat(d3.timeFormat('%b')))

    yAxis = svg.append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(y))

    bgBarsGroup = svg.append('g').attr('class', 'background-bars')
    barsGroup = svg.append('g').attr('class', 'main-bars')

    drawBars(x)

    svg.call(
      d3.zoom()
        .scaleExtent([1, 5])
        .translateExtent([[margin.left, 0], [width - margin.right, height]])
        .on('zoom', zoomed)
    )
  }

  function drawBars(xScale) {
    const barWidth = (xScale(d3.timeMonth.offset(data1[1].date, 0)) - xScale(data1[0].date)) * 0.8
    const fgWidth = barWidth * 0.4
    const bgWidth = barWidth * 0.4

    // Background bars
    const bgBars = bgBarsGroup.selectAll('rect')
      .data(data2, d => d.date)

    bgBars.enter()
      .append('rect')
      .merge(bgBars)
      .attr('x', d => xScale(d.date) - bgWidth)
      .attr('y', d => y(d.value))
      .attr('width', bgWidth)
      .attr('height', d => y(0) - y(d.value))
      .attr('fill', '#ddd')

    bgBars.exit().remove()

    // Foreground bars
    const fgBars = barsGroup.selectAll('rect')
      .data(data1, d => d.date)

    fgBars.enter()
      .append('rect')
      .merge(fgBars)
      .attr('x', d => xScale(d.date))
      .attr('y', d => y(d.value))
      .attr('width', fgWidth)
      .attr('height', d => y(0) - y(d.value))
      .attr('fill', 'steelblue')

    fgBars.exit().remove()
  }

  function zoomed(event) {
    const transform = event.transform
    const zx = transform.rescaleX(x)

    xAxis.call(d3.axisBottom(zx).ticks(d3.timeMonth.every(1)).tickFormat(d3.timeFormat('%b')))
    drawBars(zx)
  }

  drawChart()

  const resizeObserver = new ResizeObserver(() => {
    drawChart()
  })

  resizeObserver.observe(chartContainer.value)

  onBeforeUnmount(() => {
    resizeObserver.disconnect()
  })
})
</script>
