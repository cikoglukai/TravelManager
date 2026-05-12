export default defineEventHandler(async (event) => {

    const query = getQuery(event)

    const destination =
        query.destination

    const departureDate =
        query.departureDate

    const config =
        useRuntimeConfig()

    try {

        /*
          SKYSCANNER / SKY SCRAPPER API
          via RapidAPI
        */

        const response = await $fetch(
            'https://sky-scrapper.p.rapidapi.com/api/v1/flights/searchFlights',
            {
                headers: {
                    'X-RapidAPI-Key': config.rapidApiKey,
                    'X-RapidAPI-Host': 'sky-scrapper.p.rapidapi.com'
                },

                query: {

                    originSkyId: 'STR',
                    destinationSkyId: destination,

                    originEntityId: '27544008',
                    destinationEntityId: destination,

                    date: departureDate,

                    cabinClass: 'economy',

                    adults: '1',

                    sortBy: 'best',

                    currency: 'EUR',

                    market: 'DE',

                    countryCode: 'DE'

                }
            }
        )

        const itineraries =
            response?.data?.itineraries || []

        return itineraries
            .slice(0, 2)
            .map((flight, index) => ({

                id:
                    index + 1,

                airline:
                    flight.legs?.[0]
                        ?.carriers?.marketing?.[0]
                        ?.name || 'Flight',

                destination,

                departure:
                    flight.legs?.[0]
                        ?.departure,

                arrival:
                    flight.legs?.[0]
                        ?.arrival,

                price:
                    flight.price?.formatted || 'N/A',

                bookingLink:
                    flight.deepLink ||

                    'https://www.skyscanner.com'

            }))

    } catch (err) {

        console.error(err)

        return []

    }

})