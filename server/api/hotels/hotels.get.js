export default defineEventHandler(async (event) => {
    const query = getQuery(event)

    const city = query.city
    const checkin = query.checkin
    const checkout = query.checkout

    const config = useRuntimeConfig()

    const response = await $fetch(
        'https://booking-com.p.rapidapi.com/v1/hotels/search',
        {
            headers: {
                'X-RapidAPI-Key': config.rapidApiKey,
                'X-RapidAPI-Host': 'booking-com.p.rapidapi.com'
            },
            query: {
                dest_id: city,
                dest_type: 'city',
                checkin_date: checkin,
                checkout_date: checkout,
                adults_number: 1,
                room_number: 1,
                units: 'metric',
                locale: 'en-gb',
                order_by: 'popularity'
            }
        }
    )

    return response.result.slice(0, 2)
})