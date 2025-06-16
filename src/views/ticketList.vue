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

      <!-- Sorting Dropdown -->
      <ion-toolbar>
        <ion-label slot="start" class="ion-padding-start">Sort by:</ion-label>
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



      <!-- Ticket Modal -->
      <ion-modal :is-open="modalOpen" @didDismiss="closeModal">
        <ion-header>
          <ion-toolbar>
            <ion-title>{{ selectedTicket?.subject }}</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="closeModal">Close</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content>
          <div v-if="selectedTicket">
            <p><strong>Description:</strong></p>
            <p>{{ selectedTicket.description_text || 'No description.' }}</p>
            <p v-if="selectedTicket?.custom_fields?.cf_lms_instance">
              <strong>Instance:</strong> {{ selectedTicket.custom_fields.cf_lms_instance }}
            </p>
            <div v-if="selectedTicket.attachments?.length">
              <p><strong>Attachments:</strong></p>
              <div v-for="file in selectedTicket.attachments" :key="file.id">
                <div v-if="file.content_type.startsWith('image/')">
                  <img :src="file.attachment_url" class="image-preview" />
                </div>
                <div v-else>
                  <ion-button expand="block" @click="downloadFile(file.attachment_url)">
                    Download {{ file.name }}
                  </ion-button>
                </div>
              </div>
            </div>

            <ion-item>
              <ion-label position="stacked">Reply</ion-label>
              <ion-textarea v-model="replyText" placeholder="Type your reply here..."></ion-textarea>
            </ion-item>
            <ion-button expand="block" color="success" @click="sendReply">Send Reply</ion-button>
          </div>

          <!-- Conversation History -->
          <div v-if="conversations.length">
            <h3 class="section-title">Conversation History</h3>
            <ion-grid>
              <ion-row class="header-row">
                <ion-col size="2"><strong>Source</strong></ion-col>
                <ion-col size="6"><strong>Response</strong></ion-col>
                <ion-col size="2"><strong>Author</strong></ion-col>
                <ion-col size="2"><strong>Date</strong></ion-col>
              </ion-row>
              <ion-row
                v-for="conv in conversations"
                :key="conv.id"
                class="conversation-row"
              >
                <ion-col size="2">{{ sourceLabel(conv.source) }}</ion-col>
                <ion-col size="6">
                  <div class="scroll-box">
                    {{ conv.body_text || '—' }}
                    <template v-if="conv.attachments?.length">
                      <div v-for="file in conv.attachments" :key="file.id">
                        <div v-if="file.content_type.startsWith('image/')">
                          <img :src="file.attachment_url" class="image-preview-small" />
                        </div>
                        <div v-else>
                          <ion-button
                            size="small"
                            @click.stop="downloadFile(file.attachment_url)"
                          >
                            {{ file.name }}
                          </ion-button>
                        </div>
                      </div>
                    </template>
                  </div>
                </ion-col>
                <ion-col size="2">{{ conv.user_id || 'System' }}</ion-col>
                <ion-col size="2">{{ formatDate(conv.created_at) }}</ion-col>
              </ion-row>
            </ion-grid>
          </div>
        </ion-content>
      </ion-modal>

      <!-- Export Modal -->
      <ion-modal :is-open="exportModalOpen" @didDismiss="exportModalOpen = false" :icon="downloadOutline">
        <ion-icon :icon="downloadOutline"></ion-icon>
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
      <ion-item v-for="option in exportOptions" :key="option.key">
        <ion-checkbox slot="start" v-model="selectedExportOptions" :value="option.key"></ion-checkbox>
        <ion-label>{{ option.label }}</ion-label>
      </ion-item>
    </ion-list>
      <ion-item>
  <ion-label>File Type</ion-label>
  <ion-select v-model="exportFileType">
    <ion-select-option value="docx">DOCX</ion-select-option>
    <ion-select-option value="csv">CSV</ion-select-option>
  </ion-select>
</ion-item>

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
  IonButtons, IonButton, IonItem, IonTextarea, IonSelect, IonSelectOption, IonText, IonGrid, IonRow, IonCol, IonIcon
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
const replyText = ref('')
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

const escapeCSV = (text: string) => `"${text.replace(/"/g, '""')}"`

const handleExport = async () => {
  const today = new Date().toISOString().split('T')[0]
  const selected = selectedExportOptions.value

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

    const hasCategoryFilter = ['lms', 'non-lms', 'untagged', 'instance'].some(f => selected.includes(f))
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
    // Cache field lookups
    const fields = ticket.custom_fields
    const lms = fields?.cf_district
    const nonLms = fields?.cf_non_lms
    const instance = fields?.cf_lms_instance
    const due = ticket.due_by?.split('T')[0]

    if (filter.value === 'lms') return !!lms
    if (filter.value === 'non-lms') return !!nonLms
    if (filter.value === 'untagged') return !lms && !nonLms
    if (filter.value === 'instances') return !!instance

    if (statusFilter.value === 'open') return ticket.status === 2
    if (statusFilter.value === 'overdue') return due && due < today
    if (statusFilter.value === 'due_today') return due === today

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

const sendReply = async () => {
  if (!selectedTicket.value || !replyText.value.trim()) return
  
  try {
    await axios.post(
      `https://${import.meta.env.VITE_FRESHDESK_DOMAIN}/api/v2/tickets/${selectedTicket.value.id}/reply`,
      { body: replyText.value.trim() },
      {
        headers: {
          Authorization: `Basic ${btoa(import.meta.env.VITE_FRESHDESK_API_KEY + ':X')}`,
          'Content-Type': 'application/json'
        }
      }
    )
    alert('Reply sent!')
    replyText.value = ''
  } catch (error) {
    console.error('Failed to send reply:', error)
    alert('Failed to send reply. Please try again.')
  }
}

const closeModal = () => {
  modalOpen.value = false
  conversations.value = []
  selectedTicket.value = null
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
const sourceLabel = (val: number) => ({
  0: 'Reply', 2: 'Note', 5: 'Tweet', 6: 'Survey', 7: 'Facebook', 8: 'Email', 9: 'Phone', 11: 'E-Com'
}[val] || `Source ${val}`)
const downloadFile = (url: string) => window.open(url, '_blank')

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