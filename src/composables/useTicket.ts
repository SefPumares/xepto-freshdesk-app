import { ref } from 'vue';
import axios from 'axios';

const tickets = ref([]);
const loading = ref(false);

export function useTickets() {
  const fetchTickets = async () => {
    loading.value = true;
    try {
      const response = await axios.get('/api/v2/tickets');
      tickets.value = response.data;
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      loading.value = false;
    }
  };

  return {
    tickets,
    loading,
    fetchTickets
  };
}