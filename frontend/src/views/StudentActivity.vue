<template>
  <div ref="chartContainer"></div>
  <div>{{  }}</div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, onUnmounted } from 'vue'
import * as d3 from 'd3'
import { addHours, subHours } from 'date-fns'
import { Observable, from, map, of } from 'rxjs'
import { mergeMap, switchMap, scan, tap, catchError } from 'rxjs/operators'

import { addPerimeter as addUserDocumentPerimeter, getObservable as getUserDocumentObservable } from '/src/use/useUserDocument'
import { addPerimeter as addUserDocumentEventPerimeter, getObservable as getUserDocumentEventObservable } from '/src/use/useUserDocumentEvent'
import { addPerimeter as addUserGroupRelationPerimeter, getObservable as getUserGroupRelationObservable } from '/src/use/useUserGroupRelation'

const TYPE2COLOR = { 'create': 'green', 'update': 'blue', 'delete': 'red' }

const props = defineProps({
   user_uid: {
      type: String,
   },
})

const chartContainer = ref(null)
const margin = { top: 20, right: 20, bottom: 50, left: 40 }

let svg, x, y, xAxis, yAxis, barsGroup

const perimeters = []
let events = []


// async function getUserDocumentObservable(user_uid: string) {
//    const userDocumentPerimeter = await addUserDocumentPerimeter({ user_uid })
//    perimeters.push(userDocumentPerimeter)
//    return userDocumentPerimeter.observable
// }

// async function getUserDocumentEventObservable(document_uid: string) {
//    const userDocumentEventPerimeter = await addUserDocumentEventPerimeter({ document_uid })
//    perimeters.push(userDocumentEventPerimeter)
//    return userDocumentEventPerimeter.observable
// }

function studentEventsObservable(user_uid: string) {
   return getUserDocumentObservable({ user_uid }).pipe(
      tap(documents => console.log('[DEBUG] new document list:', documents)),
      switchMap(documents =>
         from(documents).pipe(
            mergeMap(document =>
               getUserDocumentEventObservable({ document_uid: document.uid }).pipe(
                  map(events => ({ document, events }))
               ),
            ),
            scan((acc, curr) => [...acc, curr], []) // acc is reset on new switchMap
         )
      ),

      catchError(err => {
         console.error('[ERROR in pipe]', err)
         return of(null)
      })
   )
}

function studentGroupSlotObservable(user_uid: string) {
   return getUserGroupRelationObservable({ user_uid }).pipe(
      tap(userGroupRelations => console.log('[DEBUG] new user group relation list:', userGroupRelations)),
   )
}


onMounted(() => {
   const userDocumentEventObservable = from(studentEventsObservable(props.user_uid))
   userDocumentEventObservable.subscribe(eventGroups => {
      console.log('eventGroups', eventGroups)
      events = []
      for (const eventGroup of eventGroups) {
         for (const ev of eventGroup.events) {
            events.push({
               document,
               start: ev.start,
               end: ev.end || ev.start,
               value: 20,
               color: TYPE2COLOR[ev.type],
            })
         }
      }
      console.log('events', events)
      drawChart(events)
   })



   const resizeObserver = new ResizeObserver(() => {
      drawChart(events)
   })

   resizeObserver.observe(chartContainer.value)

   onBeforeUnmount(() => {
      resizeObserver.disconnect()
   })
})

onUnmounted(async () => {
   for (const perimeter of perimeters) {
      await perimeter.remove()
   }
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
      .domain([subHours(new Date(dateMin), 1), addHours(new Date(dateMax), 1)])
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
      .on('click', (event, d) => displayData(d))

   eventRects.exit().remove()
}

function displayData(data) {
   console.log('data', data)
}
</script>
