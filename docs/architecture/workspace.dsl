workspace "TravelManager" "Cloud Application Development – HTWG Konstanz | Milestone 2" {

    model {
        # ─── People ───────────────────────────────────────────────────────────
        traveler       = person "Traveler"            "End user. Plans, manages and shares trips. Receives travel alerts and personalized feed."
        destinationMgr = person "Destination Manager" "B2B partner. Manages destination services and accesses aggregated traveler marketing data."

        # ─── External Systems ─────────────────────────────────────────────────
        firebase    = softwareSystem "Firebase"              "Google identity platform." "External System" {
            firebaseAuth = container "Firebase Auth" "Email/password and Google OAuth. Issues signed JWT tokens." "Firebase Service"
        }
        warningsApi = softwareSystem "Travel Warnings API"   "Official government travel warning feeds (e.g. Auswärtiges Amt, FCDO)." "External System"
        weatherApi  = softwareSystem "Weather API"           "Third-party weather data provider (e.g. OpenWeatherMap)." "External System"
        sendGrid    = softwareSystem "SendGrid"              "Transactional email delivery." "External System"

        # ─── TravelManager SaaS Platform ──────────────────────────────────────
        travelManager = softwareSystem "TravelManager" "Microservice SaaS platform. Plans: Free / Standard / Enterprise. Follows 12-Factor principles. Deployed on GKE via Terraform." {

            # ── API Gateway ──────────────────────────────────────────────────
            apiGateway = container "API Gateway" "Single entry point for all clients. Validates Firebase JWT, enforces SaaS plan rate limits, routes to downstream services." "Kong / Cloud Endpoints" "Server"

            # ── Frontend SPA ─────────────────────────────────────────────────
            spaFrontend = container "Frontend SPA" "Nuxt 3 single-page application. All API traffic routed through the API Gateway." "Nuxt 3 / Vue 3" "Web Browser" {
                spaTripPages    = component "Trip Pages"      "Create, list, view and edit trips (/trips, /trips/[id])." "Nuxt Page"
                spaFeedPage     = component "Feed Page"       "Personalized live feed (/feed)." "Nuxt Page"
                spaExplorePage  = component "Explore Page"    "3D globe + destination details (/explore)." "Nuxt Page"
                spaPlanPage     = component "Plan Pages"      "Itinerary builder with travel info overlay (/plan, /plan-view)." "Nuxt Page"
                spaAlertBanner  = component "Alert Banner"    "Displays active travel warnings and weather alerts for user's trips." "Nuxt Component"
                spaCommunity    = component "Community Page"  "Browse all public trips (/community)." "Nuxt Page"
                spaProfile      = component "Profile Page"    "User profile management (/profile)." "Nuxt Page"
            }

            # ── User Service ─────────────────────────────────────────────────
            userService = container "User Service" "Manages user accounts and profiles. Upserts users on first Firebase login." "Node.js / Nitro" "Server" {
                userController = component "User Controller" "POST /users (upsert), GET /users/me, GET /users/:id, PUT /users/:id." "Route Handler"
                userRepo       = component "User Repository" "Read/write user rows in User DB." "Repository"
                authVerifier   = component "Auth Verifier"  "Shared Firebase Admin SDK middleware – verifies JWT on every request." "Middleware"
            }

            # ── Trip Service ─────────────────────────────────────────────────
            tripService = container "Trip Service" "Core trip management: trips, plan locations, travel plans, reviews and likes." "Node.js / Nitro" "Server" {
                tripController      = component "Trip Controller"      "CRUD /trips, /trips/:id, GET /trips/all (public)." "Route Handler"
                locationController  = component "Location Controller"  "CRUD /locations/trip/:tripId, /locations/:id." "Route Handler"
                reviewController    = component "Review Controller"    "POST/GET/DELETE /reviews/trip/:tripId." "Route Handler"
                likesController     = component "Likes Controller"     "POST/DELETE/GET /likes/trip/:tripId." "Route Handler"
                planController      = component "Plan Controller"      "CRUD /travel-plans/:tripId." "Route Handler"
                tripEventPublisher  = component "Event Publisher"      "Publishes TripCreated / TripUpdated events to Pub/Sub after writes." "Pub/Sub Publisher"
            }

            # ── Destination Service ───────────────────────────────────────────
            destinationService = container "Destination Service" "Manages destinations, routes, transport and accommodation options. Provides B2B data access for destination partners." "Node.js / Nitro" "Server" {
                destController  = component "Destination Controller" "GET /destinations, GET /destinations/:id/routes." "Route Handler"
                optionsController = component "Options Controller"   "GET /destinations/:id/transport, /accommodation." "Route Handler"
                b2bController   = component "B2B Controller"        "GET /b2b/destinations/:id/travelers – aggregated marketing data for partners." "Route Handler"
                destRepo        = component "Destination Repository" "Reads destination data from Destination DB." "Repository"
            }

            # ── Social Service (async) ────────────────────────────────────────
            socialService = container "Social Service" "Builds personalized live feeds and newsletters by consuming trip events asynchronously. Handles large datasets via background workers." "Node.js / Worker" "Async Worker" {
                feedConsumer   = component "Feed Consumer"   "Subscribes to TripCreated/Updated events. Scores relevance per follower." "Pub/Sub Subscriber"
                feedBuilder    = component "Feed Builder"    "Assembles and stores personalized feed entries in Social DB." "Worker"
                feedApi        = component "Feed API"        "GET /feed – returns pre-computed feed for authenticated user." "Route Handler"
                newsletterJob  = component "Newsletter Job"  "Scheduled CronJob: aggregates weekly highlights, publishes NewsletterReady event." "CronJob"
            }

            # ── Travel Info Service (async) ───────────────────────────────────
            travelInfoService = container "Travel Info Service" "Scheduled service: polls travel warnings and weather data, diffs against active trip plans, notifies affected travelers." "Node.js / Worker" "Async Worker" {
                warningPoller  = component "Warning Poller"  "CronJob: fetches official travel warnings from external API." "CronJob"
                weatherPoller  = component "Weather Poller"  "CronJob: fetches weather forecasts for all destination cities." "CronJob"
                diffEngine     = component "Diff Engine"     "Compares new warning/weather data with active travel plans. Identifies affected users." "Business Logic"
                alertPublisher = component "Alert Publisher" "Publishes TravelAlert events to Pub/Sub." "Pub/Sub Publisher"
            }

            # ── Notification Service (async) ──────────────────────────────────
            notificationService = container "Notification Service" "Consumes events from Pub/Sub and delivers email and push notifications to travelers." "Node.js / Worker" "Async Worker" {
                alertConsumer      = component "Alert Consumer"      "Subscribes to TravelAlert events." "Pub/Sub Subscriber"
                newsletterConsumer = component "Newsletter Consumer" "Subscribes to NewsletterReady events." "Pub/Sub Subscriber"
                emailSender        = component "Email Sender"        "Sends transactional emails via SendGrid." "Notification Channel"
                pushSender         = component "Push Sender"         "Delivers browser Web Push notifications." "Notification Channel"
            }

            # ── Databases (one per service – 12-Factor) ───────────────────────
            userDB       = container "User DB"        "User profiles."                               "PostgreSQL 16" "Database"
            tripDB       = container "Trip DB"        "Trips, locations, plans, reviews, likes."     "PostgreSQL 16" "Database"
            destDB       = container "Destination DB" "Destinations, routes, transport, accomm."     "PostgreSQL 16" "Database"
            socialDB     = container "Social DB"      "Feed entries, follow graph, newsletter log."  "PostgreSQL 16" "Database"
            travelInfoDB = container "Travel Info DB" "Cached warnings, weather snapshots, alert log." "PostgreSQL 16" "Database"

            # ── Async backbone ────────────────────────────────────────────────
            messageBus = container "Message Bus" "Pub/Sub topics: TripCreated, TripUpdated, TravelAlert, NewsletterReady." "GCP Pub/Sub" "Queue"

            # ── GKE & Infrastructure ──────────────────────────────────────────
            gkeCluster   = container "GKE Cluster"        "Kubernetes cluster. All services deployed as Deployments with HPA. CronJobs for scheduled workers. Provisioned via Terraform." "Google Kubernetes Engine" "Server"
            artifactReg  = container "Artifact Registry"  "Stores Docker images for all services. Referenced by GKE workloads." "GCP Service"
            secretMgr    = container "Secret Manager"     "Stores DB connection strings, Firebase config and API keys per service. Mounted as K8s Secrets via ESO." "GCP Service"
            cloudSQLProxy = container "Cloud SQL"         "Managed PostgreSQL 16 – one instance per service database. Connected via Cloud SQL Auth Proxy sidecar." "GCP / PostgreSQL 16" "Database"
        }

        # ─── Relationships ─────────────────────────────────────────────────────

        # Clients → System
        traveler       -> spaFrontend  "Uses web app"                       "HTTPS"
        destinationMgr -> apiGateway   "Accesses B2B data API"              "HTTPS / JSON"

        # Frontend → Gateway → Services
        spaFrontend        -> apiGateway          "All API calls with Bearer token"              "HTTPS / JSON"
        apiGateway         -> firebaseAuth        "Validate JWT token"                           "Firebase Admin SDK"
        apiGateway         -> userService         "Route /users/*"                               "HTTPS / JSON"
        apiGateway         -> tripService         "Route /trips/*, /locations/*, /reviews/*, /likes/*, /travel-plans/*" "HTTPS / JSON"
        apiGateway         -> destinationService  "Route /destinations/*, /b2b/*"                "HTTPS / JSON"
        apiGateway         -> socialService       "Route /feed"                                  "HTTPS / JSON"
        apiGateway         -> travelInfoService   "Route /alerts"                                "HTTPS / JSON"

        # Service → own DB
        userService        -> userDB              "Read/write"                                   "node-postgres"
        tripService        -> tripDB              "Read/write"                                   "node-postgres"
        destinationService -> destDB              "Read/write"                                   "node-postgres"
        socialService      -> socialDB            "Read/write"                                   "node-postgres"
        travelInfoService  -> travelInfoDB        "Read/write"                                   "node-postgres"

        # Service → Firebase
        userService        -> firebaseAuth        "Upsert user on first login"                   "Firebase Admin SDK"

        # Async event flows
        tripService        -> messageBus          "Publish TripCreated / TripUpdated"            "GCP Pub/Sub"
        socialService      -> messageBus          "Subscribe TripCreated / TripUpdated"          "GCP Pub/Sub"
        socialService      -> messageBus          "Publish NewsletterReady"                      "GCP Pub/Sub"
        travelInfoService  -> messageBus          "Publish TravelAlert"                          "GCP Pub/Sub"
        notificationService -> messageBus         "Subscribe TravelAlert, NewsletterReady"       "GCP Pub/Sub"

        # Travel Info → External
        travelInfoService  -> warningsApi         "Poll travel warnings (scheduled)"             "HTTPS / REST"
        travelInfoService  -> weatherApi          "Poll weather forecasts (scheduled)"           "HTTPS / REST"
        travelInfoService  -> tripService         "GET active travel plans for diff"             "HTTPS / JSON"

        # Notification → External & User
        notificationService -> sendGrid           "Send transactional emails"                    "HTTPS / SMTP"
        notificationService -> traveler           "Push notification / email"                    "Web Push / Email"

        # Infrastructure
        gkeCluster -> apiGateway          "Runs as Deployment + LoadBalancer"    "Kubernetes"
        gkeCluster -> userService         "Runs as Deployment + HPA"             "Kubernetes"
        gkeCluster -> tripService         "Runs as Deployment + HPA"             "Kubernetes"
        gkeCluster -> destinationService  "Runs as Deployment + HPA"             "Kubernetes"
        gkeCluster -> socialService       "Runs as Deployment + HPA"             "Kubernetes"
        gkeCluster -> travelInfoService   "Runs as CronJob + Worker Deployment"  "Kubernetes"
        gkeCluster -> notificationService "Runs as Deployment"                   "Kubernetes"
        gkeCluster -> cloudSQLProxy       "Cloud SQL Auth Proxy sidecar"         "Private IP / IAM"
        secretMgr  -> gkeCluster          "Secrets mounted via ESO"              "Kubernetes / GCP"
    }

    views {
        # ── Level 1: System Context ────────────────────────────────────────────
        systemContext travelManager "SystemContext" {
            include *
            autoLayout
            title "Level 1 – System Context"
            description "TravelManager SaaS: end users, B2B destination managers and external dependencies."
        }

        # ── Level 2: Containers (all microservices) ────────────────────────────
        container travelManager "Containers" {
            # Clients
            include traveler
            include destinationMgr

            # Entry point
            include apiGateway
            include spaFrontend

            # Synchronous microservices
            include userService
            include tripService
            include destinationService

            # Async microservices
            include socialService
            include travelInfoService
            include notificationService

            # Async backbone
            include messageBus

            # Databases (one per service)
            include userDB
            include tripDB
            include destDB
            include socialDB
            include travelInfoDB

            # External systems
            include firebase
            include warningsApi
            include weatherApi
            include sendGrid

            # GKE / infra omitted here – see deployment view
            exclude gkeCluster
            exclude artifactReg
            exclude secretMgr
            exclude cloudSQLProxy

            autoLayout lr
            title "Level 2 – Containers (Microservices)"
            description "Runtime architecture: 6 microservices on GKE, each with its own DB, connected via Pub/Sub. GKE/Terraform infrastructure omitted for clarity."
        }

        # ── Level 2: Deployment / Infrastructure ──────────────────────────────
        container travelManager "Infrastructure" {
            include gkeCluster
            include artifactReg
            include secretMgr
            include cloudSQLProxy
            include userService
            include tripService
            include destinationService
            include socialService
            include travelInfoService
            include notificationService
            include apiGateway
            autoLayout lr
            title "Level 2 – Deployment Infrastructure (GKE + Terraform)"
            description "How all services are hosted on GKE. Terraform provisions the cluster, Cloud SQL instances, Artifact Registry and Secret Manager."
        }

        # ── Level 3: Frontend SPA ──────────────────────────────────────────────
        component spaFrontend "ComponentsFrontend" {
            include *
            autoLayout
            title "Level 3 – Frontend SPA Components"
            description "Nuxt 3 pages and components running in the browser."
        }

        # ── Level 3: User Service ──────────────────────────────────────────────
        component userService "ComponentsUserService" {
            include *
            autoLayout
            title "Level 3 – User Service"
            description "Profile management and Firebase Auth integration."
        }

        # ── Level 3: Trip Service ──────────────────────────────────────────────
        component tripService "ComponentsTripService" {
            include *
            autoLayout
            title "Level 3 – Trip Service"
            description "Core trip, location, review, likes and travel plan management. Publishes domain events."
        }

        # ── Level 3: Destination Service ──────────────────────────────────────
        component destinationService "ComponentsDestinationService" {
            include *
            autoLayout
            title "Level 3 – Destination Service"
            description "Destination data and B2B partner data access."
        }

        # ── Level 3: Social Service ────────────────────────────────────────────
        component socialService "ComponentsSocialService" {
            include *
            autoLayout
            title "Level 3 – Social Service (async)"
            description "Async worker: personalized live feed and newsletter from Pub/Sub events."
        }

        # ── Level 3: Travel Info Service ──────────────────────────────────────
        component travelInfoService "ComponentsTravelInfoService" {
            include *
            autoLayout
            title "Level 3 – Travel Info Service (async)"
            description "Scheduled poller: diffs warnings/weather against trip plans, publishes alerts."
        }

        # ── Level 3: Notification Service ─────────────────────────────────────
        component notificationService "ComponentsNotificationService" {
            include *
            autoLayout
            title "Level 3 – Notification Service (async)"
            description "Async consumer: delivers email and push notifications."
        }

        # ── Styles ─────────────────────────────────────────────────────────────
        styles {
            element "Person" {
                shape Person
                background #08427B
                color #ffffff
            }
            element "Software System" {
                background #1168BD
                color #ffffff
            }
            element "External System" {
                background #6B6B6B
                color #ffffff
            }
            element "Container" {
                background #438DD5
                color #ffffff
            }
            element "Component" {
                background #85BBF0
                color #000000
            }
            element "Web Browser" {
                shape WebBrowser
            }
            element "Database" {
                shape Cylinder
                background #1B5E20
                color #ffffff
            }
            element "Queue" {
                shape Pipe
                background #E65100
                color #ffffff
            }
            element "Server" {
                shape RoundedBox
            }
            element "Async Worker" {
                shape Hexagon
                background #2E7D32
                color #ffffff
            }
            element "Firebase Service" {
                background #F57C00
                color #ffffff
            }
            element "GCP Service" {
                background #1A73E8
                color #ffffff
            }
        }
    }
}
