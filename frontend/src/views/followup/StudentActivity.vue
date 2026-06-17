<template>
   <div class="activity-view">
      <div class="activity-toolbar">
         <div class="activity-title">Activité</div>
         <div class="activity-legend">
            <span class="legend-item"><span class="legend-swatch slot"></span>Séance</span>
            <span v-for="item in eventLegend" :key="item.type" class="legend-item">
               <span class="legend-swatch" :style="{ backgroundColor: item.color }"></span>{{ item.label }}
            </span>
         </div>
      </div>

      <div ref="chartContainer" class="chart-container">
         <div v-if="isEmpty" class="empty-state">Aucune activité à afficher</div>
      </div>
      <div ref="tooltip" class="tooltip"></div>
   </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, onUnmounted, computed, watch } from 'vue'
import * as d3 from 'd3'
import { timeFormatLocale } from 'd3-time-format'
import { addHours, subHours } from 'date-fns'
import { map, combineLatest } from 'rxjs'
import { switchMap } from 'rxjs/operators'

import useExpressXClient from '/src/use/useExpressXClient'

import { useUserDocument } from '/src/use/useUserDocument'
import { useUserDocumentEvent } from '/src/use/useUserDocumentEvent'
import { useUserGroupRelation } from '/src/use/useUserGroupRelation'
import { useGroupSlot } from '/src/use/useGroupSlot'
import { useBusinessObservables } from '/src/use/useBusinessObservables'

const { app } = useExpressXClient()
const { getObservable: userDocument$ } = useUserDocument(app)
const { getObservable: userDocumentEvent$ } = useUserDocumentEvent(app)
const { getObservable: groupSlot$ } = useGroupSlot(app)
const { getObservable: userGroupRelation$ } = useUserGroupRelation(app)
const { guardCombineLatest } = useBusinessObservables(app)

const EVENT_TYPES = [
   { type: 'create', label: 'Création', color: '#2e7d32' },
   { type: 'edit', label: 'Modification', color: '#1565c0' },
   { type: 'update', label: 'Modification', color: '#1565c0' },
   { type: 'pass_test', label: 'Test réussi', color: '#6a1b9a' },
   { type: 'delete', label: 'Suppression', color: '#c62828' },
]

const EVENT_TYPE_BY_UID = new Map(EVENT_TYPES.map(type => [type.type, type]))
const eventLegend = EVENT_TYPES.filter((type, index, list) =>
   list.findIndex(item => item.label === type.label && item.color === type.color) === index
)

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
                  'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'],
})

const monthFormat = frLocale.format('%b %y')
const dayFormat = frLocale.format('%a %d %b')
const hourFormat = frLocale.format('%H:%M')
const tooltipDateFormat = frLocale.format('%a %d %b %Y, %H:%M')

const props = defineProps({
   user_uid: {
      type: String,
   },
})

const chartContainer = ref<HTMLElement | null>(null)
const tooltip = ref<HTMLElement | null>(null)
const margin = { top: 28, right: 28, bottom: 46, left: 116 }
const height = 430
const slotLane = { y: 72, height: 64 }
const eventLane = { y: 192, rowHeight: 30 }

let svg, xScale, xAxis, slotsGroup, eventsGroup, gridGroup
let resizeObserver: ResizeObserver | null = null
let subscription

function studentEvents$(user_uid: string) {
   return userDocument$({ user_uid }).pipe(
      switchMap(documentList =>
         guardCombineLatest(
            documentList.map(doc =>
               userDocumentEvent$({ document_uid: doc.uid }).pipe(
                  map(events => ({ document: doc, events }))
               )
            )
         )
      ),
   )
}

function studentSlot$(user_uid: string) {
   return userGroupRelation$({ user_uid }).pipe(
      switchMap(relationList =>
         guardCombineLatest(
            relationList.map(relation =>
               groupSlot$({ group_uid: relation.group_uid })
            )
         )
      ),
   )
}

const slotsAndEventGroups = ref()

watch(
   () => props.user_uid,
   (user_uid) => {
      subscription?.unsubscribe()
      if (!user_uid) return

      subscription = combineLatest([studentSlot$(user_uid), studentEvents$(user_uid)]).subscribe(list => {
         slotsAndEventGroups.value = list
      })
   },
   { immediate: true },
)

const userSlotsAndEvents = computed(() => {
   if (!slotsAndEventGroups.value) return { slots: [], events: [] }
   const [slotGroups, eventGroups] = slotsAndEventGroups.value

   const events = eventGroups.flatMap(eventGroup =>
      eventGroup.events.map(ev => {
         const type = EVENT_TYPE_BY_UID.get(ev.type) ?? { label: ev.type, color: '#455a64' }
         return {
            name: eventGroup.document.name,
            type: ev.type,
            typeLabel: type.label,
            start: ev.start,
            end: ev.end || ev.start,
            color: type.color,
         }
      })
   )

   const slots = slotGroups.flatMap(slotGroup =>
      slotGroup.map(slot => ({
         name: slot.name,
         start: slot.start,
         end: slot.end,
      }))
   )

   return {
      slots: slots.sort((slot1, slot2) => new Date(slot1.start).getTime() - new Date(slot2.start).getTime()),
      events: events.sort((event1, event2) => new Date(event1.start).getTime() - new Date(event2.start).getTime()),
   }
})

const isEmpty = computed(() =>
   userSlotsAndEvents.value.slots.length === 0 && userSlotsAndEvents.value.events.length === 0
)

watch(
   () => userSlotsAndEvents.value,
   ({ slots, events }) => {
      drawChart(slots, events)
   },
)

onMounted(() => {
   resizeObserver = new ResizeObserver(() => {
      drawChart(userSlotsAndEvents.value.slots, userSlotsAndEvents.value.events)
   })

   if (chartContainer.value) {
      resizeObserver.observe(chartContainer.value)
      drawChart(userSlotsAndEvents.value.slots, userSlotsAndEvents.value.events)
   }

   onBeforeUnmount(() => {
      resizeObserver?.disconnect()
   })
})

onUnmounted(() => {
   subscription?.unsubscribe()
})

function drawChart(slots, events) {
   if (!chartContainer.value) return

   d3.select(chartContainer.value).selectAll('svg').remove()
   hideTooltip()

   if (slots.length === 0 && events.length === 0) return

   const width = Math.max(chartContainer.value.clientWidth, 720)

   svg = d3.select(chartContainer.value)
      .append('svg')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMinYMin meet')
      .attr('class', 'activity-svg')

   const allStart = [...events, ...slots].map(d => new Date(d.start))
   const allEnd = [...events, ...slots].map(d => new Date(d.end))
   const dateMin = d3.min(allStart)
   const dateMax = d3.max(allEnd)

   if (!dateMin || !dateMax) return

   xScale = d3.scaleTime()
      .domain([subHours(dateMin, 12), addHours(dateMax, 12)])
      .range([margin.left, width - margin.right])

   svg.append('rect')
      .attr('x', margin.left)
      .attr('y', margin.top)
      .attr('width', width - margin.left - margin.right)
      .attr('height', height - margin.top - margin.bottom)
      .attr('fill', '#fafafa')

   gridGroup = svg.append('g').attr('class', 'grid')
   xAxis = svg.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${height - margin.bottom})`)

   svg.append('text')
      .attr('class', 'lane-label')
      .attr('x', margin.left - 14)
      .attr('y', slotLane.y + slotLane.height / 2 + 5)
      .attr('text-anchor', 'end')
      .text('Séances')

   svg.append('text')
      .attr('class', 'lane-label')
      .attr('x', margin.left - 14)
      .attr('y', eventLane.y + 48)
      .attr('text-anchor', 'end')
      .text('Documents')

   slotsGroup = svg.append('g').attr('class', 'slot-layer')
   eventsGroup = svg.append('g').attr('class', 'event-layer')

   redraw(xScale, slots, events, 1)

   svg.call(
      d3.zoom()
         .scaleExtent([1, 120])
         .translateExtent([[margin.left, 0], [width - margin.right, height]])
         .extent([[margin.left, margin.top], [width - margin.right, height - margin.bottom]])
         .on('zoom', (e) => {
            const newXScale = e.transform.rescaleX(xScale)
            redraw(newXScale, slots, events, e.transform.k)
         })
   )
}

function redraw(scale, slots, events, zoomScale) {
   drawGrid(scale, zoomScale)
   drawSlots(scale, slots, zoomScale)
   drawEvents(scale, events)
}

function axisForZoom(scale, zoomScale) {
   if (zoomScale < 2) return d3.axisBottom(scale).ticks(d3.timeMonth.every(1)).tickFormat(monthFormat)
   if (zoomScale < 5) return d3.axisBottom(scale).ticks(d3.timeDay.every(5)).tickFormat(dayFormat)
   if (zoomScale < 16) return d3.axisBottom(scale).ticks(d3.timeDay.every(1)).tickFormat(dayFormat)
   if (zoomScale < 36) return d3.axisBottom(scale).ticks(d3.timeHour.every(6)).tickFormat(hourFormat)
   return d3.axisBottom(scale).ticks(d3.timeHour.every(1)).tickFormat(hourFormat)
}

function drawGrid(scale, zoomScale) {
   xAxis.call(axisForZoom(scale, zoomScale))

   gridGroup
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(
         axisForZoom(scale, zoomScale)
            .tickSize(-(height - margin.top - margin.bottom))
            .tickFormat(() => '')
      )

   gridGroup.select('.domain').remove()
}

function drawSlots(scale, slots, zoomScale) {
   const slotRects = slotsGroup.selectAll('rect')
      .data(slots, d => `${d.name}-${d.start}-${d.end}`)

   slotRects.enter()
      .append('rect')
      .merge(slotRects)
      .attr('x', d => scale(new Date(d.start)))
      .attr('y', slotLane.y)
      .attr('rx', 4)
      .attr('width', d => Math.max(2, scale(new Date(d.end)) - scale(new Date(d.start))))
      .attr('height', slotLane.height)
      .attr('fill', '#6b7280')
      .attr('opacity', 0.72)
      .on('mouseover', (event, d) => showTooltip(event, slotTooltip(d)))
      .on('mousemove', (event, d) => showTooltip(event, slotTooltip(d)))
      .on('mouseout', hideTooltip)

   slotRects.exit().remove()

   const slotLabels = slotsGroup.selectAll('text')
      .data(slots, d => `${d.name}-${d.start}-${d.end}`)

   slotLabels.enter()
      .append('text')
      .merge(slotLabels)
      .attr('x', d => scale(new Date(d.start)) + (zoomScale < 5 ? 5 : 10))
      .attr('y', slotLane.y + 24)
      .attr('fill', '#fff')
      .attr('font-size', zoomScale < 5 ? '10px' : '12px')
      .attr('font-weight', 600)
      .text(d => d.name)

   slotLabels.exit().remove()
}

function drawEvents(scale, events) {
   const eventRows = ['create', 'edit', 'update', 'pass_test', 'delete']
   const yForEvent = (d) => {
      const rowIndex = eventRows.includes(d.type) ? eventRows.indexOf(d.type) : eventRows.length
      return eventLane.y + rowIndex * eventLane.rowHeight + 12
   }

   const stems = eventsGroup.selectAll('line')
      .data(events, d => `${d.name}-${d.type}-${d.start}`)

   stems.enter()
      .append('line')
      .merge(stems)
      .attr('x1', d => scale(new Date(d.start)))
      .attr('x2', d => scale(new Date(d.start)))
      .attr('y1', d => yForEvent(d) - 10)
      .attr('y2', d => yForEvent(d) + 10)
      .attr('stroke', d => d.color)
      .attr('stroke-width', 2)
      .attr('opacity', 0.5)

   stems.exit().remove()

   const markers = eventsGroup.selectAll('circle')
      .data(events, d => `${d.name}-${d.type}-${d.start}`)

   markers.enter()
      .append('circle')
      .merge(markers)
      .attr('cx', d => scale(new Date(d.start)))
      .attr('cy', d => yForEvent(d))
      .attr('r', 6)
      .attr('fill', d => d.color)
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .on('mouseover', (event, d) => showTooltip(event, eventTooltip(d)))
      .on('mousemove', (event, d) => showTooltip(event, eventTooltip(d)))
      .on('mouseout', hideTooltip)

   markers.exit().remove()
}

function slotTooltip(slot) {
   return `${slot.name}\n${tooltipDateFormat(new Date(slot.start))} - ${tooltipDateFormat(new Date(slot.end))}`
}

function eventTooltip(event) {
   return `${event.name}\n${event.typeLabel}\n${tooltipDateFormat(new Date(event.start))}`
}

function showTooltip(event, text) {
   if (!tooltip.value) return
   tooltip.value.textContent = text
   tooltip.value.style.left = `${event.clientX + 12}px`
   tooltip.value.style.top = `${event.clientY + 12}px`
   tooltip.value.style.display = 'block'
}

function hideTooltip() {
   if (!tooltip.value) return
   tooltip.value.style.display = 'none'
}
</script>

<style scoped>
.activity-view {
   position: relative;
   display: flex;
   flex-direction: column;
   gap: 10px;
   padding: 16px;
   min-height: 480px;
}

.activity-toolbar {
   display: flex;
   align-items: center;
   justify-content: space-between;
   gap: 16px;
   flex-wrap: wrap;
}

.activity-title {
   font-size: 18px;
   font-weight: 600;
   color: #1f2937;
}

.activity-legend {
   display: flex;
   align-items: center;
   gap: 12px;
   flex-wrap: wrap;
   color: #374151;
   font-size: 12px;
}

.legend-item {
   display: inline-flex;
   align-items: center;
   gap: 6px;
}

.legend-swatch {
   width: 10px;
   height: 10px;
   border-radius: 50%;
   display: inline-block;
}

.legend-swatch.slot {
   border-radius: 2px;
   background: #6b7280;
}

.chart-container {
   position: relative;
   width: 100%;
   min-height: 430px;
   overflow-x: auto;
}

.empty-state {
   display: flex;
   align-items: center;
   justify-content: center;
   height: 320px;
   color: #6b7280;
   border: 1px dashed #d1d5db;
}

.tooltip {
   position: fixed;
   z-index: 10;
   max-width: 280px;
   white-space: pre-line;
   background: rgba(17, 24, 39, 0.92);
   color: white;
   padding: 8px 10px;
   border-radius: 4px;
   display: none;
   pointer-events: none;
   font-size: 12px;
   line-height: 1.45;
}

:deep(.activity-svg text) {
   font-family: Roboto, sans-serif;
}

:deep(.lane-label) {
   fill: #4b5563;
   font-size: 12px;
   font-weight: 600;
}

:deep(.x-axis text) {
   fill: #4b5563;
   font-size: 11px;
}

:deep(.x-axis path),
:deep(.x-axis line) {
   stroke: #9ca3af;
}

:deep(.grid line) {
   stroke: #e5e7eb;
}
</style>
