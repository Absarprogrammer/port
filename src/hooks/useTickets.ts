import { useTicketContext } from '../context/TicketContext';

export default function useTickets() {
  return useTicketContext();
}
