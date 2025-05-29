<template>
  <div ref="chartContainer" style="width: 100%; height: 400px;"></div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as d3 from 'd3'

const chartContainer = ref(null)

onMounted(() => {
  let svg, x, y, xAxis, yAxis, barsGroup

  const data = [
    { label: 'Jan', value: 30 },
    { label: 'Feb', value: 50 },
    { label: 'Mar', value: 45 },
    { label: 'Apr', value: 60 },
    { label: 'May', value: 40 },
    { label: 'Jun', value: 70 },
    { label: 'Jul', value: 55 },
    { label: 'Aug', value: 30 },
    { label: 'Sep', value: 50 },
    { label: 'Oct', value: 45 },
    { label: 'Nov', value: 60 },
    { label: 'Dec', value: 40 }
  ]

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

    x = d3.scaleBand()
      .domain(data.map(d => d.label))
      .range([margin.left, width - margin.right])
      .padding(0.1)

    y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.value)]).nice()
      .range([height - margin.bottom, margin.top])

    xAxis = svg.append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x))

    yAxis = svg.append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(y))

    barsGroup = svg.append('g').attr('class', 'bars')
    drawBars(x)

    svg.call(
      d3.zoom()
        .scaleExtent([1, 5])
        .translateExtent([[margin.left, 0], [width - margin.right, height]])
        .on('zoom', zoomed)
    )
  }

  function drawBars(xScale) {
    const bars = barsGroup.selectAll('rect')
      .data(data, d => d.label)

    bars.enter()
      .append('rect')
      .merge(bars)
      .attr('x', d => xScale(d.label))
      .attr('y', d => y(d.value))
      .attr('width', xScale.bandwidth())
      .attr('height', d => y(0) - y(d.value))
      .attr('fill', 'steelblue')

    bars.exit().remove()
  }

  function zoomed(event) {
    const transform = event.transform
    const newRange = x.range().map(d => transform.applyX(d))

    const newX = d3.scaleBand()
      .domain(x.domain())
      .range(newRange)
      .padding(0.1)

    xAxis.call(d3.axisBottom(newX))
    drawBars(newX)
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
