<template>
  <div ref="chartContainer"></div>

   <!-- <div>userSlotsAndEvents: {{ userSlotsAndEvents }}</div> -->

   <v-tooltip v-model="show" text="azer">
      <span>Programmatic tooltip</span>
   </v-tooltip>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, onUnmounted, computed, watch } from 'vue'
import * as d3 from 'd3'
import { timeFormatLocale } from 'd3-time-format'
import { addHours, subHours } from 'date-fns'
import { Observable, from, map, of, merge, combineLatest } from 'rxjs'
import { mergeMap, switchMap, scan, tap, catchError } from 'rxjs/operators'
import { useObservable } from '@vueuse/rxjs'

import { getObservable as userDocument$ } from '/src/use/useUserDocument'
import { getObservable as userDocumentEvent$ } from '/src/use/useUserDocumentEvent'
import { getObservable as userGroupRelation$ } from '/src/use/useUserGroupRelation'
import { getObservable as groupSlot$ } from '/src/use/useGroupSlot'

const TYPE2COLOR = { 'create': 'green', 'update': 'blue', 'delete': 'red' }

const frLocale = timeFormatLocale({
   dateTime: '%A %e %B %Y à %X',
   date: '%d/%m/%Y',
   time: '%H:%M:%S',
   periods: ['AM', 'PM'],
   days: ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'],
   shortDays: ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'],
   months: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
            'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
   shortMonths: ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin',
                  'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
})

const dayFormat = frLocale.format('%a %d %b') // e.g., "mardi 04 juin"
const hourFormat = frLocale.format('%H:%M') // e.g., "10:00"

const props = defineProps({
   user_uid: {
      type: String,
   },
})

const chartContainer = ref(null)
const margin = { top: 20, right: 20, bottom: 50, left: 40 }

let svg, xScale, yScale, xAxis, yAxis, slotsGroup, eventsGroup

const perimeters = []


function studentEvents$(user_uid: string) {
   return userDocument$({ user_uid }).pipe(
      switchMap(documents =>
         // from: flattens array of documents into single emissions
         from(documents).pipe(
            mergeMap(document =>
               userDocumentEvent$({ document_uid: document.uid }).pipe(
                  map(events => ({ document, events }))
               ),
            ),
            scan((acc, curr) => [...acc, curr], []) // acc is reset on new switchMap
         )
      ),
   )
}

function studentSlot$(user_uid: string) {
   return userGroupRelation$({ user_uid }).pipe(
      switchMap(relations =>
         // from: flattens array of relations into single emissions
         from(relations).pipe(
            // each relation is replaced by the slot list associated to relation.group_uid
            mergeMap(relation => groupSlot$({ group_uid: relation.group_uid })),
            scan((acc, slots) => [...acc, ...slots], []) // acc is reset on new switchMap
         )
      )
   )
}

const slots$ = studentSlot$(props.user_uid)
const eventGroups$ = studentEvents$(props.user_uid)

const slotsAndEventGroups = useObservable(combineLatest(slots$, eventGroups$))

const userSlotsAndEvents = computed(() => {
   if (!slotsAndEventGroups.value) return
   const [userSlots, eventGroups] = slotsAndEventGroups.value
   const events = []
   for (const eventGroup of eventGroups) {
      for (const ev of eventGroup.events) {
         events.push({
            name: eventGroup.document.name,
            start: ev.start,
            end: ev.end || ev.start,
            value: 7,
            color: TYPE2COLOR[ev.type],
         })
      }
   }
   const slots = []
   for (const slot of userSlots) {
      slots.push({
         name: slot.name,
         start: slot.start,
         end: slot.end,
         value: 10,
         color: 'grey',
      })
   }
   return {slots, events}
})

watch(() => userSlotsAndEvents.value, async () => {
   if (!userSlotsAndEvents.value) return
   drawChart(userSlotsAndEvents.value.slots, userSlotsAndEvents.value.events)
})

onMounted(() => {

   const resizeObserver = new ResizeObserver(() => {
      if (!userSlotsAndEvents.value) return
      drawChart(userSlotsAndEvents.value.slots, userSlotsAndEvents.value.events)
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

function drawChart(slots, events) {
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

   xScale = d3.scaleTime()
      .domain([subHours(new Date(dateMin), 24), addHours(new Date(dateMax), 24)])
      .range([margin.left, width - margin.right])

   yScale = d3.scaleLinear()
      .domain([0, 10])
      .range([height - margin.bottom, margin.top])

   xAxis = svg.append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(xScale).ticks(d3.timeDay.every(1)).tickFormat(dayFormat))

   yAxis = svg.append('g')
      .attr('transform', `translate(${margin.left},0)`)
      // .call(d3.axisLeft(yScale))

   slotsGroup = svg.append('g').attr('class', 'main-slots')
   eventsGroup = svg.append('g').attr('class', 'main-bars')

   drawSlots(xScale, slots, 1.)
   drawBars(xScale, events)

   svg.call(
      d3.zoom()
      .scaleExtent([1, 50])
      .translateExtent([[margin.left, 0], [width - margin.right, height]])
      .on('zoom', (e) => {
         const transform = e.transform
         const newXScale = transform.rescaleX(xScale)
         const zoomScale = e.transform.k
         xAxis.call(zoomScale < 5 ?
            d3.axisBottom(newXScale).ticks(d3.timeDay.every(1)).tickFormat(dayFormat) :
            d3.axisBottom(newXScale).ticks(d3.timeHour.every(1)).tickFormat(hourFormat))
         drawSlots(newXScale, slots, zoomScale)
         drawBars(newXScale, events)
      })
   )
}

function drawBars(xScale, events) {
   const eventRects = eventsGroup.selectAll('rect')
      .data(events, d => d)

   eventRects.enter()
      .append('rect')
      .merge(eventRects)
      .attr('x', d => xScale(new Date(d.start)))
      .attr('y', d => yScale(d.value)) // or use a fixed row layout like `margin.top + i * (barHeight + spacing)`
      .attr('width', d => Math.max(1, xScale(new Date(d.end)) - xScale(new Date(d.start))))
      .attr('height', d => yScale(0) - yScale(d.value))
      .attr('fill', d => d.color)
      // .on('mouseover', (event, d) => showTooltip(event, d))
      // .on('mousemove', (event, d) => showTooltip(event, d))
      // .on('mouseout', hideTooltip)
      .on('click', (event, d) => displayData(d))

   eventRects.exit().remove()
}

function drawSlots(xScale, slots, zoomScale) {
   const slotRects = slotsGroup.selectAll('rect')
      .data(slots, d => d)

   slotRects.enter()
      .append('rect')
      .merge(slotRects)
      .attr('x', d => xScale(new Date(d.start)))
      .attr('y', d => yScale(d.value)) // or use a fixed row layout like `margin.top + i * (barHeight + spacing)`
      .attr('width', d => Math.max(1, xScale(new Date(d.end)) - xScale(new Date(d.start))))
      .attr('height', d => yScale(0) - yScale(d.value))
      .attr('fill', d => d.color)
      // .on('mouseover', (event, d) => showTooltip(event, d))
      // .on('mousemove', (event, d) => showTooltip(event, d))
      // .on('mouseout', hideTooltip)
      .on('click', (event, d) => displayData(d))

   slotRects.exit().remove()

   // Labels
   const slotLabels = slotsGroup.selectAll('text')
      .data(slots, d => d)

   slotLabels.enter()
      .append('text')
      .merge(slotLabels)
      .attr('x', d => xScale(new Date(d.start)) + (zoomScale < 5 ? 2 : 10))  // padding
      .attr('y', d => yScale(d.value) + (zoomScale < 5 ? 12 : 20))
      .text(d => d.name)
      .attr('fill', 'white')
      .attr('font-size', zoomScale < 5 ? '10px' : '16px')

   slotLabels.exit().remove()
}

function displayData(data) {
   console.log('data', data)
   show.value = true
}

const show = ref(false)
</script>
