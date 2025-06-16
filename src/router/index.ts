import { createRouter, createWebHistory } from '@ionic/vue-router';
import TabsPage from '@/views/TabsPage.vue';
import Dashboard from '@/views/dashboard.vue';
import TicketList from '@/views/ticketList.vue';
import Settings from '@/views/settings.vue';

const routes = [
  {
    path: '/',
    component: TabsPage,
    children: [
      {
  path: '/dashboard',
  component: Dashboard,
  name: 'Dashboard'
},
{
  path: '/tickets',
  component: TicketList,
  name: 'TicketList'
},
{
  path: '/settings',
  component: Settings,
  name: 'Settings'
}
    ],
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

export default router;
