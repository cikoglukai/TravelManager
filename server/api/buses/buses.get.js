export default defineEventHandler(async (event) => {
    const query = getQuery(event)

    const destination = query.destination
    const departureDate = query.departureDate

    try {


        return [
            {
                id: 1,
                provider: 'FlixBus',
                from: 'Stuttgart',
                to: destination,
                departure: '08:30',
                arrival: '15:10',
                duration: '6h 40m',
                price: '39.99€'
            },
            {
                id: 2,
                provider: 'FlixBus',
                from: 'Stuttgart',
                to: destination,
                departure: '13:00',
                arrival: '20:45',
                duration: '7h 45m',
                price: '44.99€'
            }
        ]

    } catch (err) {
        console.error(err)

        return []
    }
})