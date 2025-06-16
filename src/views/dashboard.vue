<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Dashboard</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content ref="content" class="ion-padding">
      <!-- Ticket Summary Metrics -->
      <ion-grid>
        <ion-row>
          <ion-col v-for="card in dashboardCards" :key="card.key" size="6">
            <ion-card button @click="goToFilteredTickets(card.key)">
              <ion-card-content class="text-center">
                <h2>{{ card.title }}</h2>
                <p :style="{ color: '#FFCC00', fontWeight: 'bold', fontSize: '24px' }">
                  {{ ticketCounts[card.key] || 0 }}
                </p>
              </ion-card-content>
            </ion-card>
          </ion-col>
        </ion-row>
      </ion-grid>

      <!-- Priority Distribution Chart -->
      <ion-card>
        <ion-card-header>Priority Distribution</ion-card-header>
        <ion-card-content class="text-center">
          <p>Click on a bar to view tickets of that priority.</p>
          <p v-if="!tickets.length">Loading chart...</p>
          <canvas id="priority-chart"></canvas>
        </ion-card-content>
      </ion-card>

      <!-- Quick Filters Section -->
      <!-- <ion-grid>
        <ion-row>
          <ion-col size="4" v-for="filterType in ['Open', 'Overdue', 'Due Today']" :key="filterType">
            <ion-button expand="block" @click="applyQuickFilter(filterType.toLowerCase())">
              View {{ filterType }} Tickets
            </ion-button>
          </ion-col>
        </ion-row>
      </ion-grid> -->

      <!-- Recent Activity Feed -->
      <ion-card>
  <ion-card-header>Recent Activity</ion-card-header>
  <ion-card-content>
    <ion-list>
      <ion-item v-for="ticket in recentActivities" :key="ticket.id">
        <ion-label>
          <h3>Ticket #{{ ticket.id }}</h3>
          <p>{{ ticket.description }}</p>
          <small><strong>Sent:</strong> {{ formatDate(ticket.created_at) }}</small>
        </ion-label>
      </ion-item>
    </ion-list>
  </ion-card-content>
</ion-card>


      <!-- SLA Compliance Indicator -->
      <!-- <ion-card>
        <ion-card-header>SLA Compliance</ion-card-header>
        <ion-card-content>
          <p>{{ slaCompliancePercentage }}% of tickets are within SLA</p>
        </ion-card-content>
      </ion-card> -->

      <!-- Most Common Issues -->
      <ion-card>
        <ion-card-header>Most Common Issues</ion-card-header>
        <ion-card-content>
          <ion-list>
            <ion-item v-for="(count, issue) in commonIssues" :key="issue">
              <ion-label>
                {{ issue }} - {{ count }} tickets
              </ion-label>
            </ion-item>
          </ion-list>
        </ion-card-content>
      </ion-card>
    </ion-content>
  </ion-page>
</template>

<script lang="ts" setup>
defineOptions({ name: 'DashboardView' });

import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { fetchTickets } from '@/services/freshdesk';
import { Chart } from 'chart.js';
import axios from 'axios';



const router = useRouter();


interface DashboardCard {
  title: string;
  key: string;
}

interface Ticket {
  id: number;
  status: number;
  due_by?: string;
  priority: number;
  custom_fields?: {
    cf_ticket_type?: string;
    cf_district?: string;
    cf_non_lms?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

const dashboardCards: DashboardCard[] = [
  { title: 'Open Tickets', key: 'open' },
  { title: 'Overdue Tickets', key: 'overdue' },
  { title: 'Due Today', key: 'due_today' },
  { title: 'LMS Tickets', key: 'lms' },
  { title: 'Non-LMS Tickets', key: 'non_lms' },
  { title: 'Untagged Tickets', key: 'untagged' }
];

const ticketCounts = ref<Record<string, number>>({
  open: 0,
  overdue: 0,
  due_today: 0,
  lms: 0,
  non_lms: 0,
  untagged: 0
});

const tickets = ref<Ticket[]>([
  { id: 1, description: 'Issue with login', due_by: '2025-06-10T15:00:00Z', status: 2, priority: 1 },
  { id: 2, description: 'System performance issue', due_by: '2025-06-11T12:00:00Z', status: 2, priority: 2 },
  { id: 3, description: 'Password reset request', due_by: '2025-06-12T09:00:00Z', status: 2, priority: 3 },
]);

// const slaCompliancePercentage = computed<string>(() => {
//   const withinSLA = tickets.value.filter((ticket: Ticket) => {
//     const dueDate = new Date(ticket.due_by || '1970-01-01');
//     return new Date() <= dueDate;
//   });
//   return ((withinSLA.length / tickets.value.length) * 100).toFixed(2);
// });

const commonIssues = computed<Record<string, number>>(() => {
  return tickets.value.reduce((acc: Record<string, number>, ticket: Ticket) => {
    const issue = ticket.custom_fields?.cf_ticket_type || 'Unknown';
    acc[issue] = (acc[issue] || 0) + 1;
    return acc;
  }, {});
});

interface TicketDetailsResponse {
  description_text?: string;
  [key: string]: any;
}


// eslint-disable-next-line @typescript-eslint/no-unused-vars
const fetchTicketDetails = async (ticketId: number): Promise<string> => {
  try {
    const response = await axios.get<TicketDetailsResponse>(
      `https://${import.meta.env.VITE_FRESHDESK_DOMAIN}/api/v2/tickets/${ticketId}`,
      {
        headers: {
          Authorization: `Basic ${btoa(import.meta.env.VITE_FRESHDESK_API_KEY + ':X')}`,
        },
      }
    );
    return response.data.description_text || 'No description available.';
  } catch (error) {
    console.error(`Error fetching ticket ${ticketId}:`, error);
    return 'Failed to load description.';
  }
};

// const applyQuickFilter = (type: string): void => {
//   router.push({ name: 'TicketList', query: { dashboardFilter: type } });
// };

interface RecentActivity {
  id: number;
  description: string;
  created_at: string;
}

const recentActivities = ref<RecentActivity[]>([]);

const loadRecentActivities = async () => {
  try {
    const data = await fetchTickets();

    const recent = await Promise.all(
      data.slice(0, 5).map(async (ticket: any) => {
        try {
          const response = await axios.get(
            `https://${import.meta.env.VITE_FRESHDESK_DOMAIN}/api/v2/tickets/${ticket.id}`,
            {
              headers: {
                Authorization: `Basic ${btoa(import.meta.env.VITE_FRESHDESK_API_KEY + ':X')}`,
                'Content-Type': 'application/json',
              },
            }
          );

          return {
            id: ticket.id,
            description: response.data.description_text || 'No description',
            created_at: ticket.created_at || ticket.due_by || 'No date',
          };
        } catch (err) {
          console.error(`Failed to fetch details for ticket ${ticket.id}`, err);
          return {
            id: ticket.id,
            description: 'Failed to load',
            created_at: ticket.created_at || ticket.due_by || 'No date',
          };
        }
      })
    );

    recentActivities.value = recent;
  } catch (error) {
    console.error('Failed to load recent tickets:', error);
  }
};



onMounted(loadRecentActivities);


const goToFilteredTickets = (key: string): void => {
  const normalizedKey = key === 'non_lms' ? 'non-lms' : key;
  router.push({ name: 'TicketList', query: { dashboardFilter: normalizedKey } });
};


const fetchAndCountTickets = async (): Promise<void> => {
  try {
    const fetchedTickets: Ticket[] = await fetchTickets();
    tickets.value = fetchedTickets;
    const today: string = new Date().toISOString().split('T')[0];

    const counts: Record<string, number> = {
      open: 0,
      overdue: 0,
      due_today: 0,
      lms: 0,
      non_lms: 0,
      untagged: 0
    };

    for (const ticket of fetchedTickets) {
      const status = ticket.status;
      const dueDate = ticket.due_by?.split('T')[0];
      const cf = ticket.custom_fields || {};

      if (status === 2) counts.open++;
      if (dueDate && dueDate < today) counts.overdue++;
      if (dueDate === today) counts.due_today++;

      if (cf.cf_district) counts.lms++;
      else if (cf.cf_non_lms) counts.non_lms++;
      else counts.untagged++;
    }

    ticketCounts.value = counts;

    const canvas = document.getElementById('priority-chart') as HTMLCanvasElement | null;
    if (canvas) {
      interface PriorityCounts {
        [priority: string]: number;
      }

      const priorities: PriorityCounts = (fetchedTickets as Ticket[]).reduce((acc: PriorityCounts, ticket: Ticket) => {
        const priority: string = ['Low', 'Medium', 'High', 'Urgent'][ticket.priority - 1] || 'Unknown';
        acc[priority] = (acc[priority] || 0) + 1;
        return acc;
      }, {});

      new Chart(canvas, {
        type: 'bar',
        data: {
          labels: Object.keys(priorities),
          datasets: [{
            label: '# of Tickets',
            data: Object.values(priorities),
            backgroundColor: ['green', 'yellow', 'orange', 'red']
          }]
        }
      });
    }
  } catch (error: unknown) {
    console.error('Error loading tickets:', error);
  }
};

interface FormatDate {
  (date: string | number | Date): string;
}

const formatDate: FormatDate = (date) => {
  try {
    return new Date(date).toLocaleString();
  } catch {
    return 'Invalid date';
  }
};

onMounted(fetchAndCountTickets);
</script>

<style scoped>
:root {
  --card-margin: 16px;
  --item-margin: 8px;
}

ion-card {
  margin-bottom: var(--card-margin);
}

ion-item {
  margin-bottom: var(--item-margin);
}

ion-content {
  --overflow: scroll;
}

ion-grid {
  display: block;
}

ion-card {
  border: 1px solid #FFCC00;
  border-radius: 10px;
  margin-bottom: 16px;
}

ion-card:hover {
  box-shadow: 0 0 10px #FFCC00;
  transform: scale(1.02);
  transition: 0.2s ease;
}

.text-center {
  text-align: center;
}
ion-content {
  --padding-bottom: 56px;
}
ion-item {
  margin-bottom: 8px;
}

ion-label h3 {
  font-size: 1.2rem;
  font-weight: bold;
}

ion-label p {
  font-size: 0.9rem;
  margin: 4px 0;
}

ion-label small {
  color: gray;
}
ion-padding {
  --bottom-padding: 86px
}
</style>
