<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Ticket List</ion-title>
      </ion-toolbar>

      <!-- Filter Tabs -->
      <ion-toolbar>
        <ion-segment v-model="filter">
          <ion-segment-button value="all">
            <ion-label>All</ion-label>
          </ion-segment-button>
          <ion-segment-button value="lms">
            <ion-label>LMS</ion-label>
          </ion-segment-button>
          <ion-segment-button value="non-lms">
            <ion-label>Non-LMS</ion-label>
          </ion-segment-button>
          <ion-segment-button value="untagged">
            <ion-label>Untagged</ion-label>
          </ion-segment-button>
          <ion-segment-button value="instances">
            <ion-label>Other Instances</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>

      <!-- Search and Sorting Dropdown -->
      <ion-toolbar>
        <ion-searchbar
          v-model="searchQuery"
          placeholder="Search tickets..."
          debounce="300"
          show-clear-button="focus"
        ></ion-searchbar>
        <ion-select v-model="selectedSort" slot="end" interface="popover">
          <ion-select-option value="newest">Newest First</ion-select-option>
          <ion-select-option value="oldest">Oldest First</ion-select-option>
        </ion-select>
      </ion-toolbar>

      <!-- Status Filter Dropdown -->
      <ion-toolbar>
        <ion-segment v-model="statusFilter">
          <ion-segment-button value="all">
          <ion-label>All Tickets</ion-label>
          </ion-segment-button>
          <ion-segment-button value="open">
          <ion-label>Open</ion-label>
          </ion-segment-button>
          <ion-segment-button value="overdue">
          <ion-label>Overdue</ion-label>
          </ion-segment-button>
          <ion-segment-button value="due_today">
          <ion-label>Due Today</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-refresher slot="fixed" @ionRefresh="refreshTickets">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <ion-list>
        <template v-if="filteredTicketsSorted.length">
          <ion-card
            v-for="ticket in filteredTicketsSorted"
            :key="ticket.id"
            @click="openTicket(ticket)"
          >
          <ion-card-header>
            <ion-card-title>{{ ticket.subject }}</ion-card-title>
              <ion-badge :style="getPriorityBadgeStyle(ticket.priority)">
                {{ getPriority(ticket.priority) }}
               </ion-badge>
            </ion-card-header>
          <ion-card-content>
            <p>ID: {{ ticket.id }}</p>
            <p v-if="ticket.custom_fields?.cf_lms_instance">
              Instance: {{ ticket.custom_fields.cf_lms_instance }}
            </p>
            <p>Status: {{ getStatus(ticket.status) }}</p>
            <p>Due: {{ ticket.due_by ? formatDate(ticket.due_by) : 'No due date' }}</p>
            <p v-if="ticket.type">Type: {{ ticket.type }}</p>
            <p v-if="ticket.custom_fields?.cf_ticket_type">Category: {{ ticket.custom_fields.cf_ticket_type }}</p>
            <p v-if="ticket.tags?.length">Tags: {{ ticket.tags.join(', ') }}</p>
          </ion-card-content>
        </ion-card>
      </template>
    <template v-else>
      <ion-text color="medium">
        <p>No tickets found for this filter.</p>
      </ion-text>
    </template>
  </ion-list>
      
      <!-- Export Button -->
      <ion-fab vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button @click="exportModalOpen = true">
          <ion-icon :icon="downloadOutline"></ion-icon>
        </ion-fab-button>
      </ion-fab>



<!-- Export Modal -->
<ion-modal :is-open="exportModalOpen" @didDismiss="exportModalOpen = false" :icon="downloadOutline">
  <ion-header>
    <ion-toolbar>
      <ion-title>Export Tickets</ion-title>
      <ion-buttons slot="end">
        <ion-button @click="exportModalOpen = false">Close</ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-header>
  <ion-content>
    <ion-list>
      <ion-select v-model="selectedExportOptions" multiple placeholder="Select export options">
        <ion-select-option
          v-for="option in exportOptions"
          :key="option.key"
          :value="option.key"
        >
          {{ option.label }}
        </ion-select-option>
      </ion-select>
    </ion-list>
    <ion-item>
      <ion-label>File Type</ion-label>
      <ion-select v-model="exportFileType">
        <ion-select-option value="docx">DOCX</ion-select-option>
        <ion-select-option value="csv">CSV</ion-select-option>
      </ion-select>
    </ion-item>
    <ion-list>
      <ion-label>Export Fields</ion-label>
      <ion-select v-model="selectedExportFields" multiple placeholder="Select fields to export">
        <ion-select-option v-for="field in exportFields" :key="field.key" :value="field.key">
          {{ field.label }}
        </ion-select-option>
      </ion-select>
    </ion-list>
    <ion-button expand="block" color="success" @click="handleExport">
      Download Selected Tickets
    </ion-button>
  </ion-content>
</ion-modal>
    </ion-content>
  </ion-page>
</template>

<script lang="ts" setup>
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonBadge, IonRefresher, IonRefresherContent, IonSegment, IonSegmentButton, IonLabel, IonModal,
  IonButtons, IonButton, IonItem, IonSelect, IonSelectOption, IonText, IonIcon
} from '@ionic/vue'
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'
import { fetchTickets } from '@/services/freshdesk'
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun } from 'docx'
import { downloadOutline } from 'ionicons/icons'

const route = useRoute()

interface Ticket {
  id: number
  subject: string
  status: number
  priority: number
  due_by?: string
  type?: string
  custom_fields?: {
    cf_ticket_type?: string
    cf_lms_instance?: string
    cf_district?: any
    cf_non_lms?: any
    [key: string]: any
  }
  tags?: string[]
  created_at?: string
  description_text?: string
  attachments?: Array<{
    id: number
    name: string
    content_type: string
    attachment_url: string
  }>
}

const tickets = ref<Ticket[]>([])
const filter = ref<'all' | 'lms' | 'non-lms' | 'untagged' | 'instances'>('all')
const statusFilter = ref<'all' | 'open' | 'overdue' | 'due_today'>('all')
const selectedSort = ref<'newest' | 'oldest'>('newest')
const modalOpen = ref(false)
const selectedTicket = ref<Ticket | null>(null)
const exportModalOpen = ref(false)
const exportFileType = ref<'csv' | 'docx'>('csv')

const exportOptions = [
  { label: 'All Tickets', key: 'all' },
  { label: 'LMS Tickets', key: 'lms' },
  { label: 'Non-LMS Tickets', key: 'non-lms' },
  { label: 'Untagged Tickets', key: 'untagged' },
  { label: 'Other Instances', key: 'instances' },
  { label: 'Open Tickets', key: 'open' },
  { label: 'Overdue Tickets', key: 'overdue' },
  { label: 'Due Today', key: 'due_today' }
];

const selectedExportOptions = ref<string[]>([])

const searchQuery = ref('')

const exportFields = [
  { label: 'ID', key: 'id' },
  { label: 'Subject', key: 'subject' },
  { label: 'Status', key: 'status' },
  { label: 'Priority', key: 'priority' },
  { label: 'Due Date', key: 'due_by' },
  { label: 'Type', key: 'type' },
  { label: 'Instance', key: 'instance' },
  { label: 'Created Time', key: 'created_at' },
  { label: 'Resolved Time', key: 'resolved_at' },
  { label: 'Last Update Time', key: 'updated_at' }
]
const selectedExportFields = ref(exportFields.map(f => f.key))

const escapeCSV = (text: string) => `"${text.replace(/"/g, '""')}"`

const handleExport = async () => {
  const today = new Date().toISOString().split('T')[0]
  const selected = selectedExportOptions.value
  // Removed unused 'fieldsToExport' assignment

  if (!selected.length) {
    alert("Please select at least one export option.")
    return
  }

  const exportData = tickets.value.filter(ticket => {
    const lms = ticket.custom_fields?.cf_district
    const nonLms = ticket.custom_fields?.cf_non_lms
    const instance = ticket.custom_fields?.cf_lms_instance
    const due = ticket.due_by?.split('T')[0]

    if (selected.includes('all')) return true

    const categoryMatches = [
      selected.includes('lms') && lms,
      selected.includes('non-lms') && nonLms,
      selected.includes('untagged') && !lms && !nonLms,
      selected.includes('instances') && instance
    ].some(Boolean)

    const statusMatches = [
      selected.includes('open') && ticket.status === 2,
      selected.includes('overdue') && due && due < today,
      selected.includes('due_today') && due === today
    ].some(Boolean)

    const hasCategoryFilter = ['lms', 'non-lms', 'untagged', 'instances'].some(f => selected.includes(f))
    const hasStatusFilter = ['open', 'overdue', 'due_today'].some(f => selected.includes(f))

    if (hasCategoryFilter && hasStatusFilter) {
      return categoryMatches && statusMatches
    } else if (hasCategoryFilter) {
      return categoryMatches
    } else if (hasStatusFilter) {
      return statusMatches
    }

    return false
  })

  console.log('Selected filters:', selected)
  console.log('Filtered Export Data:', exportData)

  if (!exportData.length) {
    alert("No tickets match the selected export filters.")
    return
  }

  const filename = `tickets_export_${Date.now()}`

  if (exportFileType.value === 'csv') {
    const headers = ['ID', 'Subject', 'Status', 'Priority', 'Due Date', 'Type', 'Instance']
    const rows = exportData.map(ticket => [
      ticket.id,
      escapeCSV(ticket.subject || ''),
      getStatus(ticket.status),
      getPriority(ticket.priority),
      ticket.due_by || '',
      escapeCSV(ticket.type || ''),
      escapeCSV(ticket.custom_fields?.cf_lms_instance || '')
    ].join(','))

    const csvContent = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })

    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${filename}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (exportFileType.value === 'docx') {
    const rows = exportData.map(ticket =>
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph(String(ticket.id))] }),
          new TableCell({ children: [new Paragraph(ticket.subject || '')] }),
          new TableCell({ children: [new Paragraph(getStatus(ticket.status))] }),
          new TableCell({ children: [new Paragraph(getPriority(ticket.priority))] }),
          new TableCell({ children: [new Paragraph(ticket.due_by || '')] }),
          new TableCell({ children: [new Paragraph(ticket.custom_fields?.cf_lms_instance || '')] })
        ]
      })
    )

    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({ text: 'Exported Tickets', heading: 'Heading1' }),
          new Table({
            rows: [
              new TableRow({
                children: ['ID', 'Subject', 'Status', 'Priority', 'Due Date', 'Instance'].map(
                  text => new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text, bold: true })] })]
                  })
                )
              }),
              ...rows
            ]
          })
        ]
      }]
    })

    const blob = await Packer.toBlob(doc)
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${filename}.docx`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  exportModalOpen.value = false
}

const conversations = ref<any[]>([])

const refreshTickets = async (event?: any) => {
  const data = await fetchTickets()
  tickets.value = data
  event?.detail?.complete?.()
}

onMounted(async () => {
  await refreshTickets()
  const query = route.query.dashboardFilter as string
  if (['open', 'overdue', 'due_today'].includes(query)) {
    statusFilter.value = query as typeof statusFilter.value
  } else if (['lms', 'non-lms', 'untagged', 'instances'].includes(query)) {
    filter.value = query as typeof filter.value
  }
})

const filteredTickets = computed(() => {
  const today = new Date().toISOString().split('T')[0]
  return tickets.value.filter(ticket => {
    const fields = ticket.custom_fields
    const lms = fields?.cf_district
    const nonLms = fields?.cf_non_lms
    const instance = fields?.cf_lms_instance
    const due = ticket.due_by?.split('T')[0]

    // Category filters
    if (filter.value === 'lms') return !!lms
    if (filter.value === 'non-lms') return !!nonLms
    if (filter.value === 'untagged') return !lms && !nonLms
    if (filter.value === 'instances') return !!instance

    // Status filters
    if (statusFilter.value === 'open') return ticket.status === 2
    if (statusFilter.value === 'overdue') return due && due < today
    if (statusFilter.value === 'due_today') return due === today

    // Search filter
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      const subject = ticket.subject?.toLowerCase() || ''
      const id = String(ticket.id)
      const type = ticket.type?.toLowerCase() || ''
      const instanceStr = ticket.custom_fields?.cf_lms_instance?.toLowerCase() || ''
      if (![subject, id, type, instanceStr].some(field => field.includes(q))) return false
    }

    return true
  })
})

const filteredTicketsSorted = computed(() => {
  return [...filteredTickets.value].sort((a, b) => {
    const getTime = (t: any) => new Date(t.created_at || t.due_by || 0).getTime()
    return selectedSort.value === 'newest' ? getTime(b) - getTime(a) : getTime(a) - getTime(b)
  })
})

const openTicket = async (ticket: Ticket) => {
  try {
    const base = `https://${import.meta.env.VITE_FRESHDESK_DOMAIN}/api/v2/tickets/${ticket.id}`
    const headers = {
      Authorization: `Basic ${btoa(import.meta.env.VITE_FRESHDESK_API_KEY + ':X')}`,
      'Content-Type': 'application/json'
    }
    
    const [detail, convos] = await Promise.all([
      axios.get(base, { headers }),
      axios.get(`${base}/conversations`, { headers })
    ])

    selectedTicket.value = detail.data
    conversations.value = convos.data
    modalOpen.value = true
  } catch (error) {
    console.error('Failed to load ticket details:', error)
    alert('Failed to load ticket details. Please try again.')
  }
}



const getPriority = (val: number) => ['Low', 'Medium', 'High', 'Urgent'][val - 1] || 'Unknown'
const getPriorityBadgeStyle = (val: number) => ({
  backgroundColor: ['green', 'yellow', 'orange', 'red'][val - 1] || 'gray',
  color: 'white'
})
const getStatus = (val: number) => ({
  2: 'Open', 3: 'Pending', 4: 'Resolved', 5: 'Closed', 6: 'Waiting on Customer', 7: 'Waiting on Third Party'
})[val] || 'Unknown'
const formatDate = (iso: string) => new Date(iso).toLocaleDateString()

</script>

<style scoped>
.image-preview {
  max-width: 100%;
  max-height: 300px;
  object-fit: cover;
  margin-bottom: 16px;
}
.image-preview-small {
  max-width: 150px;
  max-height: 100px;
  margin-top: 8px;
}
.scroll-box {
  max-height: 120px;
  overflow-y: auto;
  white-space: pre-line;
  border: 1px solid #eee;
  padding: 8px;
  border-radius: 4px;
}
.section-title {
  text-align: center;
  background: #FFCC00;
  color: #00116f;
  padding: 10px;
  border-radius: 6px;
  margin: 20px auto 10px;
  font-weight: bold;
}
.header-row {
  background: #FFCC00;
  color: #00116f;
  font-weight: bold;
}
ion-card {
  border: 1px solid #FFCC00;
  border-radius: 12px;
  margin: 14px 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: box-shadow 0.2s ease;
}
ion-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}
ion-card-content p {
  margin: 6px 0;
  font-size: 0.95rem;
}
/* ion-modal::part(content) {
  padding: 5px;
  background-color: #fff;
  border-radius: 16px;
} */
ion-toolbar ion-segment-button.ion-activated {
  --color-checked: #FFCC00;
}
.section-title {
  background-color: #FFCC00;
  color: #000000;
  padding: 10px 20px;
  border-radius: 8px;
  text-align: center;
  font-size: 1.1rem;
  font-weight: bold;
  margin: 24px auto 16px;
  max-width: 300px;
}
ion-text {
  padding: 20px;
  text-align: center;
  font-style: italic;
  color: #888;
}
.ion-segment-button {
  color: #5fdfff;
}
.segment-button-checked {
  color: #ffffff;
  font-weight: bold;
}
</style>