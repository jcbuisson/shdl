<template>
  <div ref="chartContainer"></div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as d3 from 'd3'

const chartContainer = ref(null)

onMounted(() => {
   let svg, x, y, xAxis, yAxis, barsGroup

   const events = [
      {
         name: 'Event A',
         start: new Date('2023-01-10'),
         end: new Date('2023-01-20'),
         value: 30,
         color: 'steelblue',
      },
      {
         name: 'Event B',
         start: new Date('2023-02-01'),
         end: new Date('2023-02-18'),
         value: 50,
         color: 'green',
      },
      {
         name: 'Event C',
         start: new Date('2023-03-05'),
         end: new Date('2023-03-15'),
         value: 45,
         color: 'purple',
      }
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

      const allStart = events.map(d => d.start)
      const allEnd = events.map(d => d.end)
      const dateMin = d3.min(allStart)
      const dateMax = d3.max(allEnd)

      x = d3.scaleTime()
         .domain([d3.timeMonth.offset(dateMin, -0.5), d3.timeMonth.offset(dateMax, 0.5)])
         .range([margin.left, width - margin.right])

      y = d3.scaleLinear()
         .domain([0, d3.max([...events], d => d.value)]).nice()
         .range([height - margin.bottom, margin.top])

      xAxis = svg.append('g')
         .attr('transform', `translate(0,${height - margin.bottom})`)
         .call(d3.axisBottom(x).ticks(d3.timeMonth.every(1)).tickFormat(d3.timeFormat('%b')))

      yAxis = svg.append('g')
         .attr('transform', `translate(${margin.left},0)`)
         .call(d3.axisLeft(y))

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
      const eventRects = barsGroup.selectAll('rect')
         .data(events, d => d)

      eventRects.enter()
         .append('rect')
         .merge(eventRects)
         .attr('x', d => xScale(d.start))
         .attr('width', d => Math.max(1, xScale(d.end) - xScale(d.start)))
         .attr('y', d => y(d.value)) // or use a fixed row layout like `margin.top + i * (barHeight + spacing)`
         .attr('height', d => y(0) - y(d.value))
         .attr('fill', d => d.color)
         // .on('mouseover', (event, d) => showTooltip(event, d))
         // .on('mousemove', (event, d) => showTooltip(event, d))
         // .on('mouseout', hideTooltip)

      eventRects.exit().remove()
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
