<template>
  <div ref="chartContainer"></div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, onUnmounted } from 'vue'
import * as d3 from 'd3'

import { addPerimeter as addUserGroupRelationPerimeter } from '/src/use/useUserGroupRelation'

import { app } from '/src/client-app.js'

const TYPE2COLOR = { 'create': 'green', 'update': 'blue', 'delete': 'red' }

const props = defineProps({
   user_uid: {
      type: String,
   },
})

const chartContainer = ref(null)
const margin = { top: 20, right: 20, bottom: 50, left: 40 }

let svg, x, y, xAxis, yAxis, barsGroup
let events = []

onMounted(async () => {

   // user_document data is not cached due to its potential large size
   const userDocumentWithEvents = await app.service('user_document').findMany({
      where: {
         user_uid: props.user_uid,
      },
      include: {
         user_document_events: true,
      },
   })

   const userDocumentEvents = userDocumentWithEvents.reduce((accu, doc) => accu.concat(doc.user_document_events), [])

   // let userGroupRelationPerimeter
   // const userGroups = ref([])

   // if (userGroupRelationPerimeter) await userGroupRelationPerimeter.remove()
   // userGroupRelationPerimeter = await addUserGroupRelationPerimeter({ user_uid: props.user_uid }, (relationList) => {
   //    userGroups.value = relationList.map(relation => relation.group_uid)
   // })


   events = userDocumentEvents.map(ev => ({
      name: 'xxx',
      start: ev.start,
      end: ev.end || ev.start,
      value: 20,
      color: TYPE2COLOR[ev.type],
   }))

   // events = userGroups.value.map(ev => ({
   //    name: 'xxx',
   //    start: ev.start,
   //    end: ev.end || ev.start,
   //    value: 20,
   //    color: TYPE2COLOR[ev.type],
   // }))

   drawChart(events)

   const resizeObserver = new ResizeObserver(() => {
      drawChart(events)
   })

   resizeObserver.observe(chartContainer.value)

   onBeforeUnmount(() => {
      resizeObserver.disconnect()
   })

   onUnmounted(() => {
      // userGroupRelationPerimeter && userGroupRelationPerimeter.remove()
   })
})


function drawChart(events) {
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

   // x = d3.scaleTime()
   //    .domain([d3.timeMonth.offset(dateMin, -0.5), d3.timeMonth.offset(dateMax, 0.5)])
   //    .range([margin.left, width - margin.right])

   // y = d3.scaleLinear()
   //    .domain([0, d3.max([...events], d => d.value)]).nice()
   //    .range([height - margin.bottom, margin.top])

   x = d3.scaleUtc()
      .domain([new Date(dateMin), new Date(dateMax)])
      .range([margin.left, width - margin.right])

   y = d3.scaleLinear()
      .domain([0, 100])
      .range([height - margin.bottom, margin.top])

   xAxis = svg.append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      // .call(d3.axisBottom(x).ticks(d3.timeMonth.every(1)).tickFormat(d3.timeFormat('%b')))
      .call(d3.axisBottom(x))

   yAxis = svg.append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(y))

   barsGroup = svg.append('g').attr('class', 'main-bars')

   drawBars(x, events)

   svg.call(
      d3.zoom()
      .scaleExtent([1, 50])
      .translateExtent([[margin.left, 0], [width - margin.right, height]])
      .on('zoom', (e) => {
         const transform = e.transform
         const zx = transform.rescaleX(x)
         // xAxis.call(d3.axisBottom(zx).ticks(d3.timeMonth.every(1)).tickFormat(d3.timeFormat('%b')))
         xAxis.call(d3.axisBottom(zx))
         drawBars(zx, events)
      })
   )
}

function drawBars(xScale, events) {
   const eventRects = barsGroup.selectAll('rect')
      .data(events, d => d)

   eventRects.enter()
      .append('rect')
      .merge(eventRects)
      .attr('x', d => xScale(new Date(d.start)))
      .attr('width', d => {
         const w = Math.max(1, xScale(new Date(d.end)) - xScale(new Date(d.start)))
         return w
      })
      .attr('y', d => y(d.value)) // or use a fixed row layout like `margin.top + i * (barHeight + spacing)`
      .attr('height', d => y(0) - y(d.value))
      .attr('fill', d => d.color)
      // .on('mouseover', (event, d) => showTooltip(event, d))
      // .on('mousemove', (event, d) => showTooltip(event, d))
      // .on('mouseout', hideTooltip)

   eventRects.exit().remove()
}
</script>
