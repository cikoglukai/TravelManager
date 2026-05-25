// seed.js — Seeds 15 European destinations with routes, transport and
// accommodation options. Runs once on server start; skips if data exists.
import { getDb } from './db.js'

const DESTINATIONS = [
  {
    country: 'Austria', city: 'Vienna & Salzburg', emoji: '🇦🇹',
    description: 'Imperial grandeur, Baroque palaces and world-class coffee-house culture in the heart of Europe.',
    routes: [
      {
        name: 'Vienna City Break',
        description: 'Dive into the Habsburg Empire — opulent palaces, cutting-edge museums and the finest Viennese coffee houses.',
        duration_days: 3,
        highlights: 'Schönbrunn Palace · Belvedere · Prater Ferris Wheel · Naschmarkt · Vienna State Opera',
        transport: [
          { type: 'train', provider: 'ÖBB Railjet', duration: 'Direct (hub city)', price_from: 0, notes: 'Vienna Hauptbahnhof is a major European rail hub with direct connections from Munich, Budapest, Prague and Zurich.' },
          { type: 'flight', provider: 'Austrian Airlines / Ryanair', duration: 'Direct (hub city)', price_from: 0, notes: 'Vienna International Airport (VIE) — 16 min to city centre by City Airport Train (CAT).' },
          { type: 'car', provider: 'Self-drive', duration: 'Direct (hub city)', price_from: 35, notes: 'Well-connected by motorway. Use Park & Ride (P+R) at the city boundary — public transport cores the city cheaply.' },
        ],
        accommodation: [
          { type: 'hotel', name: 'Hotel Imperial Vienna', price_per_night: 195, rating: 4.8, notes: 'Historic 5-star palace hotel on the Ringstraße, steps from the Opera. Breakfast included.' },
          { type: 'hostel', name: "Wombat's City Hostel Vienna", price_per_night: 27, rating: 4.5, notes: 'Award-winning party and culture hostel near the Naschmarkt. Rooftop terrace bar.' },
          { type: 'apartment', name: 'Central Apartment am Naschmarkt', price_per_night: 98, rating: 4.6, notes: 'Fully equipped Altbau apartment for 2–4 guests. 10-minute walk to the Ringstraße.' },
        ],
      },
      {
        name: 'Vienna → Salzburg Grand Tour',
        description: 'Combine the imperial capital with Mozart\'s baroque birthplace — two of Europe\'s finest cities in one trip.',
        duration_days: 6,
        highlights: 'Hofburg Palace · Salzburg Old Town (UNESCO) · Hohensalzburg Fortress · Hellbrunn · Sound of Music locations',
        transport: [
          { type: 'train', provider: 'ÖBB Railjet', duration: '2 h 25 min', price_from: 29, notes: 'Comfortable Railjet trains every 30 minutes. Free onboard WiFi. Book in advance for best fares.' },
          { type: 'bus', provider: 'Flixbus', duration: '3 h 45 min', price_from: 8, notes: 'Budget option from Wien Erdberg terminal. No advance booking needed.' },
          { type: 'car', provider: 'Self-drive A1 motorway', duration: '2 h 55 min', price_from: 55, notes: 'Scenic detour via Salzkammergut lakes adds ~40 min but is highly recommended.' },
        ],
        accommodation: [
          { type: 'hotel', name: 'Hotel Sacher Salzburg', price_per_night: 230, rating: 4.9, notes: 'Legendary luxury hotel with direct views of the Salzach river and Old Town skyline.' },
          { type: 'guesthouse', name: 'Pension Katrin Salzburg', price_per_night: 79, rating: 4.4, notes: 'Family-run pension 15 min from centre. Mountain views, hearty Austrian breakfast included.' },
          { type: 'apartment', name: 'Kapuzinerberg Panorama Apartment', price_per_night: 115, rating: 4.7, notes: 'Panoramic fortress views, fully equipped kitchen. Ideal for 2–4 people.' },
        ],
      },
    ],
  },

  {
    country: 'France', city: 'Paris & French Riviera', emoji: '🇫🇷',
    description: 'Romance, haute cuisine, Impressionist art and the glittering Mediterranean coast.',
    routes: [
      {
        name: 'Paris Essentials',
        description: 'The greatest hits of the City of Light — iconic landmarks, world-class art and legendary neighbourhood cafés.',
        duration_days: 4,
        highlights: 'Eiffel Tower · Louvre Museum · Musée d\'Orsay · Montmartre & Sacré-Cœur · Notre-Dame · Le Marais',
        transport: [
          { type: 'train', provider: 'Eurostar / TGV', duration: '2 h 15 min – 4 h', price_from: 39, notes: 'Eurostar from London in 2h15; TGV from Brussels in 1h22, Zurich in 4h, Frankfurt in 3h50.' },
          { type: 'flight', provider: 'Air France / EasyJet', duration: '1–3 h', price_from: 49, notes: 'CDG is the main hub; Orly is closer to the south of the city. RER B links CDG to central Paris in 35 min.' },
          { type: 'bus', provider: 'Flixbus', duration: '10–18 h', price_from: 19, notes: 'Very economical option from most European capitals overnight. Arrives at Bercy Seine bus station.' },
        ],
        accommodation: [
          { type: 'hotel', name: 'Hôtel Plaza Athénée', price_per_night: 890, rating: 4.9, notes: 'The most iconic Paris luxury hotel on Avenue Montaigne. For a truly unforgettable splurge.' },
          { type: 'hostel', name: 'Generator Paris Hostel', price_per_night: 32, rating: 4.3, notes: 'Trendy design hostel near Canal Saint-Martin with bar, terrace and social spaces.' },
          { type: 'apartment', name: 'Le Marais Studio Apartment', price_per_night: 125, rating: 4.6, notes: 'Charming studio in the Jewish quarter. Walking distance to Place des Vosges and the Pompidou.' },
        ],
      },
      {
        name: 'Paris & French Riviera',
        description: 'From the Seine to the Mediterranean — experience Parisian culture then unwind on the glamorous Côte d\'Azur.',
        duration_days: 8,
        highlights: 'Eiffel Tower · Nice Old Town · Monaco Grand Prix circuit · Cannes Promenade · Èze village · Antibes',
        transport: [
          { type: 'flight', provider: 'Air France / Transavia', duration: '1 h 20 min (Paris → Nice)', price_from: 59, notes: 'The quickest way to get from Paris to the Riviera. Nice Côte d\'Azur Airport is 15 min from the city.' },
          { type: 'train', provider: 'TGV Inouï', duration: '5 h 30 min (Paris → Nice)', price_from: 49, notes: 'Direct high-speed TGV from Paris Gare de Lyon to Nice multiple times daily. Scenic final stretch along the coast.' },
          { type: 'car', provider: 'Self-drive / Rental', duration: '7–8 h (Paris → Nice)', price_from: 70, notes: 'A6 and A7 motorways (La Provençale). Ideal if you want to stop in Lyon and Provence along the way.' },
        ],
        accommodation: [
          { type: 'hotel', name: 'Hôtel Negresco Nice', price_per_night: 310, rating: 4.8, notes: 'Iconic Belle Époque palace hotel right on the Promenade des Anglais. A Riviera legend.' },
          { type: 'apartment', name: 'Nice Old Town Apartment', price_per_night: 110, rating: 4.5, notes: 'Colourful Baroque apartment 200m from the Cours Saleya flower market and the beach.' },
          { type: 'guesthouse', name: 'Villa Riviera Guesthouse', price_per_night: 85, rating: 4.4, notes: 'Peaceful garden villa 5 min from the sea. Provençal breakfast with local products.' },
        ],
      },
    ],
  },
  {
    country: 'Italy', city: 'Rome, Florence & Venice', emoji: '🇮🇹',
    description: 'Millennia of art, architecture and la dolce vita across three of Europe\'s most beautiful cities.',
    routes: [
      {
        name: 'Rome & the Vatican',
        description: 'The Eternal City at its finest — ancient ruins, Renaissance masterpieces and the best pasta of your life.',
        duration_days: 4,
        highlights: 'Colosseum & Roman Forum · Vatican Museums & Sistine Chapel · Trevi Fountain · Pantheon · Trastevere · Borghese Gallery',
        transport: [
          { type: 'flight', provider: 'Ryanair / ITA Airways', duration: '1–2 h 30 min', price_from: 39, notes: 'Rome Fiumicino (FCO) is the main hub; Leonardo Express train to Termini in 32 min.' },
          { type: 'train', provider: 'Frecciarossa / Italo', duration: '2 h 55 min (Milan → Rome)', price_from: 29, notes: 'High-speed rail from Milan Central in just under 3 hours. Also direct from Florence in 1h30.' },
          { type: 'bus', provider: 'Flixbus / Eurolines', duration: '6–22 h', price_from: 15, notes: 'Budget option from major European cities. Tiburtina bus station east of the centre.' },
        ],
        accommodation: [
          { type: 'hotel', name: 'Hotel de Russie', price_per_night: 420, rating: 4.9, notes: '5-star retreat near Piazza del Popolo with legendary terraced gardens. Preferred by artists and diplomats.' },
          { type: 'hostel', name: 'The Yellow Rome', price_per_night: 26, rating: 4.4, notes: 'Legendary travellers\' hostel near Termini with rooftop bar and nightly social events.' },
          { type: 'apartment', name: 'Trastevere Terrace Apartment', price_per_night: 135, rating: 4.7, notes: 'Romantic 2-bed apartment with private terrace in Rome\'s most charming neighbourhood.' },
        ],
      },
      {
        name: 'Italian Grand Tour — Rome · Florence · Venice',
        description: 'The classic Italian journey through the greatest art cities in the world.',
        duration_days: 9,
        highlights: 'Colosseum · Uffizi Gallery · Ponte Vecchio · Cinque Terre · Canal Grande · Doge\'s Palace · Piazza San Marco',
        transport: [
          { type: 'train', provider: 'Frecciarossa (Trenitalia)', duration: '1 h 30 min (Rome–Florence) + 2 h (Florence–Venice)', price_from: 19, notes: 'The Frecciarossa high-speed network connects all three cities seamlessly. Book ahead for the best fares.' },
          { type: 'flight', provider: 'ITA / Ryanair + train combo', duration: '1 h 30 min + 2 h 15 min', price_from: 89, notes: 'Fly into Rome FCO, train to Florence, continue to Venice Santa Lucia. Practical for flying from further afield.' },
          { type: 'car', provider: 'Rental car (Rome → Florence)', duration: '3 h', price_from: 55, notes: 'Drive Rome to Florence via Tuscany — stunning countryside but note: cars cannot enter Venice. Park in Mestre.' },
        ],
        accommodation: [
          { type: 'hotel', name: 'Portrait Firenze + Ca\' Sagredo Venice', price_per_night: 380, rating: 4.9, notes: 'Two legendary boutique hotels — Lungarno in Florence, Canal Grande palace in Venice.' },
          { type: 'hostel', name: 'Ostello Bello Chain (Rome + Florence + Venice)', price_per_night: 30, rating: 4.5, notes: 'Award-winning Italian hostel chain with locations in all three cities. Excellent social atmosphere.' },
          { type: 'apartment', name: 'Oltrarno Apartment / Venice Cannaregio Flat', price_per_night: 140, rating: 4.6, notes: 'Local neighbourhood apartments away from tourist crowds. Authentic Italian city living.' },
        ],
      },
    ],
  },
  {
    country: 'Spain', city: 'Barcelona & Madrid', emoji: '🇪🇸',
    description: 'Gaudí\'s surreal architecture, flamenco, world-famous cuisine and endless Mediterranean sunshine.',
    routes: [
      {
        name: 'Barcelona City Immersion',
        description: 'Modernisme, beaches and tapas — Barcelona is one of Europe\'s most visually spectacular cities.',
        duration_days: 4,
        highlights: 'Sagrada Família · Park Güell · Gothic Quarter · La Barceloneta beach · La Boqueria · Palau de la Música',
        transport: [
          { type: 'flight', provider: 'Vueling / Ryanair', duration: '1–3 h', price_from: 39, notes: 'Barcelona El Prat Airport (BCN). Aerobus runs every 5 min to Plaça Catalunya in 35 min.' },
          { type: 'train', provider: 'Renfe AVE / Ouigo', duration: '2 h 30 min (Madrid → Barcelona)', price_from: 15, notes: 'Spain\'s high-speed AVE line is one of Europe\'s best. Ouigo runs budget high-speed from Madrid.' },
          { type: 'bus', provider: 'Flixbus / ALSA', duration: '8–14 h', price_from: 12, notes: 'Overnight bus from Madrid or Valencia. Good value if you don\'t mind travelling by night.' },
        ],
        accommodation: [
          { type: 'hotel', name: 'Hotel Arts Barcelona', price_per_night: 285, rating: 4.8, notes: 'Iconic 44-floor luxury tower right on Barceloneta beach. Infinity pool with sea views.' },
          { type: 'hostel', name: 'TOC Hostel Barcelona', price_per_night: 24, rating: 4.5, notes: 'Excellent rooftop pool hostel in Gràcia, close to Park Güell. Great social vibe.' },
          { type: 'apartment', name: 'Eixample Design Apartment', price_per_night: 120, rating: 4.6, notes: 'Stylish apartment in Gaudí\'s Eixample grid, walkable to Sagrada Família and city centre.' },
        ],
      },
      {
        name: 'Spain Dual Capital — Barcelona & Madrid',
        description: 'Spain\'s two great rival capitals, each magnificent in its own right.',
        duration_days: 7,
        highlights: 'Sagrada Família · Prado Museum · Royal Palace · Retiro Park · El Rastro · Flamenco show · Toledo day trip',
        transport: [
          { type: 'train', provider: 'Renfe AVE', duration: '2 h 30 min (Madrid ↔ Barcelona)', price_from: 25, notes: 'Fastest inter-city connection in Europe. 8+ daily services. Book well ahead for best prices.' },
          { type: 'flight', provider: 'Iberia / Vueling / Air Europa', duration: '1 h 10 min', price_from: 35, notes: 'Frequent shuttle flights between the two capitals from all three Madrid airports.' },
          { type: 'bus', provider: 'ALSA Premium', duration: '7 h 30 min', price_from: 18, notes: 'Comfortable night bus with reclining seats. Saves a night\'s accommodation.' },
        ],
        accommodation: [
          { type: 'hotel', name: 'Mandarín Oriental Ritz Madrid', price_per_night: 650, rating: 4.9, notes: 'The most prestigious address in Madrid, magnificently restored. Jardín del Ritz is unmissable.' },
          { type: 'hostel', name: 'Cats Hostel Madrid', price_per_night: 22, rating: 4.4, notes: 'Legendary centrally-located hostel in a historic building with a basement cave bar.' },
          { type: 'apartment', name: 'Malasaña Neighbourhood Apartment', price_per_night: 95, rating: 4.5, notes: 'Stylish flat in Madrid\'s hippest neighbourhood, surrounded by independent cafés and galleries.' },
        ],
      },
    ],
  },
  {
    country: 'Germany', city: 'Berlin & Bavaria', emoji: '🇩🇪',
    description: 'History, reinvention and extraordinary culture — from Berlin\'s radical art scene to Bavaria\'s fairytale landscapes.',
    routes: [
      {
        name: 'Berlin: History & Reinvention',
        description: 'No city in Europe has reinvented itself as dramatically as Berlin. History at every corner, art at every turn.',
        duration_days: 4,
        highlights: 'Brandenburg Gate · Reichstag · East Side Gallery · Checkpoint Charlie · Pergamon Museum · Kreuzberg street art',
        transport: [
          { type: 'flight', provider: 'Ryanair / EasyJet / Lufthansa', duration: '1–2 h 30 min', price_from: 29, notes: 'Berlin Brandenburg Airport (BER). S-Bahn S9 and FEX express to the city in 30–40 min.' },
          { type: 'train', provider: 'Deutsche Bahn ICE', duration: '4–6 h (Vienna/Prague → Berlin)', price_from: 29, notes: 'Direct ICE from Vienna in 4h, Prague in 4h30, Munich in 4h, Amsterdam in 5h45.' },
          { type: 'bus', provider: 'Flixbus', duration: '6–12 h', price_from: 9, notes: 'Excellent value overnight and daytime connections from across Europe.' },
        ],
        accommodation: [
          { type: 'hotel', name: 'Soho House Berlin', price_per_night: 220, rating: 4.7, notes: 'Members\' club hotel in a historic 1920s building in Mitte. Pool, rooftop bar, cinematic atmosphere.' },
          { type: 'hostel', name: 'Circus Hostel Berlin', price_per_night: 25, rating: 4.6, notes: 'Multiple award-winning hostel in Mitte. Legendary bar, excellent breakfast, very well run.' },
          { type: 'apartment', name: 'Prenzlauer Berg Studio', price_per_night: 88, rating: 4.5, notes: 'Cosy apartment in Berlin\'s trendiest residential neighbourhood, full of cafés and Sunday markets.' },
        ],
      },
      {
        name: 'Bavaria & Neuschwanstein',
        description: 'Lederhosen, beer halls, Alpine lakes and Ludwig II\'s impossibly romantic castle.',
        duration_days: 6,
        highlights: 'Neuschwanstein Castle · Marienplatz & Frauenkirche · Hofbräuhaus · Nymphenburg Palace · Zugspitze · Rothenburg ob der Tauber',
        transport: [
          { type: 'flight', provider: 'Lufthansa / Ryanair', duration: '1–2 h', price_from: 49, notes: 'Munich Airport (MUC). S-Bahn S1/S8 to Munich city in 40 min. One of Germany\'s busiest hubs.' },
          { type: 'train', provider: 'ÖBB / DB RJX', duration: '4 h (Vienna → Munich)', price_from: 29, notes: 'Direct Railjet services from Vienna every 2 hours. ICE from Frankfurt in 3h.' },
          { type: 'car', provider: 'Self-drive / Rental', duration: '4 h (Vienna → Munich)', price_from: 65, notes: 'Scenic route via Salzburg possible. Car essential for visiting Neuschwanstein and Alpine lakes.' },
        ],
        accommodation: [
          { type: 'hotel', name: 'Hotel Vier Jahreszeiten Kempinski Munich', price_per_night: 310, rating: 4.8, notes: 'Grand Maximiliansstrasse hotel since 1858. Steps from the English Garden and Marienplatz.' },
          { type: 'hostel', name: 'Wombat\'s City Hostel Munich', price_per_night: 28, rating: 4.4, notes: 'Excellent, clean and well-located hostel near the Hauptbahnhof and the Oktoberfest grounds.' },
          { type: 'guesthouse', name: 'Pension am Schlosspark Neuschwanstein', price_per_night: 92, rating: 4.5, notes: 'Cosy guesthouse in Hohenschwangau village, 15 min walk to Neuschwanstein Castle.' },
        ],
      },
    ],
  },
  {
    country: 'Netherlands', city: 'Amsterdam & Holland', emoji: '🇳🇱',
    description: 'Golden Age canals, Rembrandt and Van Gogh, world-class cycling and a wonderfully liberal spirit.',
    routes: [
      {
        name: 'Amsterdam Canal City Break',
        description: 'Three days on the most photogenic canal system in the world — art, history and great coffee.',
        duration_days: 3,
        highlights: 'Rijksmuseum · Van Gogh Museum · Anne Frank House · Jordaan neighbourhood · Keukenhof (spring) · Canal boat cruise',
        transport: [
          { type: 'train', provider: 'Eurostar / Thalys / ICE', duration: '3 h 50 min (London) / 1 h 22 min (Brussels) / 6 h (Frankfurt)', price_from: 29, notes: 'Amsterdam Centraal is one of Europe\'s great rail hubs. International high-speed trains direct from London, Paris and Brussels.' },
          { type: 'flight', provider: 'KLM / Transavia / EasyJet', duration: '1–3 h', price_from: 39, notes: 'Schiphol Airport (AMS) is 17 min from Centraal Station by direct Intercity train.' },
          { type: 'bus', provider: 'Flixbus', duration: '6–10 h', price_from: 12, notes: 'Budget connections from Brussels, Paris and major German cities direct to Amsterdam Sloterdijk.' },
        ],
        accommodation: [
          { type: 'hotel', name: 'Pulitzer Amsterdam', price_per_night: 295, rating: 4.8, notes: '25 interconnected 17th-century canal houses in the Jordaan. Truly unique Amsterdam luxury.' },
          { type: 'hostel', name: 'Stayokay Amsterdam Stadsdoelen', price_per_night: 30, rating: 4.3, notes: 'YHA hostel in a 1655 Kloveniersburgwal building, minutes from the Rembrandtplein.' },
          { type: 'apartment', name: 'De Pijp Canal View Apartment', price_per_night: 145, rating: 4.6, notes: 'Light-filled apartment above the Albert Cuyp Market in Amsterdam\'s most vibrant neighbourhood.' },
        ],
      },
      {
        name: 'Holland Grand Tour',
        description: 'Beyond Amsterdam — the windmills, tulip fields and seafaring heritage of the whole country.',
        duration_days: 6,
        highlights: 'Rijksmuseum · Keukenhof Gardens · Kinderdijk windmills · Rotterdam architecture · Delft pottery · The Hague museums',
        transport: [
          { type: 'train', provider: 'NS Intercity / Sprinter', duration: 'Amsterdam → Rotterdam 40 min / The Hague 50 min', price_from: 15, notes: 'The Netherlands has an excellent and frequent rail network. Unlimited day passes (Dagkaart) great for touring.' },
          { type: 'car', provider: 'Self-drive / Rental', duration: 'Amsterdam → Rotterdam 1 h', price_from: 45, notes: 'Ideal for visiting Keukenhof (car park on-site), Kinderdijk and the Zaanse Schans.' },
          { type: 'bus', provider: 'Connexxion / EBS', duration: 'Local routes', price_from: 8, notes: 'Regional buses reach all major tulip fields and windmill sites not on the rail network.' },
        ],
        accommodation: [
          { type: 'hotel', name: 'nhow Rotterdam', price_per_night: 148, rating: 4.7, notes: 'Design hotel in a striking waterfront building. Rotterdam\'s best base for architecture lovers.' },
          { type: 'apartment', name: 'Hague Centre Apartment', price_per_night: 105, rating: 4.5, notes: 'Quiet residential apartment ideal for exploring both The Hague and Delft by bicycle.' },
          { type: 'guesthouse', name: 'Bed & Tulips Keukenhof Area', price_per_night: 88, rating: 4.4, notes: 'Traditional Dutch farmhouse guesthouse surrounded by tulip fields near Lisse.' },
        ],
      },
    ],
  },
  {
    country: 'Czech Republic', city: 'Prague & Bohemia', emoji: '🇨🇿',
    description: 'A fairy-tale medieval city, world-famous beer and spa towns that have welcomed royalty for centuries.',
    routes: [
      {
        name: 'Prague Golden City',
        description: 'One of Europe\'s best-preserved medieval cities — Gothic towers, Baroque churches and astronomical wonders.',
        duration_days: 3,
        highlights: 'Prague Castle & St Vitus Cathedral · Charles Bridge · Old Town Square & Astronomical Clock · Josefov Jewish Quarter · Václav Square',
        transport: [
          { type: 'train', provider: 'ÖBB / CD / DB', duration: '4 h (Vienna) / 4 h 30 min (Berlin)', price_from: 19, notes: 'Scenic rail through Bohemia. Direct Railjet from Vienna, EuroCity from Munich and Berlin.' },
          { type: 'flight', provider: 'Ryanair / Wizz Air / CSA', duration: '1–2 h', price_from: 29, notes: 'Prague Václav Havel Airport (PRG). Bus or metro to city centre in 30–45 min.' },
          { type: 'bus', provider: 'Flixbus / RegioJet', duration: '4–8 h', price_from: 8, notes: 'RegioJet is superb value with free WiFi, drinks and onboard entertainment. From Vienna, Munich and Warsaw.' },
        ],
        accommodation: [
          { type: 'hotel', name: 'Four Seasons Prague', price_per_night: 380, rating: 4.9, notes: 'Three historic buildings including a Baroque palace overlooking the Vltava river and Charles Bridge.' },
          { type: 'hostel', name: 'Sir Toby\'s Hostel Prague', price_per_night: 18, rating: 4.6, notes: 'Charming neighbourhood hostel in Holešovice with a legendary bar and garden. Budget\'s best.' },
          { type: 'apartment', name: 'Malá Strana Historic Apartment', price_per_night: 95, rating: 4.7, notes: 'Romantic apartment in the Lesser Town below Prague Castle, 5 min walk to Charles Bridge.' },
        ],
      },
      {
        name: 'Bohemian Escape — Prague & Český Krumlov',
        description: 'Combine golden Prague with the UNESCO fairytale town of Český Krumlov.',
        duration_days: 6,
        highlights: 'Prague Castle · Old Town · Kutná Hora ossuary · Český Krumlov Castle · Šumava National Park · Karlovy Vary spa',
        transport: [
          { type: 'bus', provider: 'Student Agency / RegioJet', duration: '3 h (Prague → Český Krumlov)', price_from: 8, notes: 'Direct buses from Prague Florenc terminal to Český Krumlov several times daily.' },
          { type: 'car', provider: 'Self-drive / Rental', duration: '2 h 45 min', price_from: 40, notes: 'Most flexible option — allows Kutná Hora stop en route. D3/E55 motorway to Bohemia.' },
          { type: 'train', provider: 'České dráhy', duration: '4 h (with change in České Budějovice)', price_from: 12, notes: 'Scenic but slow — beautiful Bohemian landscape. Change at České Budějovice for the branch line.' },
        ],
        accommodation: [
          { type: 'hotel', name: 'Château Mcely (Bohemia country retreat)', price_per_night: 210, rating: 4.8, notes: 'Fairytale château hotel in the Bohemian countryside, 1 h from Prague. Spa, organic garden, forest trails.' },
          { type: 'guesthouse', name: 'Pension Lobo Český Krumlov', price_per_night: 65, rating: 4.5, notes: 'Warm family guesthouse steps from the castle. Excellent local breakfast, river views.' },
          { type: 'apartment', name: 'Old Town Prague Apartment + Krumlov Studio', price_per_night: 88, rating: 4.5, notes: 'Combination of apartments in both cities — book in sequence for seamless stays.' },
        ],
      },
    ],
  },
  {
    country: 'Hungary', city: 'Budapest & Lake Balaton', emoji: '🇭🇺',
    description: 'The Paris of the East — thermal baths, Art Nouveau grandeur, and Europe\'s most vibrant ruin bar scene.',
    routes: [
      {
        name: 'Budapest Pearl of the Danube',
        description: 'Buda\'s hilltop castle district faces Pest\'s grand boulevards across the Danube — Europe\'s most dramatic city setting.',
        duration_days: 4,
        highlights: 'Buda Castle & Fisherman\'s Bastion · Hungarian Parliament · Széchenyi Thermal Baths · Great Market Hall · Ruin bars (Szimpla) · Chain Bridge at night',
        transport: [
          { type: 'train', provider: 'ÖBB / MÁV Railjet', duration: '2 h 40 min (Vienna → Budapest)', price_from: 29, notes: 'Direct Railjet from Vienna Hauptbahnhof every 2 hours. Also direct from Prague in 6h and Warsaw in 11h.' },
          { type: 'flight', provider: 'Ryanair / Wizz Air', duration: '1–3 h', price_from: 25, notes: 'Budapest Liszt Ferenc Airport (BUD). 100E bus and Metro M3 to city in 40 min.' },
          { type: 'bus', provider: 'Flixbus / OrangeBus', duration: '3 h (Vienna) / 8 h (Kraków)', price_from: 9, notes: 'Budget overnight options from Vienna, Bratislava, Kraków and Bucharest.' },
        ],
        accommodation: [
          { type: 'hotel', name: 'New York Palace Budapest', price_per_night: 260, rating: 4.9, notes: 'The most spectacular hotel in Budapest — Art Nouveau masterpiece with a legendary café. Pure opulence.' },
          { type: 'hostel', name: 'Pal\'s Hostel Budapest', price_per_night: 16, rating: 4.7, notes: 'Consistently rated one of Europe\'s best hostels. Legendary party atmosphere and rooftop terrace.' },
          { type: 'apartment', name: 'Jewish Quarter Design Apartment', price_per_night: 72, rating: 4.6, notes: 'Stylish flat in the heart of Budapest\'s ruin-bar district and Jewish heritage area.' },
        ],
      },
      {
        name: 'Budapest & Lake Balaton',
        description: 'City sophistication followed by Hungary\'s inland sea — wine, summer bathing and Central Europe\'s most relaxed coastline.',
        duration_days: 6,
        highlights: 'Buda Castle · Széchenyi Baths · Tihany Peninsula · Badacsony wine region · Keszthely Festetics Palace · Balaton sailing',
        transport: [
          { type: 'train', provider: 'MÁV Intercity', duration: '1 h 30 min – 2 h (Budapest → Balaton)', price_from: 8, notes: 'Frequent train services from Budapest Déli and Keleti stations to the northern and southern shores.' },
          { type: 'car', provider: 'Self-drive / Rental', duration: '1 h 20 min (Budapest → Siófok)', price_from: 35, notes: 'Best option for exploring all around the lake. M7 motorway to the south shore, M7/71 to the north.' },
          { type: 'ferry', provider: 'Balatoni Hajózási Zrt.', duration: '1 h 10 min (Siófok → Tihany)', price_from: 6, notes: 'Seasonal ferry service connecting the two shores and all major lake towns. Scenic way to explore.' },
        ],
        accommodation: [
          { type: 'hotel', name: 'Hotel Európa Fit Hévíz', price_per_night: 138, rating: 4.6, notes: 'Thermal spa hotel on Europe\'s largest thermal lake. Full wellness centre, private beach access.' },
          { type: 'guesthouse', name: 'Pension Tihany Fürdőtelep', price_per_night: 68, rating: 4.5, notes: 'Traditional Hungarian guesthouse on the Tihany Peninsula with vineyard views and excellent langos.' },
          { type: 'camping', name: 'Balatontourist Premium Camping Tihany', price_per_night: 28, rating: 4.3, notes: 'Well-equipped lakeside campsite with glamping pods available. Perfect for summer travellers.' },
        ],
      },
    ],
  },
  {
    country: 'Greece', city: 'Athens & the Islands', emoji: '🇬🇷',
    description: 'The cradle of Western civilisation — ancient temples, sapphire Aegean waters and legendary Mediterranean hospitality.',
    routes: [
      {
        name: 'Athens & Ancient Greece',
        description: 'Stand on the Acropolis and feel the weight of 2,500 years of history. Athens rewards the curious traveller richly.',
        duration_days: 4,
        highlights: 'Acropolis & Parthenon · Acropolis Museum · Ancient Agora · Plaka & Monastiraki · Temple of Poseidon at Sounion · Piraeus fish market',
        transport: [
          { type: 'flight', provider: 'Aegean Airlines / Ryanair', duration: '2–3 h', price_from: 49, notes: 'Athens Eleftherios Venizelos (ATH). Metro Line 3 direct to Syntagma in 40 min. No airport taxi hassle.' },
          { type: 'ferry', provider: 'ANEK / Grimaldi Lines', duration: '34 h (Venice → Piraeus)', price_from: 69, notes: 'Epic Adriatic crossing from Venice or Ancona. Cabin berths available for a true seafaring experience.' },
          { type: 'bus', provider: 'Flixbus (Athens via Thessaloniki)', duration: '9 h (Sofia → Athens)', price_from: 19, notes: 'Budget option from Sofia, Skopje or Thessaloniki into Kifissos terminal.' },
        ],
        accommodation: [
          { type: 'hotel', name: 'Hotel Grande Bretagne Athens', price_per_night: 345, rating: 4.9, notes: 'Athens grandest hotel directly facing Syntagma Square and the Parliament. Rooftop pool with Acropolis view.' },
          { type: 'hostel', name: 'Athens Backpackers', price_per_night: 22, rating: 4.5, notes: 'Legendary Makrygianni hostel with the best Acropolis rooftop views in Athens. Social and well-run.' },
          { type: 'apartment', name: 'Plaka Heritage Apartment', price_per_night: 95, rating: 4.6, notes: 'Traditional neoclassical apartment steps from the Roman Agora with private terrace.' },
        ],
      },
      {
        name: 'Athens & Santorini',
        description: 'The world\'s most photographed island caldera combined with the monuments of ancient Athens.',
        duration_days: 8,
        highlights: 'Acropolis · Oia sunset · Fira caldera · Amoudi Bay · Akrotiri archaeological site · Red & Black sand beaches · Athens Riviera',
        transport: [
          { type: 'flight', provider: 'Aegean Airlines Sky Express', duration: '45 min (Athens → Santorini)', price_from: 49, notes: 'Multiple daily flights from Athens Eleftherios Venizelos to Santorini (JTR). Book early for summer.' },
          { type: 'ferry', provider: 'SeaJets / Golden Star Ferries', duration: '4 h 40 min (Piraeus → Santorini)', price_from: 39, notes: 'High-speed catamaran from Athens Piraeus port. Scenic Cyclades island-hopping possible on the way.' },
          { type: 'ferry', provider: 'Blue Star Ferries (overnight)', duration: '8 h (Piraeus → Santorini)', price_from: 25, notes: 'Slower conventional ferry — take a cabin and wake up to the Santorini caldera. Very atmospheric.' },
        ],
        accommodation: [
          { type: 'hotel', name: 'Grace Hotel Santorini (Oia)', price_per_night: 480, rating: 4.9, notes: 'Iconic infinity-pool cliffside hotel with the best caldera views in Oia. World-class luxury.' },
          { type: 'guesthouse', name: 'Aroma Suites Fira', price_per_night: 165, rating: 4.7, notes: 'Traditional cave-house suites carved into the caldera cliff with private terraces and hot tubs.' },
          { type: 'apartment', name: 'Perissa Beach Studio', price_per_night: 75, rating: 4.4, notes: 'Simple but charming studio on the famous black sand beach, good base for the island\'s south.' },
        ],
      },
    ],
  },
  {
    country: 'Portugal', city: 'Lisbon & Porto', emoji: '🇵🇹',
    description: 'Pastel de nata, fado music, Moorish azulejos and the most affordable charm in Western Europe.',
    routes: [
      {
        name: 'Lisbon & Sintra',
        description: 'Ride the yellow trams through Alfama\'s narrow streets, then escape to Sintra\'s fairy-tale palaces in the mountains.',
        duration_days: 4,
        highlights: 'Belém Tower & Jerónimos Monastery · Alfama & São Jorge Castle · Sintra palaces (Pena, Monserrate) · LX Factory · Tram 28',
        transport: [
          { type: 'flight', provider: 'TAP / Ryanair / EasyJet', duration: '2–3 h', price_from: 39, notes: 'Lisbon Humberto Delgado Airport (LIS). Metro Red Line to Oriente in 25 min, Alameda in 30 min.' },
          { type: 'train', provider: 'Renfe Lusitania Night Train (Madrid → Lisbon)', duration: '10 h (overnight)', price_from: 45, notes: 'The great Iberian sleeper train — board in Madrid Chamartín, wake up in Lisbon Santa Apolónia.' },
          { type: 'bus', provider: 'Flixbus / ALSA', duration: '8 h (Seville) / 10 h (Madrid)', price_from: 15, notes: 'Comfortable international coaches from Seville and Madrid to Lisbon Sete Rios terminal.' },
        ],
        accommodation: [
          { type: 'hotel', name: 'Bairro Alto Hotel Lisbon', price_per_night: 245, rating: 4.8, notes: 'Boutique 5-star in a 18th-century palace above the Chiado. Rooftop terrace with castle views.' },
          { type: 'hostel', name: 'Home Lisbon Hostel', price_per_night: 20, rating: 4.7, notes: 'Lisbon\'s most celebrated family-run hostel. Legendary dinner table with port wine welcome. Very intimate.' },
          { type: 'apartment', name: 'Alfama Azulejo Apartment', price_per_night: 88, rating: 4.6, notes: 'Traditional tile-fronted apartment in Alfama with views over the Tagus. Hear fado at night.' },
        ],
      },
      {
        name: 'Lisbon to Porto — Portugal\'s Two Capitals',
        description: 'Two great cities connected by the Douro Valley wine country — the perfect Portuguese road trip.',
        duration_days: 7,
        highlights: 'Belém · Alfama · Sintra · Óbidos medieval village · Douro Valley wine estates · Ribeira · Dom Luís Bridge · Port wine cellars',
        transport: [
          { type: 'train', provider: 'Alfa Pendular / Intercidades (CP)', duration: '2 h 45 min (Lisbon → Porto)', price_from: 22, notes: 'Alfa Pendular high-speed tilting train — the most comfortable and reliable option. Book ahead.' },
          { type: 'car', provider: 'Self-drive / Rental', duration: '3 h 15 min (A1 motorway)', price_from: 35, notes: 'Best for the Douro Valley detour. Stop in Óbidos, Coimbra and Peso da Régua wine region.' },
          { type: 'bus', provider: 'Rede Expressos / Flixbus', duration: '3 h 30 min', price_from: 14, notes: 'Comfortable intercity coaches with onboard toilets and WiFi. Hourly from Lisbon Sete Rios.' },
        ],
        accommodation: [
          { type: 'hotel', name: 'The Yeatman Wine Hotel (Porto)', price_per_night: 295, rating: 4.9, notes: 'The world\'s best wine hotel perched above Vila Nova de Gaia with panoramic Douro views. Spectacular.' },
          { type: 'hostel', name: 'Gallery Hostel Porto', price_per_night: 22, rating: 4.8, notes: 'Art gallery by day, exceptional hostel by night. One of Europe\'s most beautiful hostel interiors.' },
          { type: 'apartment', name: 'Ribeira Porto Apartment', price_per_night: 95, rating: 4.6, notes: 'Characterful apartment above the UNESCO waterfront. Sunset views from the balcony over the Douro.' },
        ],
      },
    ],
  },
  {
    country: 'Switzerland', city: 'Zurich, Lucerne & Geneva', emoji: '🇨🇭',
    description: 'Pristine Alpine lakes, dramatic mountain scenery and some of the most efficient infrastructure on earth.',
    routes: [
      {
        name: 'Swiss Lakes & Cities',
        description: 'The essential Switzerland — urbane Zurich, medieval Lucerne and cosmopolitan Geneva in one sweep.',
        duration_days: 5,
        highlights: 'Old Town Zurich · Lake Zurich · Chapel Bridge Lucerne · Lion Monument · Rhine Falls · Lake Geneva · CERN visitor centre',
        transport: [
          { type: 'train', provider: 'SBB Swiss Federal Railways', duration: '3 h (Zurich → Geneva)', price_from: 52, notes: 'Swiss trains are legendary for punctuality and comfort. Eurail Pass or Swiss Travel Pass offer unlimited travel.' },
          { type: 'flight', provider: 'Swiss International / EasyJet', duration: '1–2 h', price_from: 69, notes: 'Zurich (ZRH) and Geneva (GVA) are both major hubs. Direct trains from both airports to city centres.' },
          { type: 'car', provider: 'Self-drive / Rental', duration: '3 h (Zurich → Geneva)', price_from: 60, notes: 'Vignette required (€40/year) for Swiss motorways. Scenic lakeside routes are slower but spectacular.' },
        ],
        accommodation: [
          { type: 'hotel', name: 'The Dolder Grand Zurich', price_per_night: 520, rating: 4.9, notes: 'Grand hilltop resort above Zurich with Alpine panoramas, spa and Michelin-starred restaurant.' },
          { type: 'hostel', name: 'Youth Hostel Zurich City', price_per_night: 42, rating: 4.3, notes: 'Swiss YHA quality in a modern building near Letzigrund. Clean, efficient, reliable — very Swiss.' },
          { type: 'apartment', name: 'Lucerne Lakeside Apartment', price_per_night: 165, rating: 4.7, notes: 'Modern apartment directly on Lake Lucerne with balcony views of Pilatus and Rigi mountains.' },
        ],
      },
      {
        name: 'Glacier Express — Swiss Alpine Circuit',
        description: 'One of the world\' great train journeys through 91 tunnels and 291 bridges across the heart of the Alps.',
        duration_days: 7,
        highlights: 'Glacier Express (St. Moritz → Zermatt) · Matterhorn · Jungfraujoch Top of Europe · Grindelwald · Interlaken · Rhine Gorge',
        transport: [
          { type: 'train', provider: 'Glacier Express (MGB / RhB)', duration: '7 h 45 min (St. Moritz → Zermatt)', price_from: 152, notes: 'The world\' slowest express train. Reservation required. Excellence Class adds gourmet dining. Book months ahead.' },
          { type: 'train', provider: 'Jungfrau Railways', duration: '2 h (Interlaken → Jungfraujoch)', price_from: 115, notes: 'The highest railway station in Europe at 3,454m. Clear days required — check weather forecast.' },
          { type: 'car', provider: 'Self-drive (Interlaken area)', duration: 'Variable', price_from: 55, notes: 'Cars cannot enter Zermatt (car-free village). Park in Täsch and take the Matterhorn Gotthard railway.' },
        ],
        accommodation: [
          { type: 'hotel', name: 'Hotel Mont Cervin Palace Zermatt', price_per_night: 380, rating: 4.8, notes: 'Grand Victorian hotel with Matterhorn views, ski-in access and legendary après-ski lounge.' },
          { type: 'guesthouse', name: 'Haus Alpina Grindelwald', price_per_night: 110, rating: 4.6, notes: 'Traditional Swiss chalet guesthouse with Eiger north face views. Cheese fondue dinner included.' },
          { type: 'camping', name: 'TCS Camping Interlaken', price_per_night: 35, rating: 4.4, notes: 'Premium campsite between the two Interlaken lakes. Glamping tents and cabins also available.' },
        ],
      },
    ],
  },
  {
    country: 'Croatia', city: 'Dubrovnik & Dalmatian Coast', emoji: '🇭🇷',
    description: 'Pearl of the Adriatic — Game of Thrones city walls, turquoise bays and over a thousand islands.',
    routes: [
      {
        name: 'Dalmatian Coast Road Trip',
        description: 'The ultimate Adriatic drive along one of Europe\' most spectacular coastlines.',
        duration_days: 7,
        highlights: 'Dubrovnik city walls · Hvar town · Split Diocletian\' Palace · Krka National Park waterfalls · Korčula island · Sunset at Lokrum',
        transport: [
          { type: 'flight', provider: 'Ryanair / Croatia Airlines', duration: '1–2 h 30 min', price_from: 39, notes: 'Dubrovnik (DBV) and Split (SPU) both have good international connections. Split is better for a road trip start.' },
          { type: 'ferry', provider: 'Jadrolinija / Krilo', duration: 'Split → Hvar 1 h / Split → Korčula 2 h 45 min', price_from: 12, notes: 'Essential for island hopping. Jadrolinija car ferries and Krilo high-speed passenger catamarans.' },
          { type: 'car', provider: 'Self-drive / Rental (Split based)', duration: 'Split → Dubrovnik 3 h (Magistrala coast road)', price_from: 40, notes: 'The Adriatic Highway (Magistrala) is one of Europe\' most scenic drives. Tolls payable in Croatia kuna/EUR.' },
        ],
        accommodation: [
          { type: 'hotel', name: 'Villa Dubrovnik', price_per_night: 310, rating: 4.9, notes: 'Clifftop boutique hotel with private beach ladder and panoramic Old Town views. Utterly romantic.' },
          { type: 'guesthouse', name: 'Guesthouse Hvar Riva', price_per_night: 90, rating: 4.5, notes: 'Family-run stone house steps from Hvar\' famous Riva promenade and harbour.' },
          { type: 'camping', name: 'Camping Kovačine Cres / Solaris Šibenik', price_per_night: 28, rating: 4.4, notes: 'Award-winning Adriatic campsites with private beach access, beach bars and glamping options.' },
        ],
      },
      {
        name: 'Zagreb & Plitvice Lakes',
        description: 'Croatia beyond the coast — the charming capital city and Europe\' most spectacular waterfall park.',
        duration_days: 5,
        highlights: 'Zagreb Upper Town & Dolac Market · Museum of Broken Relationships · Plitvice Lakes (UNESCO) · Rastoke watermills · Trakošćan Castle',
        transport: [
          { type: 'train', provider: 'ÖBB / HŽ EuroCity', duration: '6 h 30 min (Vienna → Zagreb)', price_from: 29, notes: 'Direct EuroCity overnight and daytime trains from Vienna, Salzburg and Munich.' },
          { type: 'bus', provider: 'Flixbus / Croatian carriers', duration: '2 h 30 min (Zagreb → Plitvice)', price_from: 9, notes: 'Plitvice Lakes has a dedicated bus line from Zagreb bus station. Multiple daily connections.' },
          { type: 'car', provider: 'Self-drive / Rental', duration: '2 h (Zagreb → Plitvice)', price_from: 35, notes: 'Best option for combining Plitvice, Rastoke and the Velebit nature park in your own time.' },
        ],
        accommodation: [
          { type: 'hotel', name: 'Esplanade Zagreb Hotel', price_per_night: 178, rating: 4.8, notes: 'Legendary 1925 Art Deco hotel originally built for the Orient Express passengers. Timeless elegance.' },
          { type: 'guesthouse', name: 'House Tina Plitvice', price_per_night: 62, rating: 4.6, notes: 'Friendly family guesthouse 500m from the national park entrance. Homemade breakfast with local honey.' },
          { type: 'apartment', name: 'Zagreb Gornji Grad Apartment', price_per_night: 75, rating: 4.5, notes: 'Character apartment in the medieval Upper Town, walking distance to all major sights.' },
        ],
      },
    ],
  },
  {
    country: 'Poland', city: 'Kraków & Warsaw', emoji: '🇵🇱',
    description: 'Royal palaces, hearty pierogi, a profound history and among the lowest prices in the EU.',
    routes: [
      {
        name: 'Kraków Royal City',
        description: 'Poland\'s most beautiful city — a perfectly preserved medieval centre that survived WWII intact.',
        duration_days: 3,
        highlights: 'Wawel Castle & Cathedral · Main Market Square · Kazimierz Jewish Quarter · Schindler\'s Factory Museum · Wieliczka Salt Mine · Nowa Huta',
        transport: [
          { type: 'flight', provider: 'Ryanair / Wizz Air / LOT', duration: '1 h 30 min – 2 h 30 min', price_from: 25, notes: 'Kraków John Paul II Airport (KRK). Bus 252 and night bus 902 to the Old Town in 45 min.' },
          { type: 'train', provider: 'PKP Intercity', duration: '2 h 30 min (Warsaw → Kraków)', price_from: 12, notes: 'Polish high-speed Pendolino service. Very affordable — standard class often under €15.' },
          { type: 'bus', provider: 'Flixbus / PolskiBus', duration: '7–12 h (from Central Europe)', price_from: 9, notes: 'Budget overnight options from Vienna, Budapest, Berlin and Prague to Kraków.' },
        ],
        accommodation: [
          { type: 'hotel', name: 'Hotel Stary Kraków', price_per_night: 175, rating: 4.8, notes: 'Boutique 5-star in a restored 15th-century patrician townhouse on the Main Market Square.' },
          { type: 'hostel', name: 'Greg & Tom Party Hostel', price_per_night: 12, rating: 4.5, notes: 'Infamous Kraków party hostel with free breakfast, pub crawls and legendary student atmosphere.' },
          { type: 'apartment', name: 'Kazimierz Studio Apartment', price_per_night: 48, rating: 4.6, notes: 'Stylish studio in the Jewish Quarter, surrounded by galleries, jazz bars and great restaurants.' },
        ],
      },
      {
        name: 'Poland Heritage — Kraków & Warsaw',
        description: 'Two great Polish cities: Kraków\' royal legacy and Warsaw\'s remarkable resurrection from total wartime destruction.',
        duration_days: 6,
        highlights: 'Wawel Castle · Wieliczka · Warsaw Old Town (UNESCO) · POLIN Museum · Palace of Culture · Łazienki Park · Chopin recitals',
        transport: [
          { type: 'train', provider: 'PKP Intercity Pendolino', duration: '2 h 19 min (Kraków → Warsaw)', price_from: 12, notes: 'The Pendolino high-speed train is the best value in Europe for the quality and price. Book ahead.' },
          { type: 'bus', provider: 'Flixbus / Polski Bus', duration: '2 h 45 min', price_from: 8, notes: 'Several daily services from Kraków Dworzec to Warsaw Zachodnia and Centrum.' },
          { type: 'car', provider: 'Self-drive A4/A1 motorway', duration: '2 h 45 min', price_from: 30, notes: 'A4 motorway to Łódź then A1 to Warsaw. Good option for visiting countryside en route.' },
        ],
        accommodation: [
          { type: 'hotel', name: 'Hotel Bristol Warsaw', price_per_night: 210, rating: 4.8, notes: 'Warsaw\'s grande dame hotel since 1901, on the Royal Way. Every Polish president has stayed here.' },
          { type: 'hostel', name: 'Oki Doki Hostel Warsaw', price_per_night: 13, rating: 4.7, notes: 'Repeatedly awarded best hostel in Poland. Artistically decorated, great communal spaces.' },
          { type: 'apartment', name: 'Powiśle Riverside Apartment Warsaw', price_per_night: 58, rating: 4.5, notes: 'Modern apartment in Warsaw\'s trendiest district, walking distance to the Old Town and Vistula.' },
        ],
      },
    ],
  },
  {
    country: 'Norway', city: 'Bergen & Norwegian Fjords', emoji: '🇳🇴',
    description: 'The world\'s most dramatic fjord landscapes, the Northern Lights and the warmest people in Scandinavia.',
    routes: [
      {
        name: 'Norwegian Fjords Classic',
        description: 'The Norway in a Nutshell route is one of the world\'s great journeys — fjords, mountain railways and a UNESCO waterway.',
        duration_days: 7,
        highlights: 'Bryggen Wharf Bergen (UNESCO) · Flåm Railway · Nærøyfjord (UNESCO) · Geirangerfjord · Preikestolen · Bergen fish market',
        transport: [
          { type: 'flight', provider: 'SAS / Norwegian / Ryanair', duration: '2–4 h', price_from: 79, notes: 'Bergen Airport Flesland (BGO). Airport express bus Flybussen to city centre in 30 min.' },
          { type: 'train', provider: 'Bergen Railway (NSB/Vy)', duration: '6 h 30 min (Oslo → Bergen)', price_from: 29, notes: 'One of Europe\'s most scenic rail journeys, crossing the Hardangervidda plateau at 1,237m altitude.' },
          { type: 'ferry', provider: 'Fjord Line / Color Line', duration: '14–20 h (Hirtshals, Denmark → Bergen)', price_from: 55, notes: 'Overnight crossing from Denmark with cabin. Spectacular fjord arrival into Bergen.' },
        ],
        accommodation: [
          { type: 'hotel', name: 'Fretheim Hotel Flåm', price_per_night: 210, rating: 4.8, notes: 'Historic 1870s hotel at the head of the Sognefjord. Fjord-view rooms, excellent Norwegian cuisine.' },
          { type: 'hostel', name: 'Montana Youth Hostel Bergen', price_per_night: 38, rating: 4.4, notes: 'Beautifully located hostel on the Ulriken hillside, 20 min from Bergen centre by cable car.' },
          { type: 'guesthouse', name: 'Ålesund Fjord Pension', price_per_night: 95, rating: 4.5, notes: 'Art Nouveau guesthouse on the island city of Ålesund. Exceptional breakfast with local fish.' },
        ],
      },
      {
        name: 'Oslo: Viking Heritage & Modern Nordic Life',
        description: 'Norway\'s dynamic capital — Viking ships, Munch\'s Scream, world-class food and a striking new waterfront.',
        duration_days: 4,
        highlights: 'Viking Ship Museum · Munch Museum · Vigeland Sculpture Park · Akershus Fortress · Aker Brygge · Holmenkollen · Opera House rooftop',
        transport: [
          { type: 'flight', provider: 'SAS / Norwegian / Wizz Air', duration: '2–3 h', price_from: 49, notes: 'Oslo Gardermoen Airport (OSL). Airport Express Train (Flytoget) to Oslo Central in 22 min.' },
          { type: 'train', provider: 'NSB/Vy + Stena Line ferry combo', duration: '7 h (Copenhagen → Oslo)', price_from: 45, notes: 'Take the regional train from Copenhagen to Gothenburg, then Vy train north to Oslo, or the Kiel overnight ferry.' },
          { type: 'car', provider: 'Self-drive (Copenhagen → Oslo)', duration: '7 h 30 min', price_from: 90, notes: 'Drive through Sweden via Malmö and Gothenburg. Spectacular forested Swedish interior. Toll roads in Norway.' },
        ],
        accommodation: [
          { type: 'hotel', name: 'The Thief Oslo', price_per_night: 295, rating: 4.8, notes: 'Design hotel on Tjuvholmen island with a private beach, art collection and spectacular fjord views.' },
          { type: 'hostel', name: 'Anker Hostel Oslo', price_per_night: 35, rating: 4.3, notes: 'Large, well-run hostel near Grünerløkka — Oslo\'s hippest neighbourhood. Clean, central, affordable.' },
          { type: 'apartment', name: 'Grünerløkka Design Apartment', price_per_night: 125, rating: 4.6, notes: 'Stylish apartment in Oslo\'s bohemian east side, surrounded by coffee shops and vintage stores.' },
        ],
      },
    ],
  },
  {
    country: 'Iceland', city: 'Reykjavik & Ring Road', emoji: '🇮🇸',
    description: 'Fire, ice, geysers and Northern Lights — the most otherworldly landscape on European soil.',
    routes: [
      {
        name: 'Golden Circle & South Coast',
        description: 'Iceland\'s classic itinerary: dramatic geysers, Europe\'s most powerful waterfall and black sand beaches.',
        duration_days: 5,
        highlights: 'Geysir & Strokkur · Gullfoss waterfall · Þingvellir (UNESCO) · Seljalandsfoss & Skógafoss · Reynisfjara black beach · Jökulsárlón glacier lagoon',
        transport: [
          { type: 'flight', provider: 'Icelandair / WOW / EasyJet', duration: '3 h (London) / 3 h (Copenhagen)', price_from: 89, notes: 'Keflavík International Airport (KEF) — 45 min from Reykjavik by Flybus or rental car. Book in advance.' },
          { type: 'car', provider: 'Self-drive / 4WD Rental', duration: 'Golden Circle: 6 h loop from Reykjavik', price_from: 65, notes: 'Essential for South Coast. Only summer (Jun–Sep) for F-roads (Highland routes). A 4WD opens up all options.' },
          { type: 'bus', provider: 'Reykjavik Excursions / Gray Line', duration: '8–10 h (Golden Circle full day)', price_from: 49, notes: 'Guided bus tours from Reykjavik BSI terminal. Convenient but less flexible than self-drive.' },
        ],
        accommodation: [
          { type: 'hotel', name: 'Ion Adventure Hotel Þingvellir', price_per_night: 320, rating: 4.8, notes: 'Award-winning eco-design hotel on a lava field with panoramic geothermal landscape views and Northern Lights terrace.' },
          { type: 'guesthouse', name: 'Guesthouse Skógar Waterfalls', price_per_night: 125, rating: 4.6, notes: 'Family guesthouse at the foot of Skógafoss. Wake up to the waterfall from your bedroom window.' },
          { type: 'camping', name: 'Campsite Reykjavik & Þórsmörk', price_per_night: 22, rating: 4.3, notes: 'Year-round camping at Reykjavik Laugardalur; summer-only glamping at Þórsmörk valley.' },
        ],
      },
      {
        name: 'Ring Road — Full Iceland Circuit',
        description: 'The ultimate road trip: the entire 1,332 km circumnavigation of Iceland in 10 unforgettable days.',
        duration_days: 10,
        highlights: 'Golden Circle · Vatnajökull glacier · Dettifoss waterfall · Lake Mývatn · Akureyri · Snaefellsnes Peninsula · Westfjords · Northern Lights (Oct–Mar)',
        transport: [
          { type: 'car', provider: 'Self-drive 4WD / Campervan', duration: '1,332 km total (Ring Road)', price_from: 95, notes: 'A 4WD campervan is the ideal Ring Road vehicle. Check for F-road access. Fuel expensive — budget €40/day.' },
          { type: 'car', provider: 'Rental Car (Dacia Duster / Suzuki Jimny)', duration: '1,332 km total', price_from: 65, notes: 'Entry-level 4WD fine for the Ring Road itself (Route 1). Pre-book months ahead for summer availability.' },
          { type: 'bus', provider: 'Strætó / Iceland On Your Own bus pass', duration: 'Variable — 2 h between major stops', price_from: 79, notes: 'Bus passport system connects Ring Road towns Jun–Sep. Freedom without the driving — ideal for solo travellers.' },
        ],
        accommodation: [
          { type: 'camping', name: 'Iceland Ring Road Campsites (Héraðsskógar, Möðrudalur, etc.)', price_per_night: 20, rating: 4.5, notes: 'Iceland\'s network of 170+ campsites makes Ring Road camping easy. Camping Card pays for itself in 10 nights.' },
          { type: 'guesthouse', name: 'Guesthouses along the Ring Road (Mývatn, Höfn, etc.)', price_per_night: 145, rating: 4.6, notes: 'Comfortable guesthouses every 100–150 km. Book months in advance for summer. Often include breakfast.' },
          { type: 'hotel', name: 'Hotel Rangá & Fosshotel Glacier Lagoon', price_per_night: 280, rating: 4.8, notes: 'Two iconic Ring Road hotel stops. Rangá has an observatory; Fossil overlooks Jökulsárlón lagoon.' },
        ],
      },
    ],
  },
]

export async function seedDb() {
  const db = getDb()

  // Skip if already seeded
  const { rows } = await db.query('SELECT COUNT(*) FROM destinations')
  if (parseInt(rows[0].count, 10) > 0) return

  for (const dest of DESTINATIONS) {
    const { rows: [d] } = await db.query(
      'INSERT INTO destinations (country, city, emoji, description) VALUES ($1, $2, $3, $4) RETURNING id',
      [dest.country, dest.city, dest.emoji, dest.description]
    )

    for (const route of dest.routes) {
      const { rows: [r] } = await db.query(
        'INSERT INTO routes (destination_id, name, description, duration_days, highlights) VALUES ($1,$2,$3,$4,$5) RETURNING id',
        [d.id, route.name, route.description, route.duration_days, route.highlights]
      )

      for (const t of route.transport) {
        await db.query(
          'INSERT INTO transport_options (route_id, type, provider, duration, price_from, notes) VALUES ($1,$2,$3,$4,$5,$6)',
          [r.id, t.type, t.provider, t.duration, t.price_from, t.notes]
        )
      }

      for (const a of route.accommodation) {
        await db.query(
          'INSERT INTO accommodation_options (route_id, type, name, price_per_night, rating, notes) VALUES ($1,$2,$3,$4,$5,$6)',
          [r.id, a.type, a.name, a.price_per_night, a.rating, a.notes]
        )
      }
    }
  }

  console.log('[seed] ✓ 15 European destinations seeded successfully')
}
