// GET /api/buses?origin=<city>&destination=<city>&departureDate=YYYY-MM-DD
// TODO: replace mock once a real bus API is wired up (FlixBus public API,
// BookAway via RapidAPI, etc.). Frontend treats this just like flights/hotels
// so swapping the implementation later is mechanical.
export default defineEventHandler(async (event) => {
  const { origin, destination, departureDate } = getQuery(event)
  if (!origin || !destination) return []

  return [
    {
      id:        1,
      provider:  'FlixBus',
      origin,
      destination,
      departure: '08:30',
      arrival:   '15:10',
      duration:  '6h 40m',
      price:     '39.99€',
      date:      departureDate || null,
      bookingLink: 'https://www.flixbus.com',
    },
    {
      id:        2,
      provider:  'FlixBus',
      origin,
      destination,
      departure: '13:00',
      arrival:   '20:45',
      duration:  '7h 45m',
      price:     '44.99€',
      date:      departureDate || null,
      bookingLink: 'https://www.flixbus.com',
    },
  ]
})
